import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { TmpJwtGuard } from './guard/tmp-jwt.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SignalPayload } from './dto/signal-payload';
import { StreamFacade } from '../../../domain/stream/stream.facade';

/**
 * StreamsGateway
 * - namespace '/rtc' 로 WebSocket 연결을 받음
 * - TmpJwtGuard 로 테스트용 유저 정보를 client.data.user 에 심어둠
 * - 이후 메시지(offer/answer/ice) 전달과 룸(join/leave) 관리를 담당
 */
@UseGuards(TmpJwtGuard)
@WebSocketGateway({
  namespace: 'streams',
  cors: {
    origin: ['http://localhost:8082', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class StreamsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly streamFacade: StreamFacade) {}
  private readonly logger = new Logger(StreamsGateway.name);

  /**
   * handleConnection
   * - WebSocket 클라이언트가 connect() 호출해서 연결될 때 자동 실행
   * - 여기선 인증(Guard) 후에 client.data.user 에 심어진 userId 로
   *   “누가 접속했는지” 로그를 남김
   */
  handleConnection(client: Socket): void {
    this.logger.log(
      `🟢 Client connected: socketId=${client.id}, userId=${client.data.user.userId}`,
    );
  }

  /**
   * handleDisconnect
   * - WebSocket 연결이 끊어질 때 실행
   * - leave 이벤트를 따로 받지 않아도, 클라이언트가 disconnect 하면
   *   여기서 로그 남기고 필요한 방 클린업을 수행 가능
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(
      `🟣 Client disconnected: socketId=${client.id}, userId=${client.data.user.userId}`,
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
    @MessageBody('streamId') streamId: number,
  ): Promise<void> {
    // 스트림 존재 여부 확인
    await this.streamFacade.findStreamById(streamId);
    const room = `stream-${streamId}`;
    client.join(room);
    this.logger.log(`User ${client.data.user.userId} joined room ${room}`);
    client.emit('joined', { streamId });
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
