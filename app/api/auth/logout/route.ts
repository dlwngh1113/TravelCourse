import { NextResponse } from 'next/server';
export async function POST(request:Request){if(request.headers.get('origin')!==new URL(process.env.APP_URL||request.url).origin)return NextResponse.json({error:'잘못된 요청입니다.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.delete('ac_session');return response;}

