# 운영 연결 안내

구독·방명록·MySQL 저장소 코드와 MySQL 드라이버 설치는 완료되었습니다. 실제 MySQL 접속 정보와 토스 빌링 계약 키를 설정한 후 다음 순서로 연결합니다.

## 환경 변수

`.env.example`을 참고해 운영 서버의 `.env.local` 또는 환경 변수에 값을 넣습니다.

- `MYSQL_URL`: `mysql://사용자:비밀번호@호스트:3306/데이터베이스` (특수문자는 URL 인코딩)
- `MYSQL_SSL=true`: 원격 서버의 TLS 인증서를 검증합니다. 사설 인증서는 `MYSQL_SSL_CA`에 CA 파일 경로를 지정합니다.
- `DATA_DRIVER=mysql`: 파일 저장소 대신 MySQL을 사용합니다.
- `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`: 자동결제 사용 계약이 된 토스 키
- `TOSS_AMOUNT_KRW`: 월 구독 금액. 이미 등록된 구독은 등록 당시 금액을 유지합니다.
- `BILLING_ENCRYPTION_KEY`: 32바이트 무작위 키의 64자리 hex 문자열. 빌링키 암호화에 사용하므로 변경하지 말고 백업합니다.
- `RENEWAL_SECRET`: 갱신 API 인증에 쓰는 별도의 긴 무작위 문자열
- `APP_URL`, `SESSION_SECRET`, Google/GitHub OAuth 키: 기존 로그인 설정

실제 키는 문서나 저장소에 커밋하지 않습니다.

## MySQL 초기화와 이전

1. `npm install`
2. `npm run db:setup`으로 테이블을 만듭니다.
3. 기존 파일 데이터를 옮길 때는 서비스 쓰기를 중단하고 `node --env-file=.env.local scripts/database-setup.mjs --import`를 실행합니다. 충돌하는 레코드는 덮어쓰지 않으며 원본 파일은 보존됩니다.
4. `npm run db:check`로 연결과 스키마를 확인합니다.
5. `DATA_DRIVER=mysql`로 서버를 재시작합니다.

## 정기 청구

운영 서버의 작업 스케줄러나 cron에 프로젝트 디렉터리에서 `npm run subscriptions:renew`를 매시간 실행하도록 등록합니다. 이 명령은 인증된 갱신 API를 호출합니다. 웹 요청 제한시간은 만기 구독 수에 맞춰 설정하고, 실패 종료를 모니터링합니다.

청구 실패 또는 응답 유실 시 같은 주문을 먼저 조회합니다. 미확정 주문은 임의로 지우거나 새 주문으로 바꾸면 안 됩니다. 14일을 넘긴 미확정 주문은 토스 거래 내역과 대조한 후 관리자가 처리해야 합니다.

구독 해지는 다음 청구를 중단합니다. 기존 결제 기간은 유지되며, 미확정 결제는 새로 청구하지 않고 조회만 합니다. 과거 1회 결제 내역을 구독으로 자동 전환하지 않으므로 새 카드 인증이 필요합니다.

## 확인 명령

- `npm test`: 결제 재시도·동시성·저장 실패 복구·방명록·저장소 테스트
- `npm run build`: 프로덕션 빌드
- `npm run test:http`: 빌드된 서버의 방명록과 권한 검증 (임시 데이터만 사용)
- `npm run db:check`: 실제 MySQL 연결 확인

로컬 테스트는 실제 청구를 하지 않습니다. MySQL 어댑터 테스트는 모의 연결을 사용하므로 운영 DB 연결 검증은 `db:check`로 별도 실행해야 합니다.
