import {allowedMethod,ApiError,handleError,parseBody,requireUser,send} from './_lib/auth';
import {allowedTypes,can,fieldsAllowed,isResource,validTransition,validatePayload,type Resource,type Role} from './_lib/policy';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOMER_TYPES=new Set<Resource>(['vehicle','appointment','repair','estimate','invoice','notification','service_history']);
type Item={id:string;type:Resource;ownerId:string|null;assignedTo:string|null;data:Record<string,unknown>;createdAt:string};
type Row={id:string;record_type:Resource;owner_id:string|null;assigned_to:string|null;data:Record<string,unknown>;created_at:string};
function mapRow(r:Row):Item {
 return {id:r.id,type:r.record_type,ownerId:r.owner_id,assignedTo:r.assigned_to,data:r.data,createdAt:r.created_at};
}
function config(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new ApiError(503,'database_not_configured');
 let parsed:URL;try{parsed=new URL(url);}catch{throw new ApiError(503,'database_not_configured');}
 if(parsed.protocol!=='https:'||parsed.pathname!=='/'||!parsed.hostname.endsWith('.supabase.co'))
  throw new ApiError(503,'database_not_configured');
 return {url:parsed.origin,key};
}
async function database(req:any,method:'GET'|'POST'|'PATCH'|'DELETE',query:string,body?:unknown):Promise<Row[]>{
 const {url,key}=config();
 const token=String(req.headers?.authorization||'');
 let response:Response;
 try {
  response=await fetch(url+'/rest/v1/autocare_records?'+query,{
   method,headers:{apikey:key,Authorization:token,Accept:'application/json',
    ...(body!==undefined?{'Content-Type':'application/json'}:{}),
    Prefer:'return=representation'},
   body:body!==undefined?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)
  });
 }catch{throw new ApiError(502,'database_unavailable');}
 if(!response.ok){
  if(response.status===401)throw new ApiError(401,'authentication_required');
  if(response.status===403)throw new ApiError(403,'record_access_denied');
  if(response.status===404)throw new ApiError(404,'record_not_found');
  if(response.status===400||response.status===409||response.status===422)
   throw new ApiError(422,'invalid_record_or_relationship');
  throw new ApiError(502,'database_request_failed');
 }
 if(response.status===204)return [];
 const rows=await response.json() as Row[];
 return Array.isArray(rows)?rows:[];
}
function filter(type:Resource,id?:string){
 return 'select=id,record_type,owner_id,assigned_to,data,created_at&record_type=eq.'+encodeURIComponent(type)
  +(id?'&id=eq.'+encodeURIComponent(id):'&order=created_at.desc&limit=200');
}
async function findOne(req:any,type:Resource,id:string):Promise<Item>{
 if(!UUID.test(id))throw new ApiError(422,'invalid_reference_id');
 const rows=await database(req,'GET',filter(type,id));
 if(rows.length!==1)throw new ApiError(404,'referenced_record_not_found');
 return mapRow(rows[0]);
}
async function references(req:any,type:Resource,data:Record<string,unknown>,ownerId:string|null){
 const requirements:Partial<Record<Resource,{field:string;kind:Resource}[]>>={
  appointment:[{field:'vehicleId',kind:'vehicle'}],
  repair:[{field:'vehicleId',kind:'vehicle'}],
  estimate:[{field:'vehicleId',kind:'vehicle'},{field:'repair',kind:'repair'}],
  invoice:[{field:'vehicleId',kind:'vehicle'},{field:'repair',kind:'repair'}],
  service_history:[{field:'vehicleId',kind:'vehicle'}],
  job:[{field:'repairId',kind:'repair'}],
  parts_request:[{field:'repairId',kind:'repair'},{field:'partId',kind:'part'}],
  purchase_order:[{field:'requestId',kind:'parts_request'}]
 };
 const linked=new Map<Resource,Item>();
 for(const r of requirements[type]||[]){
  const raw=data[r.field];
  if(typeof raw!=='string'||!UUID.test(raw))throw new ApiError(422,'missing_or_invalid_reference');
  const record=await findOne(req,r.kind,raw);
  if(ownerId&&record.ownerId&&record.ownerId!==ownerId)throw new ApiError(403,'cross_customer_relationship_denied');
  linked.set(r.kind,record);
 }
 if(['estimate','invoice'].includes(type)&&linked.has('repair')&&linked.get('repair')?.data.vehicleId!==data.vehicleId)
  throw new ApiError(422,'repair_vehicle_mismatch');
}
function initial(type:Resource,data:Record<string,unknown>):Record<string,unknown>{
 const copy={...data};
 if(type==='appointment')copy.status='Pending confirmation';
 if(type==='repair')copy.stage='Booking received';
 if(type==='estimate')copy.status='Awaiting approval';
 if(type==='invoice')copy.status='Unpaid';
 if(type==='job')copy.status='Assigned';
 if(type==='parts_request')copy.status='Requested';
 if(type==='purchase_order')copy.status='Placed';
 if(type==='notification')copy.read=false;
 return copy;
}
function assignee(type:Resource,data:Record<string,unknown>,role:Role,userId:string):string|null{
 if(type==='job'||type==='repair'){
  const tech=data.technician;
  if(tech===undefined||tech==='')return null;
  if(typeof tech!=='string'||!UUID.test(tech))throw new ApiError(422,'invalid_technician_id');
  return tech;
 }
 if(type==='parts_request'&&role==='technician')return userId;
 return null;
}
export default async function handler(req:any,res:any){
 try{
  allowedMethod(req,['GET','POST','PATCH','DELETE']);
  const user=await requireUser(req);
  const type=req.query?.type;
  if(type==='all'){
   if(req.method!=='GET')throw new ApiError(405,'method_not_allowed');
   // Apply both the application's role allowlist and Supabase row-level security.
   const readable=allowedTypes(user.role);
   const types=readable.join(',');
   const query='select=id,record_type,owner_id,assigned_to,data,created_at&record_type=in.('+types+')&order=created_at.desc&limit=1000';
   const results=await database(req,'GET',query);
   return send(res,200,{ok:true,records:results.map(mapRow),dataSource:'supabase',limitedTo:1000});
  }
  if(!isResource(type))throw new ApiError(400,'invalid_resource');
  const method=String(req.method);
  const action=method==='GET'?'read':method==='POST'?'create':method==='PATCH'?'update':'delete';
  if(!can(user.role,type,action))throw new ApiError(403,'role_not_permitted');
  if(method==='GET'){
   const rows=await database(req,'GET',filter(type));
   return send(res,200,{ok:true,resource:type,records:rows.map(mapRow),dataSource:'supabase'});
  }
  const id=req.query?.id;
  if(method!=='POST'&&(typeof id!=='string'||!UUID.test(id)))
   throw new ApiError(400,'invalid_record_id');
  if(method==='DELETE'){
   const old=await findOne(req,type,id);
   if(user.role==='customer'&&old.ownerId!==user.id)throw new ApiError(404,'record_not_found');
   const deleted=await database(req,'DELETE',filter(type,id));
   if(deleted.length!==1)throw new ApiError(403,'record_access_denied');
   return send(res,200,{ok:true,deleted:id});
  }
  const body=parseBody(req);
  if(method==='POST'){
   const ownerId=user.role==='customer'?user.id:(typeof body.ownerId==='string'?body.ownerId:null);
   if(ownerId!==null&&!UUID.test(ownerId))throw new ApiError(400,'invalid_owner_id');
   if(CUSTOMER_TYPES.has(type)&&!ownerId)throw new ApiError(422,'customer_owner_required');
   if(!CUSTOMER_TYPES.has(type)&&ownerId)throw new ApiError(422,'internal_record_must_not_have_owner');
   if(user.role!=='manager'&&user.role!=='customer'&&ownerId!==null)
    throw new ApiError(403,'owner_not_permitted');
   const raw=body.data;
   if(!validatePayload(type,raw)||!fieldsAllowed(user.role,type,'create',Object.keys(raw)))
    throw new ApiError(422,'invalid_record_fields');
   const data=initial(type,raw);
   await references(req,type,data,ownerId);
   const assignedTo=assignee(type,data,user.role,user.id);
   const rows=await database(req,'POST','select=id,record_type,owner_id,assigned_to,data,created_at',{
    record_type:type,owner_id:ownerId,assigned_to:assignedTo,created_by:user.id,data
   });
   if(rows.length!==1)throw new ApiError(502,'record_save_failed');
   return send(res,201,{ok:true,record:mapRow(rows[0]),dataSource:'supabase'});
  }
  const existing=await findOne(req,type,id);
  if(user.role==='customer'&&existing.ownerId!==user.id)throw new ApiError(404,'record_not_found');
  if(user.role==='technician'&&existing.assignedTo!==user.id)throw new ApiError(403,'assignment_required');
  const patch=body.data;
  if(!validatePayload(type,patch)||Object.keys(patch).length===0
   ||!fieldsAllowed(user.role,type,'update',Object.keys(patch)))
    throw new ApiError(422,'invalid_record_fields');
  if(Object.keys(patch).some(key=>['vehicleId','repairId','repair','partId','requestId'].includes(key)))
    throw new ApiError(403,'relationship_updates_forbidden');
  if(!validTransition(user.role,type,existing.data,patch))
    throw new ApiError(409,'invalid_record_transition');
  const data={...existing.data,...patch};
  const assignedTo=(type==='job'||type==='repair')?assignee(type,data,user.role,user.id):existing.assignedTo;
  const rows=await database(req,'PATCH',filter(type,id),{data,assigned_to:assignedTo});
  if(rows.length!==1)throw new ApiError(403,'record_update_denied');
  return send(res,200,{ok:true,record:mapRow(rows[0])});
 }catch(e){handleError(res,e);}
}
