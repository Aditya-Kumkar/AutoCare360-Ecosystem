import { isRole, type Role } from './policy';

export class ApiError extends Error {
  constructor(public status:number,public code:string){super(code);}
}
export function send(res:any,status:number,body:unknown){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(body));
}
export function handleError(res:any,error:unknown){
  const e=error instanceof ApiError?error:new ApiError(502,'upstream_unavailable');
  send(res,e.status,{ok:false,error:e.code});
}
function supabaseConfig(){
  const raw=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!raw||!key)throw new ApiError(503,'auth_not_configured');
  let url:URL;
  try{url=new URL(raw);}catch{throw new ApiError(503,'auth_not_configured');}
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.pathname!=='/')throw new ApiError(503,'auth_not_configured');
  return {base:url.origin,key};
}
export type AuthUser={id:string;email:string;role:Role};
export async function requireUser(req:any):Promise<AuthUser>{
  const auth=typeof req.headers?.authorization==='string'?req.headers.authorization:'';
  if(!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(auth))throw new ApiError(401,'authentication_required');
  const cfg=supabaseConfig();
  let response:Response;
  try{
    response=await fetch(cfg.base+'/auth/v1/user',{method:'GET',headers:{apikey:cfg.key,Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000)});
  }catch{throw new ApiError(502,'identity_provider_unavailable');}
  if(!response.ok)throw new ApiError(401,'invalid_or_expired_session');
  const user=await response.json() as {id?:string;email?:string;app_metadata?:{autocare_role?:unknown}};
  if(!user.id||!/^[0-9a-f-]{36}$/i.test(user.id))throw new ApiError(401,'invalid_identity');
  const selected=user.app_metadata?.autocare_role;
  const role:Role=isRole(selected)?selected:'customer';
  return {id:user.id,email:typeof user.email==='string'?user.email:'',role};
}
export function allowedMethod(req:any,methods:string[]){
  const method=String(req.method||'');
  if(!methods.includes(method))throw new ApiError(405,'method_not_allowed');
}
export function parseBody(req:any):Record<string,unknown>{
  let body=req.body;
  if(typeof body==='string'){
    if(body.length>35000)throw new ApiError(413,'payload_too_large');
    try{body=JSON.parse(body);}catch{throw new ApiError(400,'invalid_json');}
  }
  if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>35000)throw new ApiError(400,'invalid_body');
  return body as Record<string,unknown>;
}
