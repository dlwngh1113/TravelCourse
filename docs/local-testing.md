# 청첩장 로컬 Sandbox

1. npm run local:setup으로 .env.local-test를 준비합니다.
2. sandbox.polar.sh에서 조직과 정기 구독 상품을 만듭니다.
3. .env.local-test에 POLAR_ACCESS_TOKEN과 POLAR_PRODUCT_ID를 입력합니다. 같은 Sandbox 조직의 값이어야 합니다.
4. npm run dev:local로 실행하고 http://127.0.0.1:3100을 엽니다.
5. 상단 테스트 계정 A 또는 B로 로그인합니다. 각각 별도 GitHub ID로 연결됩니다.
6. 사이트에서 Polar Sandbox 구독을 완료하고 구독 상태를 새로고침합니다.
7. 활성 구독 계정으로 청첩장 초안 저장, 공개, 수정, 삭제를 사용합니다.

GitHub 테스트 로그인은 구독을 우회하지 않습니다. 키가 없을 때에는 공개 디자인만 둘러볼 수 있고 저장은 차단됩니다. 실결제 환경은 로컬 실행에서 허용하지 않습니다. 기존 .env.local 파일은 수정하지 않습니다.
사진은 PNG·JPEG·WebP 최대 4장, 원본 장당 5MB까지 선택할 수 있습니다. 브라우저에서 축소하고 서버에서 실제 이미지 형식을 검증한 후 메타데이터를 제거합니다.
저장 폴더는 data/local-tests/invitations입니다. 운영 청첩장 저장 폴더와 분리됩니다.

이전 프롬프트 거래용 local-check.mjs와 reviews-check.mjs는 새 서비스에 적용되지 않습니다.
