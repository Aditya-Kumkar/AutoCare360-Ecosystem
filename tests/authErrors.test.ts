import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorCode,authErrorMessage} from '../src/authErrors.ts';

test('the hourly email cap is clearly distinguished from invalid credentials',()=>{
 const body={code:'over_email_send_rate_limit',message:'email rate limit exceeded'};
 assert.equal(authErrorCode(body,429),'over_email_send_rate_limit');
 const msg=authErrorMessage(body,429);
 assert.match(msg,/custom SMTP/i);
 assert.match(msg,/Repeated registration or resend requests will not help/);
});
test('the fallback recognizes rate limits without a structured code',()=>{
 assert.equal(authErrorCode({message:'email rate limit exceeded'},429),'over_email_send_rate_limit');
 assert.equal(authErrorCode({message:'request rate limit exceeded'},429),'too_many_requests');
});
test('unconfirmed users are not encouraged to sign up again',()=>{
 const message=authErrorMessage({code:'email_not_confirmed'},400);
 assert.match(message,/exists but the email is unconfirmed/i);
 assert.match(message,/Do not register it again/);
});
test('non-team recipients need custom SMTP',()=>{
 assert.match(authErrorMessage({code:'email_address_not_authorized'},400),/custom SMTP/);
});
test('normal auth errors are not overwritten with a quota explanation',()=>{
 assert.equal(authErrorMessage({code:'invalid_credentials',message:'Invalid login credentials'},400),'Invalid login credentials');
});
