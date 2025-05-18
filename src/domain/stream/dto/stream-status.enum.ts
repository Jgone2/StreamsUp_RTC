export enum StreamStatus {
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
}

/** 한글 라벨 (표시용) */
export const StreamStatusLabel: Record<StreamStatus, string> = {
  [StreamStatus.LIVE]: 'LIVE',
  [StreamStatus.FINISHED]: 'FINISHED',
};