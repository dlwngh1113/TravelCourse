# 우리의 날 · 청첩장 제작 서비스

GitHub 로그인과 Polar 구독을 사용하는 모바일 청첩장 제작 사이트입니다.

## 사용 흐름

1. GitHub로 로그인합니다.
2. 사이트의 구독 버튼을 통해 Polar에서 정기 구독합니다.
3. 디자인을 선택하고 이름, 예식 일시, 장소, 초대 문구와 사진을 입력합니다.
4. 비공개 초안을 저장하거나 공개한 뒤 /i/{id} 링크를 공유합니다.

활성 구독 중에만 제작·수정할 수 있습니다. 기존 공개 청첩장은 구독 종료 후에도 열람할 수 있고 소유자는 언제든 삭제할 수 있습니다. 비공개 초안과 삭제한 청첩장은 공유 주소로 열 수 없습니다. GitHub 계정 ID로 Polar 고객을 연결하며, 결제 완료 URL 자체로 권한을 부여하지 않습니다.

## 환경 설정

.env.example을 참고해 .env.local에 설정하고 서버를 재시작하세요.

- APP_URL: 실제 사이트 주소
- GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET: GitHub OAuth 앱 키. 콜백은 APP_URL/auth
- SESSION_SECRET: 긴 무작위 문자열
- POLAR_ENVIRONMENT: sandbox 또는 production
- POLAR_ACCESS_TOKEN: Polar Organization Access Token
- POLAR_PRODUCT_ID: 같은 조직·환경의 정기 구독 상품 ID
- INVITATION_DATA_DIR: 영구 디스크 폴더, 기본 data/invitations

Polar 토큰 권한은 checkouts:write, customers:read, products:read, customer_sessions:write가 필요합니다. 일회성 상품은 구독 결제에 사용할 수 없습니다. 요금은 Polar 상품에서 관리하며 결제 화면에서 확인합니다. GitHub로 로그인한 뒤 이 사이트의 구독 버튼으로 결제해야 계정이 연결됩니다. Polar에서 먼저 구매한 고객은 관리자에게 계정 연결을 요청해야 합니다.

구독 상태는 Polar Customer State API를 제작·수정 시마다 직접 조회합니다. 구독 상태 저장용 웹훅은 필요하지 않습니다. 조회 실패 시 권한을 허용하지 않습니다. 체험판·만료·연체 구독은 제작 권한을 부여하지 않으며, 기간 말 해지 예약은 남은 활성 기간 동안 사용할 수 있습니다.

## 실행

Node.js 22 이상에서 npm install 후 npm run dev를 실행합니다.
운영 빌드는 npm run build, 실행은 npm start입니다.
로컬 Sandbox는 [로컬 안내](docs/local-testing.md)를 참고하세요.

## 저장과 전환

청첩장 전체 레코드와 사진을 gzip 바이너리 .bin으로 저장합니다. 압축은 암호화가 아닙니다. 영구 디스크가 있는 단일 Node.js 서버를 전제로 합니다.
공개 청첩장은 링크를 아는 누구나 볼 수 있으며 검색 엔진 색인은 허용하지 않습니다. 초안에는 공개 링크를 제공하지 않습니다.
기존 프롬프트 상품·구매·리뷰 데이터는 보존되며 새 청첩장 서비스에서 사용하지 않습니다. 이전 거래 API, 판매자 정산 API, Stripe 웹훅은 410 응답으로 종료했습니다.
기존 Stripe 정기 결제나 외부 상품이 있다면 서비스 전환과 별개로 해당 대시보드에서 관리해야 합니다.

## Polar 참고 자료

- [Checkout](https://polar.sh/docs/api-reference/checkouts/create-session)
- [Customer State](https://polar.sh/docs/api-reference/customers/state-external)
- [Customer Portal](https://polar.sh/docs/api-reference/customer-portal/sessions/create)
