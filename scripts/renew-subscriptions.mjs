if (!process.env.APP_URL || !process.env.RENEWAL_SECRET) throw new Error('APP_URL and RENEWAL_SECRET are required');
const response = await fetch(new URL('/api/payments/renew', process.env.APP_URL), {
  method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RENEWAL_SECRET }, signal: AbortSignal.timeout(600000),
});
if (!response.ok) throw new Error('Subscription renewal failed: HTTP ' + response.status);
console.log(await response.json());
