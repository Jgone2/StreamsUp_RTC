import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SignalPayload } from './dto/signal-payload';
import { StreamFacade } from '../../../domain/stream/stream.facade';
import { WsJwtGuard } from '../../auth/guard/ws-jwt.guard';

const AUTH_URL = process.env.AUTH_SERVER_URL;
const FRONT_URL = process.env.FRONT_URL;
/**
 * StreamsGateway
 * - namespace '/rtc' 로 WebSocket 연결을 받음
 * - TmpJwtGuard 로 테스트용 유저 정보를 client.data.user 에 심어둠
 * - 이후 메시지(offer/answer/ice) 전달과 룸(join/leave) 관리를 담당
 */
@UseGuards(WsJwtGuard)
@WebSocketGateway({
  namespace: 'streams',
  path: '/api/socket.io',
  cors: {
    origin: [AUTH_URL, FRONT_URL],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class StreamsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly streamFacade: StreamFacade) {}
  @WebSocketServer() private readonly server: Server;
  private readonly logger = new Logger(StreamsGateway.name);

  /**
   * handleConnection
   * - WebSocket 클라이언트가 connect() 호출해서 연결될 때 자동 실행
   * - Guards 실행 전 단계이므로 client.data.user가 비어있을 수 있다.
   * - 실질적인 인증/권한 확인은 각 이벤트(@SubscribeMessage) 단계의 WsJwtGuard가 담당한다.
   */
  handleConnection(client: Socket): void {
    // 아직 Guards 가 실행되기 전 단계이므로 client.data.user 가 비어있을 수 있다.
    this.logger.log(
      `✅ Client connected: socketId=${client.data}, ip=${client.handshake.address}`,
    );
    // 실질적인 인증/권한 확인은 각 이벤트(@SubscribeMessage) 단계의 WsJwtGuard 가 담당한다.
    this.logger.log(`🟢 Client connected: socketId=${client.id}`);
  }

  /**
   * handleDisconnect
   * - WebSocket 연결이 끊어질 때 실행
   * - leave 이벤트를 따로 받지 않아도, 클라이언트가 disconnect 하면
   *   여기서 로그 남기고 필요한 방 클린업을 수행 가능
   */
  handleDisconnect(client: Socket): void {
    const userId = client.data?.user?.userId ?? 'unknown';
    this.logger.log(
      `🟣 Client disconnected: socketId=${client.id}, userId=${userId}`,
    );
    // 예: client.rooms.forEach(room => client.leave(room));
  }

  /**
   * @SubscribeMessage('join')
   * - 클라이언트가 특정 스트림 방에 참여(join) 요청을 보낼 때 실행
   * - streamId 를 바디로 받고, “stream-<id>” 룸에 client 를 join 시킴
   * - 이로써 같은 streamId 를 가진 다른 피어들에게 시그널링 메시지를 보낼 수 있음
   */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody('streamId') streamId: string | number,
  ): Promise<void> {
    const id = Number(streamId);
    if (Number.isNaN(id)) {
      this.logger.warn(
        `🔴 Invalid streamId received: "${streamId}" from socketId=${client.id}`,
      );
      client.disconnect(true);
      return;
    }
    this.logger.debug(`Parsed streamId: ${id} (original: ${streamId})`);
    // 스트림 존재 여부 확인
    await this.streamFacade.findStreamById(id);
    const room = `stream-${id}`;
    if (!client.data?.user) {
      this.logger.warn(
        `🔴 Unauthorized join attempt: socketId=${client.id}, streamId=${id}`,
      );
      client.disconnect(true);
      return;
    }
    client.join(room);
    this.logger.log(`User ${client.data.user.userId} joined room ${room}`);
    client.emit('joined', { streamId: id });

    // 방에 있는 모든(=스트리머 포함) 소켓에게 뷰어 입장 신호
    this.server.to(room).emit('viewer-joined', {
      streamId: id,
      viewerId: client.data.user.userId,
    });
  }

  /**
   * @SubscribeMessage('leave')
   * - 클라이언트가 스트림 방에서 나가고 싶을 때 실행
   * - streamId 룸에서 client 를 leave 시킴
   * - 이후 해당 룸으로 보내는 메시지를 받지 않음
   */
  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody('streamId') streamId: number,
  ): void {
    const room = `stream-${streamId}`;
    client.leave(room);
    this.logger.log(`User ${client.data.user.userId} left room ${room}`);
    client.emit('left', { streamId });
  }

  /**
   * @SubscribeMessage('offer')
   * - WebRTC 방송 시작 시, 피어 간의 SDP offer를 중개
   * - 호스트(또는 피어 A) 가 생성한 SDP offer 객체를 같은 룸의 다른 피어들에게 전달
   * - payload.sdp 에는 오디오/비디오 코덱·코덱 설정 등 세션 설명 정보가 담겨 있음
   */
  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SignalPayload,
  ): void {
    const room = `stream-${data.streamId}`;
    client.to(room).emit('offer', {
      from: client.data.user.userId,
      sdp: data.sdp,
    });
  }

  /**
   * @SubscribeMessage('answer')
   * - SDP offer에 대한 응답으로, 피어 B가 생성한 SDP answer를 전달
   * - 호스트(또는 피어 A) 입장에서는 handleOffer가, 피어 B 입장에서는 handleAnswer가 서로 교환됨
   */
  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SignalPayload,
  ): void {
    const room = `stream-${data.streamId}`;
    client.to(room).emit('answer', {
      from: client.data.user.userId,
      sdp: data.sdp,
    });
  }

  /**
   * @SubscribeMessage('ice')
   * - ICE 후보(Candidate)를 주고받아 NAT/방화벽을 뚫는 데 필요한 경로 정보를 교환
   * - 데이터 구조 data.candidate 에 IP/port 조합 등 네트워크 경로 후보가 담김
   * - 피어 간 최적의 연결을 위해 candidate들을 모두 교환해야 함
   */
  @SubscribeMessage('ice')
  handleIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SignalPayload,
  ): void {
    const room = `stream-${data.streamId}`;
    client.to(room).emit('ice', {
      from: client.data.user.userId,
      candidate: data.candidate,
    });
  }
}
