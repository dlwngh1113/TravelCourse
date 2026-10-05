import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
export type User = { id:number; login:string };
export const configured = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.SESSION_SECRET && process.env.APP_URL);
export const githubCallbackUrl = () => new URL('/auth', process.env.APP_URL!).toString();
export const cookieOptions = {httpOnly:true,secure:process.env.APP_URL?.startsWith('https://') ?? false,sameSite:'lax' as const,path:'/'};
export function signSession(user:User) {const data=Buffer.from(JSON.stringify({...user,exp:Date.now()+7*86400000})).toString('base64url');return `${data}.${createHmac('sha256',process.env.SESSION_SECRET!).update(data).digest('base64url')}`;}
export async function currentUser():Promise<User|null> {try {if(!configured())return null;const token=(await cookies()).get('ac_session')?.value;if(!token)return null;const [data,sig]=token.split('.');const expected=createHmac('sha256',process.env.SESSION_SECRET!).update(data).digest();const actual=Buffer.from(sig,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const value=JSON.parse(Buffer.from(data,'base64url').toString());if(value.exp<Date.now()||!Number.isInteger(value.id)||typeof value.login!=='string')return null;return {id:value.id,login:value.login};}catch{return null;}}
