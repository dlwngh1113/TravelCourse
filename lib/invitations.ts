export type Invitation = {
  id: string; ownerId: number; firstName: string; secondName: string; date: string; time: string;
  venue: string; address: string; directions: string; message: string;
  theme: 'linen' | 'rose' | 'sage'; images: { src: string; caption: string }[];
  published: boolean; createdAt: string; updatedAt: string; deletedAt?: string;
};
export const exampleInvitation: Invitation = {
  id: 'preview', ownerId: 0, firstName: '서연', secondName: '도윤', date: '2027-05-22', time: '14:00',
  venue: '그린가든 웨딩홀', address: '서울특별시 중구 세종대로 110', directions: '지하철 시청역에서 도보 5분\n주차는 예식장 안내를 확인해 주세요.',
  message: '서로의 계절이 되어준 두 사람이\n이제 같은 방향으로 걸어가려 합니다.\n\n소중한 분들을 모시고\n저희의 첫 시작을 함께하고 싶습니다.',
  theme: 'linen', images: [], published: false, createdAt: '', updatedAt: '',
};
