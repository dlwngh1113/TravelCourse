export type Review = { id: string; promptId: string; buyerId: number; author: string; rating: number; body: string; createdAt: string; updatedAt: string };
export const reportReasons = ['스팸 또는 광고', '욕설·혐오·괴롭힘', '개인정보 노출', '상품과 무관한 내용', '기타'] as const;
