# 월간 구독 로컬 테스트

1. `npm run local:setup`을 실행합니다.
2. `.env.local-test`에 자동결제를 사용할 수 있는 토스 테스트 키 TOSS_CLIENT_KEY / TOSS_SECRET_KEY를 입력합니다.
3. TOSS_AMOUNT_KRW는 월 구독 금액입니다. BILLING_ENCRYPTION_KEY는 로컬 실행 시 없으면 자동 생성되어 파일에 저장됩니다. 값을 변경하면 기존 빌링키를 복호화할 수 없습니다.
4. `npm run dev:local`로 http://127.0.0.1:3100 을 열고 테스트 계정 A 또는 B로 로그인합니다.
5. 월간 구독 버튼에서 카드를 인증하고 첫 결제 후 청첩장을 작성합니다. 공개 링크에서 방명록 작성과 비밀번호 삭제, 소유자 삭제를 확인합니다.
6. 갱신을 테스트하려면 RENEWAL_SECRET을 설정하고 POST /api/payments/renew 를 Authorization: Bearer 값과 함께 호출합니다. 아직 만료되지 않은 구독에는 추가 결제가 발생하지 않습니다.
7. `node scripts/wedding-check.mjs`는 외부 결제 없이 재시도·중복 콜백·승인 후 저장 실패·구독 해지·방명록을 검증합니다.

로컬 실행은 DATA_DRIVER=file, data/local-tests/invitations를 사용합니다. 운영 MySQL 연결 및 스키마 적용 방법은 README.md에 있습니다. 운영 구독 갱신은 별도 스케줄러에서 정기 호출해야 합니다.
