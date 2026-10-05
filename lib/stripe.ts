import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const paymentsConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
export async function stripe(
  path: string,
  params: Record<string, string> = {},
  method = "POST",
) {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Stripe 결제 설정이 없습니다.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : new URLSearchParams(params),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Stripe 요청에 실패했습니다.",
    );
  return data;
}
export function verifyStripeSignature(
  payload: string,
  signature: string | null,
) {
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return false;
  const timestamp = signature
    .split(",")
    .find((v) => v.startsWith("t="))
    ?.slice(2);
  const value = signature
    .split(",")
    .find((v) => v.startsWith("v1="))
    ?.slice(3);
  if (
    !timestamp ||
    !value ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const actual = Buffer.from(value, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return (
    actual.length === expectedBytes.length &&
    timingSafeEqual(actual, expectedBytes)
  );
}
