import {allowedMethod,ApiError,handleError,parseBody,requireUser,send} from './_lib/auth';
import {can,fieldsAllowed,isResource,validTransition,validatePayload,type Resource,type Role} from './_lib/policy';
import {deleteRow,insertRow,patchRow,queryRows,type StoredRow} from './_lib/salesforce';

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Item={id:string;type:Resource;ownerId:string|null;data:Record<string,unknown>};
function fromRow(row:StoredRow):Item {
  let data:unknown;
  try{data=JSON.parse(row.Payload__c);}catch{throw new ApiError(502,'invalid_stored_record');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError(502,'invalid_stored_record');
  return {id:row.Record_Key__c,type:row.Record_Type__c as Resource,ownerId:row.Owner_Auth_Id__c,data:data as Record<string,unknown>};
}
async function list(type:Resource,role:Role,userId:string){
  const rows=await queryRows(type,role==='customer'?userId:undefined);
  if(role!=='technician')return rows.map(fromRow);
  // A technician must only see assigned jobs and their related records.
  const jobs=(type==='job'?rows:await queryRows('job')).map(fromRow).filter(j=>j.data.technician===userId);
  const assigned=new Set(jobs.map(j=>j.data.repairId));
  if(type==='job')return jobs;
  if(type==='repair'||type==='service_history'||type==='parts_request')return rows.map(fromRow).filter(r=>assigned.has(type==='repair'?r.id:r.data.repairId));
  if(type==='vehicle'||type==='appointment'||type==='estimate'){
    const repairs=(await queryRows('repair')).map(fromRow).filter(r=>assigned.has(r.id));
    const linkedVehicles=new Set(repairs.map(r=>r.data.vehicleId));
    if(type==='vehicle')return rows.map(fromRow).filter(r=>linkedVehicles.has(r.id));
    if(type==='estimate')return rows.map(fromRow).filter(r=>assigned.has(r.data.repair));
    return rows.map(fromRow).filter(r=>linkedVehicles.has(r.data.vehicleId));
  }
  return rows.map(fromRow);
}
async function requireReference(type:Resource,data:Record<string,unknown>,owner:string|null,role:Role,callerId:string){
  const rels:Partial<Record<Resource,{key:string;resource:Resource}[]>>={
    appointment:[{key:'vehicleId',resource:'vehicle'}],
    repair:[{key:'vehicleId',resource:'vehicle'}],
    estimate:[{key:'vehicleId',resource:'vehicle'},{key:'repair',resource:'repair'}],
    invoice:[{key:'vehicleId',resource:'vehicle'}],
    job:[{key:'repairId',resource:'repair'}],
    parts_request:[{key:'repairId',resource:'repair'},{key:'partId',resource:'part'}],
    purchase_order:[{key:'requestId',resource:'parts_request'}],
    service_history:[{key:'vehicleId',resource:'vehicle'}]
  };
  for(const r of rels[type]||[]){
    const id=data[r.key];
    if(typeof id!=='string'||!GUID.test(id))throw new ApiError(422,'invalid_relationship');
    const rows=await queryRows(r.resource,undefined,id);
    if(rows.length!==1)throw new ApiError(422,'referenced_record_not_found');
    const linked=fromRow(rows[0]);
    if(owner&&linked.ownerId&&linked.ownerId!==owner)throw new ApiError(403,'cross_customer_relationship_denied');
  }
  if(type==='estimate'||type==='invoice'){
    const linked=(await queryRows('repair',undefined,String(data.repair)))[0];
    if(linked&&fromRow(linked).data.vehicleId!==data.vehicleId)throw new ApiError(422,'repair_vehicle_mismatch');
  }
  if(role==='technician'&&(type==='parts_request'||type==='service_history')){
    const jobs=(await queryRows('job')).map(fromRow);
    if(!jobs.some(j=>j.data.repairId===data.repairId&&j.data.technician===callerId))throw new ApiError(403,'technician_assignment_required');
  }
}
export default async function handler(req:any,res:any){
  try{
    allowedMethod(req,['GET','POST','PATCH','DELETE']);
    const user=await requireUser(req);
    const type=req.query?.type;
    if(!isResource(type))throw new ApiError(400,'invalid_resource');
    const method=req.method as string;
    const action=method==='GET'?'read':method==='POST'?'create':method==='PATCH'?'update':'delete';
    if(!can(user.role,type,action))throw new ApiError(403,'role_not_permitted');
    if(method==='GET'){
      const items=await list(type,user.role,user.id);
      return send(res,200,{ok:true,resource:type,records:items});
    }
    const body=method==='DELETE'?{}:parseBody(req);
    if(method==='POST'){
      const ownerId=user.role==='customer'?user.id:body.ownerId===undefined?null:body.ownerId;
      if(ownerId!==null&&(typeof ownerId!=='string'||!GUID.test(ownerId)))throw new ApiError(400,'invalid_owner_id');
      if(user.role!=='manager'&&user.role!=='customer'&&ownerId!==null)throw new ApiError(403,'owner_not_permitted');
      const data=body.data;
      if(!validatePayload(type,data)||!fieldsAllowed(user.role,type,'create',Object.keys(data)))throw new ApiError(422,'invalid_record_fields');
      if(user.role==='customer'&&type==='appointment'&&String(data.status||'Pending confirmation')!=='Pending confirmation')throw new ApiError(422,'invalid_initial_status');
      if(user.role==='supplier'&&type==='part'&&Number(data.quantity||0)<0)throw new ApiError(422,'invalid_quantity');
      const normalized={...data};
      if(type==='appointment')normalized.status='Pending confirmation';
      if(type==='estimate')normalized.status='Awaiting approval';
      if(type==='invoice')normalized.status='Unpaid';
      if(type==='job')normalized.status='Assigned';
      if(type==='parts_request')normalized.status='Requested';
      if(type==='purchase_order')normalized.status='Placed';
      if(type==='repair')normalized.stage=normalized.stage||'Booking received';
      if(type==='notification')normalized.read=false;
      await requireReference(type,normalized,ownerId as string|null,user.role,user.id);
      const id=crypto.randomUUID();
      await insertRow(type,id,ownerId as string|null,normalized);
      return send(res,201,{ok:true,record:{id,type,ownerId,data:normalized}});
    }
    const recordId=req.query?.id;
    if(typeof recordId!=='string'||!GUID.test(recordId))throw new ApiError(400,'invalid_record_id');
    const rows=await queryRows(type,undefined,recordId);
    if(rows.length!==1)throw new ApiError(404,'record_not_found');
    const old=fromRow(rows[0]);
    if(user.role==='customer'&&old.ownerId!==user.id)throw new ApiError(404,'record_not_found');
    if(user.role==='technician'){
      const authorized=await list(type,'technician',user.id);
      if(!authorized.some(r=>r.id===old.id))throw new ApiError(403,'technician_assignment_required');
    }
    if(method==='DELETE'){
      if(user.role==='customer'&&type==='vehicle'){
        const appointments=await queryRows('appointment',user.id);
        if(appointments.some(r=>fromRow(r).data.vehicleId===old.id))throw new ApiError(409,'vehicle_has_appointments');
      }
      await deleteRow(rows[0].Id);
      return send(res,200,{ok:true,deleted:recordId});
    }
    const patch=body.data;
    if(!validatePayload(type,patch)||Object.keys(patch).length===0||!fieldsAllowed(user.role,type,'update',Object.keys(patch)))throw new ApiError(422,'invalid_record_fields');
    if(!validTransition(user.role,type,old.data,patch))throw new ApiError(409,'invalid_record_transition');
    // Do not allow updates to change customer ownership via relationship fields.
    if(Object.keys(patch).some(k=>['vehicleId','repairId','repair','partId','requestId'].includes(k)))throw new ApiError(403,'relationship_updates_forbidden');
    const updated={...old.data,...patch};
    await patchRow(rows[0].Id,updated);
    return send(res,200,{ok:true,record:{...old,data:updated}});
  }catch(e){handleError(res,e);}
}
