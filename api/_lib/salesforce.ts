import { ApiError } from './auth';
type Token={access_token:string;instance_url:string};
const API_VERSION='v65.0';
function salesforceHost(raw:string):string{
 let u:URL;
 try{u=new URL(raw);}catch{throw new ApiError(503,'salesforce_not_configured');}
 if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||!u.hostname.endsWith('.salesforce.com')||u.hostname==='login.salesforce.com'||u.hostname==='test.salesforce.com')throw new ApiError(503,'salesforce_not_configured');
 return u.origin;
}
function settings(){
 const domain=process.env.SF_DOMAIN?.trim().replace(/\/$/,'');
 const id=process.env.SF_CLIENT_ID?.trim(),secret=process.env.SF_CLIENT_SECRET;
 if(!domain||!id||!secret)throw new ApiError(503,'salesforce_not_configured');
 return {domain:salesforceHost(domain),id,secret};
}
async function accessToken():Promise<Token>{
 const {domain,id,secret}=settings();
 let response:Response;
 try{response=await fetch(domain+'/services/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}),cache:'no-store',signal:AbortSignal.timeout(10000)});}
 catch{throw new ApiError(502,'salesforce_connection_failed');}
 if(!response.ok)throw new ApiError(502,'salesforce_oauth_failed');
 const token=await response.json() as Token;
 if(!token.access_token||!token.instance_url)throw new ApiError(502,'salesforce_oauth_failed');
 return {access_token:token.access_token,instance_url:salesforceHost(token.instance_url)};
}
export function objectName():string{
 const name=process.env.SF_RECORD_OBJECT||'AutoCare_Record__c';
 if(!/^[A-Za-z][A-Za-z0-9_]*__c$/.test(name))throw new ApiError(503,'invalid_salesforce_object_config');
 return name;
}
export async function sf(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,payload?:object):Promise<any>{
 if(!path.startsWith('/')||path.startsWith('//'))throw new ApiError(400,'invalid_sf_path');
 const token=await accessToken();
 let response:Response;
 try{response=await fetch(token.instance_url+'/services/data/'+API_VERSION+path,{method,headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});}
 catch{throw new ApiError(502,'salesforce_connection_failed');}
 if(!response.ok){
   if(response.status===404)throw new ApiError(404,'salesforce_record_not_found');
   if(response.status===400)throw new ApiError(422,'salesforce_schema_or_validation_error');
   throw new ApiError(502,'salesforce_request_failed');
 }
 if(response.status===204)return null;
 return response.json();
}
export function escapeSoql(value:string):string{return value.replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
export type StoredRow={Id:string;Record_Key__c:string;Record_Type__c:string;Owner_Auth_Id__c:string|null;Payload__c:string};
export async function queryRows(type:string,owner?:string,id?:string):Promise<StoredRow[]>{
 const table=objectName();
 let where="Record_Type__c = '"+escapeSoql(type)+"'";
 if(owner!==undefined)where+=" AND Owner_Auth_Id__c = '"+escapeSoql(owner)+"'";
 if(id)where+=" AND Record_Key__c = '"+escapeSoql(id)+"'";
 const query='SELECT Id, Record_Key__c, Record_Type__c, Owner_Auth_Id__c, Payload__c FROM '+table+' WHERE '+where+' ORDER BY CreatedDate DESC LIMIT 200';
 const data=await sf('GET','/query?q='+encodeURIComponent(query));
 return Array.isArray(data?.records)?data.records:[];
}
export async function insertRow(type:string,key:string,owner:string|null,data:Record<string,unknown>):Promise<void>{
 await sf('POST','/sobjects/'+objectName()+'/',{Record_Type__c:type,Record_Key__c:key,Owner_Auth_Id__c:owner,Payload__c:JSON.stringify(data)});
}
export async function patchRow(salesforceId:string,data:Record<string,unknown>):Promise<void>{
 if(!/^[a-zA-Z0-9]{15,18}$/.test(salesforceId))throw new ApiError(400,'invalid_sf_record_id');
 await sf('PATCH','/sobjects/'+objectName()+'/'+salesforceId,{Payload__c:JSON.stringify(data)});
}
export async function deleteRow(salesforceId:string):Promise<void>{
 if(!/^[a-zA-Z0-9]{15,18}$/.test(salesforceId))throw new ApiError(400,'invalid_sf_record_id');
 await sf('DELETE','/sobjects/'+objectName()+'/'+salesforceId);
}
