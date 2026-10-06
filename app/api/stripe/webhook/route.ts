import { NextResponse } from "next/server";
import { savePurchase } from "@/lib/store";
import { getPrompt } from "@/lib/store";
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
      const promptId = typeof metadata.promptId === "string" ? metadata.promptId : "";
      const buyerId = Number(metadata.buyerId);
      const amountCents = Number(metadata.amountCents);
      const prompt = promptId ? await getPrompt(promptId) : null;
      const paid = event.type === "checkout.session.async_payment_succeeded" || session?.payment_status === "paid";
      if (prompt && Number.isInteger(buyerId) && buyerId > 0 && Number.isInteger(amountCents) && amountCents === prompt.priceCents && paid) {
        await savePurchase({
          id: session.id,
          promptId,
          buyerId,
          sellerId: Number(metadata.sellerId),
          amountCents,
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
