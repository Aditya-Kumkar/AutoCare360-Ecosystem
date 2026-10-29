/** Friendly Supabase Auth failures. No server secrets or user details are logged. */
type AuthBody={code?:unknown;error_code?:unknown;error?:unknown;message?:unknown;msg?:unknown;error_description?:unknown};
function body(value:unknown):AuthBody{return value&&typeof value==='object'&&!Array.isArray(value)?value as AuthBody:{}}
export function authErrorCode(value:unknown,status:number):string{
 const b=body(value);const raw=String(b.code||b.error_code||'');
 const msg=String(b.message||b.msg||b.error_description||b.error||'');
 if(raw)return raw;
 if(/email rate limit exceeded/i.test(msg))return 'over_email_send_rate_limit';
 if(/email not confirmed/i.test(msg))return 'email_not_confirmed';
 if(/email address not authorized/i.test(msg))return 'email_address_not_authorized';
 return status===429?'too_many_requests':'';
}
export function authErrorMessage(value:unknown,status:number):string{
 const b=body(value);
 const code=authErrorCode(value,status);
 if(code==='over_email_send_rate_limit')return 'Email sending is temporarily unavailable: this project exhausted its Supabase email quota. Repeated registration or resend requests will not help. Ask the project administrator to configure custom SMTP; use an already confirmed account meanwhile.';
 if(code==='email_address_not_authorized')return 'This email cannot receive messages using the built-in Supabase mail service. A project administrator must configure custom SMTP for public users.';
 if(code==='email_not_confirmed')return 'This account exists but the email is unconfirmed. Do not register it again. Confirm the email with a valid link, or ask the project administrator to review the existing account.';
 if(code==='user_already_exists'||code==='email_exists')return 'This email is already registered. Use Sign in rather than creating another account.';
 if(code==='over_request_rate_limit'||code==='too_many_requests')return 'Too many authentication requests were submitted. Stop retrying and contact the project administrator if the issue continues.';
 const raw=b.error_description||b.msg||b.message||b.error;
 return typeof raw==='string'&&raw.length<500?raw:'Unable to complete authentication. Please try again or contact support.';
}
