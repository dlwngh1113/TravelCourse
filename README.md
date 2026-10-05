# annoyingcss

HTML·CSS 컴포넌트를 발견하고 공유하는 Next.js 웹사이트입니다.

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

- 8개 카테고리, 제목·작성자·태그 검색, 추천·최신·이름순 정렬
- 9개의 자체 제작 샘플 (샘플 배지로 구분)
- 격리된 iframe HTML/CSS 미리보기, 코드 복사, HTML/CSS 개별 다운로드
- 다운로드한 두 파일을 같은 폴더에 두면 HTML에서 CSS를 참조
- 브라우저 로컬 저장 컬렉션
- GitHub 로그인·로그아웃, 내 컴포넌트, 파일 선택 및 코드 입력 업로드
- 업로드한 콘텐츠는 MIT 라이선스 공개 동의를 받음
- 한국어 반응형 화면, 키보드 모달, 빈 상태·오류 안내

로그인 키가 없어도 탐색과 다운로드는 동작합니다. 인증 우회용 데모 로그인은 없습니다.
HTML·CSS 전용 미리보기로 스크립트, 외부 리소스, 폼 전송은 차단됩니다.

## 저장소와 배포

컴포넌트는 `DATA_DIR`(기본 `data/components`)에 UUID별 JSON 파일로 원자적으로 저장됩니다.
단일 Node.js 서버 및 영구 디스크를 전제로 합니다. 서버리스/여러 인스턴스로 운영할 경우 공유 데이터베이스를 연결해야 합니다.
`data/`와 환경 파일은 Git에서 제외됩니다. 기존 관광 API 환경 값은 사용하지 않습니다.

## 검증

`npm run build`, `npm run typecheck`를 실행하세요.
서버 실행 후 `node scripts/browser-check.mjs`로 Edge 기반 탐색·저장·다운로드·모바일 검증을 실행합니다.
`TEST_ORIGIN`으로 검사할 서버 주소를 지정할 수 있습니다.
실제 OAuth 완료 검증에는 GitHub 앱 키와 사용자 승인이 필요합니다.

`node scripts/upload-check.mjs`는 별도 포트 3011의 테스트 서버에서 테스트 전용 서명 세션으로 업로드·디스크 저장·새로고침·CSS 다운로드·입력 검증·OAuth 리디렉션·로그아웃을 검사합니다. 실제 GitHub 로그인 성공을 모의 검증하지 않습니다.
