import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SignalPayload } from './dto/signal-payload';
import { StreamFacade } from '../../../domain/stream/stream.facade';
import { WsJwtGuard } from '../../auth/guard/ws-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { Counter } from 'prom-client';

const AUTH_URL = process.env.AUTH_SERVER_URL;
const FRONT_URL = process.env.FRONT_URL;

const wsConnects = new Counter({
  name: 'ws_connections_total',
  help: 'Total websocket connections',
});

const chatMessages = new Counter({
  name: 'chat_messages_total',
  help: 'Total chat messages received',
});
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
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    private readonly streamFacade: StreamFacade,
    private readonly config: ConfigService,
  ) {
    // WebSocket 연결 수 카운터 초기화
    wsConnects.reset();
    chatMessages.reset();
    wsConnects.inc(0); // 초기값 설정
    chatMessages.inc(0); // 초기값 설정
  }

  // WebSocket 서버 인스턴스
  @WebSocketServer() private readonly server: Server;
  // Redis pub/sub 클라이언트
  private pubClient;
  private subClient;
  private readonly logger = new Logger(StreamsGateway.name);

  /**
   * afterInit
   * - WebSocket 서버 초기화 후 실행
   * - Redis pub/sub 클라이언트를 생성하고 연결
   */
  async afterInit(server: Server): Promise<void> {
    // 환경변수 에서 Redis 설정 가져오기
    const host = this.config.get<string>('REDIS_HOST');
    const port = Number(this.config.get<string>('REDIS_PORT'));
    const password = this.config.get<string>('REDIS_PASSWORD');

    // pub / sub 클라이언트 생성
    this.pubClient = createClient({ socket: { host, port }, password });
    this.subClient = this.pubClient.duplicate();

    try {
      // 두 클라이언트 모두 연결
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.logger.log('✅ Redis connected (pub / sub)');
    } catch (err) {
      this.logger.error('❌ Redis connection error:', err);
      throw err;
    }

    // --- Socket.IO Redis 어댑터 장착 (버전 및 네임스페이스 호환) ---
    const redisAdapter = createAdapter(this.pubClient, this.subClient);

    /**
     * 1) 루트 Server 인스턴스에 장착
     *    - Gateway 의 `server` 파라미터는 네임스페이스( streams )일 수 있으므로
     *      `.server` 프로퍼티를 통해 Socket.IO 루트 Server 를 얻는다.
     */
    const ioServer: any = (server as any).server ?? server;

    if (typeof ioServer.adapter === 'function') {
      // Socket.IO v4 이상
      ioServer.adapter(redisAdapter);
    } else {
      // v2 · v3 (프로퍼티에 할당)
      ioServer.adapter = redisAdapter;
    }

    // 이미 생성된 네임스페이스(예: 'streams')에도 직접 주입
    ioServer._nsps?.forEach((nsp) => {
      nsp.adapter = redisAdapter(nsp);
    });
    // ---------------------------------------------------------------
    this.logger.log('✅ Socket.IO Redis adapter attached');
  }

  /**
   * handleConnection
   * - WebSocket 클라이언트가 connect() 호출해서 연결될 때 자동 실행
   * - Guards 실행 전 단계이므로 client.data.user가 비어있을 수 있다.
   * - 실질적인 인증/권한 확인은 각 이벤트(@SubscribeMessage) 단계의 WsJwtGuard가 담당한다.
   */
  handleConnection(client: Socket): void {
    // 아직 Guards 가 실행되기 전 단계(user 정보 없음)
    this.logger.log(
      `✅ Client connected: socketId=${client.data}, ip=${client.handshake.address}`,
    );
    // 실질적인 인증/권한 확인은 각 이벤트(@SubscribeMessage) 단계의 WsJwtGuard 가 담당한다.
    this.logger.log(`🟢 Client connected: socketId=${client.id}`);
    wsConnects.inc(); // WebSocket 연결 수 증가
  }

  /**
   * handleDisconnect
   * - WebSocket 연결이 끊어질 때 실행
   * - leave 이벤트를 따로 받지 않아도, 클라이언트가 disconnect 하면
   *   여기서 로그 남기고 필요한 방 클린업을 수행 가능
   */
  handleDisconnect(client: Socket): void {
    const userId = client.data?.user?.userId;
    this.logger.log(
      `🟣 Client disconnected: socketId=${client.id}, userId=${userId}`,
    );
    // 기존 로그 이후
    client.rooms.forEach(async (room) => {
      if (room.startsWith('stream-')) {
        const id = Number(room.split('-')[1]);
        try {
          const stream = await this.streamFacade.findStreamById(id);
          if (stream.userId === client.data?.user?.userId) return; // 호스트는 제외
        } catch (err) {
          this.logger.error(
            `🔴 Failed to find stream ${id} on disconnect: ${err.message}`,
          );
          return; // 스트림 조회 실패 시 무시
        }
        if (Number.isFinite(userId)) {
          await this.updateViewerCount(id, client.id, userId, false).catch(() => {
            this.logger.error(
              `🟣 Failed to update viewer count for stream ${id} on disconnect`,
            );
          });
        }
      }
    });
  }

  /**
   * @SubscribeMessage('my-streams')
   * - 클라이언트가 자신의 스트림 목록을 요청할 때 실행
   * - WsJwtGuard 덕분에 client.data.user 에 userId 가 있음
   * - 스트림 목록을 조회하고 클라이언트에게 응답
   * * @returns 스트림 목록을 포함한 이벤트를 클라이언트에게 전송
   * @param client
   */
  @SubscribeMessage('my-streams')
  async handleMyStreams(@ConnectedSocket() client: Socket) {
    // 1) WsJwtGuard 덕분에 토큰이 유효하면 client.data.user 에 userId 가 있음
    const userId = client.data?.user?.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
      return;
    }

    // 2) 서비스 호출
    const streams = await this.streamFacade.findStreamsByUserId(userId);

    // 3) 클라이언트에게 응답
    client.emit('my-streams', streams);
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
    // 스트림 정보 조회 (호스트 ID 확인용)
    const stream = await this.streamFacade.findStreamById(id);
    const userId = client.data.user?.userId;
    const room = `stream-${id}`;
    const isOwner = stream.userId === userId;
    if (!client.data?.user) {
      this.logger.warn(
        `🔴 Unauthorized join attempt: socketId=${client.id}, streamId=${id}`,
      );
      client.disconnect(true);
      return;
    }
    client.join(room);
    this.logger.log(`User ${client.data.user.userId} joined room ${room}`);
    // 스트리머 자신은 viewerCount 대상에서 제외
    if (!isOwner) {
      await this.updateViewerCount(id, client.id, userId, true);
    }

    // 스트리머에게 현재 시청자 수 알려 주기
    const key = `stream:${streamId}:viewers`;
    const cnt = await this.pubClient.sCard(key);
    client.emit('viewer-count', cnt);

    client.emit('joined', { streamId });
    // (기존 viewer-joined 브로드캐스트도 그대로)
    this.server.to(room).emit('viewer-joined', { streamId, viewerId: userId });

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
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody('streamId') streamId: number,
  ): Promise<void> {
    const userId = client.data?.user?.userId;

    /* 기존 isOwner 계산을 교체 */
    const stream = await this.streamFacade.findStreamById(streamId);
    const isOwner = stream.userId === userId;

    // ────────────────────────────────────────────
    if (!isOwner) {
      /* userId 를 넘겨서 중복-소켓을 정확히 정리 */
      if (Number.isFinite(userId)) {
        await this.updateViewerCount(streamId, client.id, userId, false).catch(
          (err) =>
            this.logger.error(
              `🔴 Failed to update viewer count: ${err.message}`,
            ),
        );
      }
    }

    const room = `stream-${streamId}`;
    client.leave(room);
    this.logger.log(`User ${userId} left room ${room}`);
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

  /**
   * @SubscribeMessage('chat-message')
   * - 클라이언트가 보낸 채팅 메시지를 동일한 stream 룸에 브로드캐스트
   */
  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: number; text: string },
  ): Promise<void> {
    chatMessages.inc(); // 채팅 메시지 카운트 증가
    const { streamId, text } = data;
    const userId = client.data.user.userId;
    const username = client.data.user.sub;
    const timestamp = new Date().toISOString();
    const room = `stream-${streamId}`;

    // 이제 username 과 userId, text, timestamp 를 함께 emit
    this.server.to(room).emit('chat-message', {
      userId,
      username,
      text,
      timestamp,
    });
  }

  /**
   * updateViewerCount
   * - 스트림 방에 참여(join)하거나 나갈 때(viewer leave) 뷰어 수를 업데이트
   * - Redis를 사용하여 스트림별 뷰어 소켓 ID를 관리
   * @param streamId
   * @param socketId
   * @param userId
   * @param join
   * @private
   */
  private async updateViewerCount(
    streamId: number,
    socketId: string,
    userId: number,
    join = true,
  ) {
    if (!Number.isFinite(userId)) return; // 비정상 연결 방지

    const key = `stream:${streamId}:viewers`; // 소켓 ID 집합
    const userKey = `stream:${streamId}:user:${userId}`; // userId ↔ socketId 매핑

    if (join) {
      // 동일 유저의 이전 소켓ID 제거
      const oldSocketId: string | null = await this.pubClient.get(userKey);
      if (oldSocketId && oldSocketId !== socketId) {
        await this.pubClient.sRem(key, oldSocketId);
      }

      // 새 소켓 등록 + 매핑 저장(TTL 1 h)
      await this.pubClient.sAdd(key, socketId);
      await this.pubClient.set(userKey, socketId, { EX: 3600 });
    } else {
      // 퇴장 정리
      await this.pubClient.sRem(key, socketId);
      const current = await this.pubClient.get(userKey);
      if (current === socketId) {
        await this.pubClient.del(userKey);
      }
    }

    // 최종 시청자 수 브로드캐스트
    const cnt = await this.pubClient.sCard(key);
    const room = `stream-${streamId}`;
    this.server.to(room).emit('viewer-count', cnt);
  }
}
