# annoyingcss

로컬 테스트 환경은 `npm run dev:local`로 실행합니다: **http://127.0.0.1:3100**.
상단에서 판매자·구매자 테스트 계정을 전환할 수 있고, 운영 설정은 보존됩니다.
Stripe 테스트 키와 웹훅 연결은 [로컬 테스트 안내](docs/local-testing.md)를 참고하세요.

구매자 별점·리뷰·신고와 판매 설명 이미지 기능은 [기능 및 운영 안내](docs/reviews-and-images.md)를 참고하세요. 로컬 서버에서 `node scripts/reviews-check.mjs`로 검증할 수 있습니다.

AI 프롬프트를 발견하고 공유하는 Next.js 웹사이트입니다. 영상, 사주, 코딩, 여행 코스 등의 카테고리와 사용 방법을 함께 제공합니다.

## 실행

Node.js 20.9 이상에서 `npm install`, `npm run dev`를 실행합니다.
기본 주소는 http://localhost:3000 입니다. Windows에서는 `npm.cmd`를 사용할 수 있습니다.
`npm run dev -- --port 4000`으로 포트를 변경할 수 있습니다.

## GitHub 로그인 연결

프로젝트 루트의 `.env.local`에 OAuth 키를 입력하세요. `.env`도 지원하지만 같은 항목은 `.env.local` 설정이 우선합니다. 키는 서버에서만 사용하며 Git에는 포함되지 않습니다.

```dotenv
APP_URL=https://49.247.131.223
GITHUB_CLIENT_ID=GitHub에서_발급받은_Client_ID
GITHUB_CLIENT_SECRET=GitHub에서_발급받은_Client_Secret
SESSION_SECRET=충분히_긴_무작위_문자열
```

`.env.local`의 `SESSION_SECRET`은 준비된 값을 그대로 사용하면 됩니다. 새로운 서버에서 설정할 때는 아래 생성 명령을 사용하세요.

1. GitHub Settings → Developer settings → OAuth Apps에서 앱을 등록합니다.
2. Homepage URL은 `APP_URL`과 동일하게 설정합니다.
3. Authorization callback URL: `https://49.247.131.223/auth`. 코드에서는 `APP_URL`에 `/auth`를 붙여 로그인 요청과 토큰 교환에 동일하게 사용합니다.
4. `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`을 입력합니다.
5. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`로 생성한 값을 `SESSION_SECRET`에 입력합니다.
6. 서버를 재시작합니다. 운영 환경에서는 HTTPS 주소를 사용합니다.

HTTPS를 처리하는 프록시가 `/auth`를 포함한 요청을 Next.js 서버로 전달해야 합니다. 로컬에서 실제 로그인을 테스트할 경우 `APP_URL=http://localhost:3000`과 GitHub 콜백 `http://localhost:3000/auth`를 함께 설정하세요.

OAuth는 state 검증과 PKCE를 사용하며 토큰을 브라우저에 노출하거나 저장하지 않습니다.
로그인에는 공개 프로필만 사용하며 저장소 접근 권한을 요청하지 않습니다.
[GitHub OAuth 공식 문서](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

## 기능

- 8개 프롬프트 카테고리, 제목·작성자·모델 검색, 가격순·최신순 정렬
- 사용 방법이 공개된 자체 제작 프롬프트 샘플
- 구매 후 프롬프트 원문과 사용 가이드 TXT 다운로드
- 브라우저 로컬 저장 컬렉션
- GitHub 로그인·로그아웃, 내가 올린 프롬프트, 프롬프트 입력 업로드
- 무료 프롬프트와 유료 프롬프트, 판매자 삭제 및 구매자 이용 권한 보존
- 한국어 반응형 화면, 키보드 모달, 빈 상태·오류 안내

로그인 키가 없어도 탐색과 다운로드는 동작합니다. 인증 우회용 데모 로그인은 없습니다.
HTML·CSS 전용 미리보기로 스크립트, 외부 리소스, 폼 전송은 차단됩니다.

## 저장소와 배포

프롬프트·판매자 연결·구매 기록은 `DATA_DIR`(기본 `data/components`)에 gzip으로 압축한 바이너리 `.bin` 레코드로 원자적으로 저장됩니다. 기존 JSON 레코드는 첫 접근 때 검증 후 바이너리로 자동 이관되고 원본은 제거됩니다. 저장 파일에서 원문 평문을 조회할 수 없으며, 앱 내부에서만 복원됩니다.
단일 Node.js 서버 및 영구 디스크를 전제로 합니다. 서버리스/여러 인스턴스로 운영할 경우 공유 데이터베이스를 연결해야 합니다.
`data/`와 환경 파일은 Git에서 제외됩니다. 기존 관광 API 환경 값은 사용하지 않습니다.

## 검증

`npm run build`, `npm run typecheck`를 실행하세요.
서버 실행 후 `node scripts/browser-check.mjs`로 Edge 기반 탐색·저장·다운로드·모바일 검증을 실행합니다.
`TEST_ORIGIN`으로 검사할 서버 주소를 지정할 수 있습니다.
실제 OAuth 완료 검증에는 GitHub 앱 키와 사용자 승인이 필요합니다.

## 결제와 판매자 정산

Stripe Connect Express와 Stripe Checkout을 사용합니다. `.env.local`에 `STRIPE_SECRET_KEY`와 `STRIPE_WEBHOOK_SECRET`을 설정한 뒤 Stripe Dashboard에서 `https://49.247.131.223/api/stripe/webhook` 웹훅을 등록하고 `checkout.session.completed`, `checkout.session.async_payment_succeeded` 이벤트를 선택하세요. 판매자는 업로드 화면에서 Stripe 정산 계정을 연결한 뒤 가격을 0~1,000달러로 설정할 수 있습니다.

결제 금액의 5%는 annoyingcss 플랫폼 수수료로 표시되며, Stripe Connect destination charge를 통해 판매자에게 95%가 정산됩니다. 실제 정산은 Stripe의 계정 인증, 국가별 지원 여부, 결제 처리와 지급 일정에 따릅니다. 구매자는 결제 후 프롬프트를 개인·상업 프로젝트에 사용하고 수정할 수 있지만 원문이나 수정본 자체를 재판매·재배포할 수 없습니다. 판매자는 프롬프트를 판매할 권리를 보유해야 합니다.

결제 라이선스 문구는 서비스 화면에 표시되지만, 운영 전 법률 검토와 환불·세금·분쟁 정책을 별도로 확정해야 합니다. Stripe의 [Connect 온보딩](https://docs.stripe.com/connect/enable-payment-acceptance-guide)과 [Checkout 결제 및 웹훅](https://docs.stripe.com/connect/separate-charges-and-transfers) 문서를 참고하세요.

`node scripts/upload-check.mjs`는 별도 포트 3011의 테스트 서버에서 테스트 전용 서명 세션으로 업로드·디스크 저장·새로고침·CSS 다운로드·입력 검증·OAuth 리디렉션·로그아웃을 검사합니다. 실제 GitHub 로그인 성공을 모의 검증하지 않습니다.
