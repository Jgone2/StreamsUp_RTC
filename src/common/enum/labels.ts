import { Category, StreamStatus } from './enums';

export const CategoryLabel: Record<Category, string> = {
  [Category.FITNESS]: '헬스',
  [Category.YOGA]: '요가',
  [Category.DANCE]: '댄스',
  [Category.DIET]: '식단',
  [Category.STRETCHING]: '스트레칭',
  [Category.ETC]: '기타',
};

export const StreamStatusLabel: Record<StreamStatus, string> = {
  [StreamStatus.LIVE]: '방송중',
  [StreamStatus.FINISHED]: '방송종료',
};