import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSeller, saveSeller } from "@/lib/store";
import { stripe, paymentsConfigured } from "@/lib/stripe";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL || request.url).origin
  )
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "GitHub 로그인이 필요합니다." },
      { status: 401 },
    );
  if (!paymentsConfigured())
    return NextResponse.json(
      { error: "판매자 결제 설정이 아직 완료되지 않았습니다." },
      { status: 503 },
    );
  try {
    let seller = await getSeller(user.id);
    if (!seller) {
      const account = await stripe("accounts", {
        type: "express",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "business_profile[product_description]": "AI 프롬프트와 사용 가이드",
      });
      seller = { userId: user.id, stripeAccountId: account.id };
      await saveSeller(user.id, account.id);
    }
    const link = await stripe("account_links", {
      account: seller.stripeAccountId,
      refresh_url: `${process.env.APP_URL}/?seller=refresh`,
      return_url: `${process.env.APP_URL}/?seller=complete`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "판매자 등록에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
