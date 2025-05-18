export enum Category {
  FITNESS = 'FITNESS',
  YOGA = 'YOGA',
  DANCE = 'DANCE',
  DIET = 'DIET',
  STRETCHING = 'STRETCHING',
  ETC = 'ETC',
}

/** 한글 표시용 라벨 매핑 */
export const CategoryLabel: Record<Category, string> = {
  [Category.FITNESS]: '헬스',
  [Category.YOGA]: '요가',
  [Category.DANCE]: '댄스',
  [Category.DIET]: '식단',
  [Category.STRETCHING]: '스트레칭',
  [Category.ETC]: '기타',
};
