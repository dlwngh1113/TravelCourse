export async function PATCH() { return Response.json({ error: '프롬프트 거래 서비스가 종료되었습니다. 청첩장 제작 서비스를 이용해 주세요.' }, { status: 410 }); }
