# Our Day: monthly subscription and guestbook

한국어 운영 연결 절차: [운영 설정 안내](docs/production-setup.md).

Google/GitHub login, Toss monthly card billing, invitation editing, and a public guestbook.

## Configuration

Set APP_URL, SESSION_SECRET, OAuth client credentials, TOSS_CLIENT_KEY, TOSS_SECRET_KEY and TOSS_AMOUNT_KRW in the server environment. TOSS_AMOUNT_KRW is the monthly KRW price (default 29000); existing subscribers retain the price accepted at signup.

BILLING_ENCRYPTION_KEY must be 64 random hexadecimal characters (32 bytes). Billing keys are encrypted with AES-256-GCM before being stored. Keep this key stable and back it up. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Google callback: APP_URL/auth/google. GitHub callback: APP_URL/auth.

## Subscription operation

Toss auto-billing requires the billing service contract. Configure an external scheduler to POST to APP_URL/api/payments/renew every hour, with Authorization: Bearer <RENEWAL_SECRET>. Set a long enough HTTP timeout for the number of due subscriptions. The application does not register a production scheduler automatically.

Signup creates a stable setup/customer ID. Billing-key issuance and every monthly charge use persistent idempotency keys. An immutable pending order is stored before requesting payment. Retries query that order first; payment and entitlement are saved together in a single record. Unknown network outcomes do not generate replacement orders. Pending orders older than 14 days require operator reconciliation, avoiding a fresh charge after the provider idempotency window. Canceled subscriptions never submit new charges; any previously ambiguous charge is only queried. A declined or unresolved charge keeps access expired until resolved, and should be investigated by the operator rather than replacing the order blindly.

Cancellation stops renewals and keeps access until the paid period ends. Published invitations and guestbooks remain readable. Old one-time payment records are retained but do not automatically become recurring subscriptions; users must authorize a billing card.

## MySQL adapter

`lib/database.ts` owns the connection pool. `lib/repository.ts` owns parameterized queries, binary record encoding and cross-process locks. Invitations, subscriptions and guestbooks all use this repository. Payloads remain compressed binary (MEDIUMBLOB), not plaintext JSON.

The MySQL driver is included in dependencies and installed by `npm install`. The connection pool and schema setup share the same URL and TLS configuration. Set MYSQL_SSL=true to require certificate verification; MYSQL_SSL_CA can point to a custom CA certificate file.

1. Set MYSQL_URL=mysql://user:password@host:3306/database (URL-encode credentials). Use a dedicated database user and configure MYSQL_SSL for remote connections.
2. Run `node --env-file=.env.local scripts/database-setup.mjs` to apply db/schema.sql.
3. To import existing compressed records, stop application writers and run `node --env-file=.env.local scripts/database-setup.mjs --import`. Conflicting records fail instead of being overwritten. Original files are retained.
4. Run `npm run db:check` to verify the connection and schema, then set DATA_DRIVER=mysql and restart. Back up the database and BILLING_ENCRYPTION_KEY.

MySQL mode uses connection-scoped named locks to serialize operations on a subscription or guestbook across workers. All writers must use the repository. File mode is for a single shared local data directory. A process crash can leave a .lock file: after verifying its owner process has stopped, remove only that stale lock and retry the same order.

## Guestbook

Public invitation pages support anonymous messages with a deletion password. Passwords are salted/scrypt-hashed and are never returned by the API. The invitation owner can delete messages while logged in. Private/deleted invitations do not expose guestbook APIs. Messages are plain text rendered by React. Each invitation supports up to 500 entries and displays the most recent 100.

## Checks

npm run typecheck
npm run build
node scripts/wedding-check.mjs
node scripts/repository-check.mjs

The regression test mocks Toss: it verifies replay, recovery after a paid-state write failure without duplicate charging, renewal/cancellation, encryption, and guestbook ownership/password checks. Real provider billing and a real MySQL connection require credentials and are not covered by that test.

The repository test uses real local files and a mocked MySQL connection to verify binary encoding, exclusive locking, cleanup after errors, and reuse of the same pooled connection during a locked operation. `npm run subscriptions:renew` is the scheduler entry point; configure it hourly on the production host after setting the renewal secret.
