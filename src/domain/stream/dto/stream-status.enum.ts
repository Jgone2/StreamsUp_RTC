export enum StreamStatus {
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
}

/** 한글 라벨 (표시용) */
export const StreamStatusLabel: Record<StreamStatus, string> = {
  [StreamStatus.LIVE]: '방송중',
  [StreamStatus.FINISHED]: '방송종료',
};