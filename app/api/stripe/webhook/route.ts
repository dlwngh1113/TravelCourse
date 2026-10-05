import { NextResponse } from "next/server";
import { savePurchase } from "@/lib/store";
import { verifyStripeSignature } from "@/lib/stripe";
export async function POST(request: Request) {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature")))
    return NextResponse.json(
      { error: "서명 검증에 실패했습니다." },
      { status: 400 },
    );
  try {
    const event = JSON.parse(payload);
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    ) {
      const session = event.data?.object;
      const metadata = session?.metadata || {};
      if (
        session?.payment_status === "paid" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        await savePurchase({
          id: session.id,
          componentId: metadata.componentId,
          buyerId: Number(metadata.buyerId),
          sellerId: Number(metadata.sellerId),
          amountCents: Number(metadata.amountCents),
          currency: "usd",
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "웹훅 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
