export interface SignalPayload {
  streamId: number;
  sdp?: any; // 오디오/비디오 코덱·코덱 설정 등 세션 설명 정보가 담겨 있음
  candidate?: any; // IP/port 조합 등 네트워크 경로 후보가 담김
}
