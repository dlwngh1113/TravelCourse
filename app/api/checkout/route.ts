import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getComponent, getSeller, hasPurchase } from "@/lib/store";
import { paymentsConfigured, stripe } from "@/lib/stripe";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL || request.url).origin
  )
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "구매하려면 GitHub 로그인이 필요합니다." },
      { status: 401 },
    );
  if (!paymentsConfigured())
    return NextResponse.json(
      { error: "결제 설정이 아직 완료되지 않았습니다." },
      { status: 503 },
    );
  try {
    const body = await request.json();
    const item = await getComponent(
      typeof body?.componentId === "string" ? body.componentId : "",
    );
    if (!item)
      return NextResponse.json(
        { error: "컴포넌트를 찾을 수 없습니다." },
        { status: 404 },
      );
    if (!item.priceCents || item.priceCents <= 0)
      return NextResponse.json(
        { error: "무료 컴포넌트입니다." },
        { status: 400 },
      );
    if (item.ownerId === user.id)
      return NextResponse.json(
        { error: "내 컴포넌트는 구매할 수 없습니다." },
        { status: 400 },
      );
    if (await hasPurchase(user.id, item.id))
      return NextResponse.json(
        { error: "이미 구매한 컴포넌트입니다." },
        { status: 409 },
      );
    const seller = await getSeller(item.ownerId || 0);
    if (!seller || seller.stripeAccountId !== item.sellerStripeAccountId)
      return NextResponse.json(
        { error: "판매자가 정산 계정을 아직 연결하지 않았습니다." },
        { status: 409 },
      );
    const fee = Math.round(item.priceCents * 0.05);
    const session = await stripe("checkout/sessions", {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(item.priceCents),
      "line_items[0][price_data][product_data][name]": item.title,
      "line_items[0][price_data][product_data][description]":
        "annoyingcss 컴포넌트 라이선스",
      "payment_intent_data[application_fee_amount]": String(fee),
      "payment_intent_data[transfer_data][destination]": seller.stripeAccountId,
      "metadata[componentId]": item.id,
      "metadata[buyerId]": String(user.id),
      "metadata[sellerId]": String(item.ownerId || ""),
      "metadata[amountCents]": String(item.priceCents),
      success_url: `${process.env.APP_URL}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/?purchase=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "결제 세션을 만들지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
