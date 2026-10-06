# 로컬 테스트

## 바로 실행

Node.js 22 이상에서 프로젝트 폴더를 열고 실행합니다.

```sh
npm install
npm run dev:local
```

주소: **http://127.0.0.1:3100**

Windows PowerShell 실행 정책으로 npm이 차단되면 `npm.cmd run dev:local`을 사용합니다.
첫 실행 시 `.env.local-test`가 자동 생성됩니다. 기존 운영 `.env.local`은 변경하지 않습니다.
로컬 파일은 `data/local-tests/components`, 빌드 캐시는 `.next-local`에 저장합니다.
설정만 생성하려면 `npm run local:setup`을 실행합니다.

상단 LOCAL TEST 도구에서 **판매자 테스트 로그인** / **구매자 테스트 로그인**을 전환하세요.
GitHub 키 없이도 무료 업로드, 삭제, 검색, 저장, 다운로드를 확인할 수 있습니다.
테스트 계정 로그인은 개발 모드 + 로컬 테스트 명령 + 루프백 주소에서만 제공됩니다.
`next build` / `next start` 운영 모드에서는 테스트 로그인 API가 404를 반환합니다.

## Stripe 테스트 결제 연결

실제 돈을 사용하지 않는 Stripe Sandbox 연결입니다. 결제를 가짜로 성공시키는 버튼은 없습니다.

1. `.env.local-test`의 `STRIPE_SECRET_KEY`에 Sandbox의 `sk_test_...` 키를 입력합니다.
   운영 `sk_live_...` 키를 입력하면 로컬 서버 실행이 중단됩니다.
2. Stripe CLI는 프로젝트에 설치되어 있습니다.
   `npm run stripe:login`을 실행하고 위 키와 같은 Sandbox에 연결합니다.
3. 별도 터미널에서 `npm run stripe:listen`을 실행한 상태로 유지합니다.
4. 출력되는 `whsec_...` 값을 `.env.local-test`의 `STRIPE_WEBHOOK_SECRET`에 입력합니다.
   운영 Dashboard 웹훅 Secret과 다른 값입니다.
5. 로컬 서버를 Ctrl+C로 종료한 뒤 `npm run dev:local`로 다시 시작합니다.

리스너가 실행하는 명령:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://127.0.0.1:3100/api/stripe/webhook
```

localhost 웹훅은 공개 Dashboard 주소로 등록하는 대신 CLI로 전달합니다.
[Stripe 로컬 웹훅 문서](https://docs.stripe.com/webhooks#local-listener)

## 판매 → 구매 순서

1. 판매자 테스트 계정으로 전환합니다.
2. 컴포넌트 올리기에서 가격을 $1로 입력하고 Stripe 판매자 계정을 연결합니다.
3. Sandbox 온보딩을 완료한 뒤 다시 업로드 화면에서 유료 컴포넌트를 올립니다.
4. 구매자 테스트 계정으로 전환하고 해당 컴포넌트의 구매 버튼을 누릅니다.
5. Checkout에서 테스트 카드 `4242 4242 4242 4242`, 미래 만료일, 임의 3자리 CVC로 결제합니다.
6. 리스너의 웹훅 응답 200을 확인하고 페이지를 새로고침하면 HTML·CSS를 다운로드할 수 있습니다.

실제 결제 성공 여부는 웹훅으로 기록됩니다. 단순히 성공 URL을 열어서는 구매 권한이 생기지 않습니다.
판매자·구매 기록을 다시 목록에 섞어 읽지 않도록 저장소 필터를 적용했습니다.
구매 전 원본 HTML·CSS가 브라우저로 전달되지 않도록 유료 미리보기는 잠금 표시를 사용합니다.
현재 결제 구현은 로컬 검증 단계입니다. 환불·분쟁 처리 및 판매 취소 후 구매자 재다운로드 정책 등은 실운영 전에 보완해야 합니다.

## GitHub OAuth도 실제로 테스트하려면

별도의 개발용 GitHub OAuth App을 만들고 다음 주소를 등록합니다.

- Homepage: `http://127.0.0.1:3100`
- Callback: `http://127.0.0.1:3100/auth`

개발용 키를 `.env.local-test`의 `GITHUB_CLIENT_ID`와 `GITHUB_CLIENT_SECRET`에 넣고 재시작합니다.
운영 OAuth 앱 설정을 바꿀 필요는 없습니다.

## 자동 점검

로컬 서버 실행 중 `npm run test:local`로 테스트 계정 전환, 업로드, 소유자 삭제 제한과 페이지 재로드를 점검합니다.
Stripe 키가 없는 상태에서도 실행할 수 있으며 외부 결제를 생성하지 않습니다.
샌드박스 결제는 위 수동 순서로 확인하세요.
자동 점검은 임시 로컬 구매 기록으로 다운로드 권한을 검사한 후 해당 테스트 파일을 삭제합니다.
