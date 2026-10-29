export type Role = 'customer' | 'technician' | 'manager' | 'supplier';
export type Resource = 'vehicle' | 'appointment' | 'repair' | 'estimate' | 'invoice' | 'notification' | 'job' | 'part' | 'parts_request' | 'purchase_order' | 'service_history';
export type Action = 'read' | 'create' | 'update' | 'delete';
export const resources: Resource[] = ['vehicle','appointment','repair','estimate','invoice','notification','job','part','parts_request','purchase_order','service_history'];
export const fields: Record<Resource, readonly string[]> = {
  vehicle:['make','model','year','plate','fuel','odometer','nickname','lastService'],
  appointment:['vehicleId','service','issue','date','time','status','created'],
  repair:['vehicleId','service','stage','update','date','completion'],
  estimate:['vehicleId','repair','date','status','total','lines'],
  invoice:['vehicleId','repair','date','total','paid','status'],
  notification:['title','body','time','read','page'],
  job:['repairId','technician','status','checklist','notes'],
  part:['name','sku','quantity','reorderAt','price'],
  parts_request:['repairId','partId','quantity','status','quote'],
  purchase_order:['requestId','status','date'],
  service_history:['vehicleId','date','service','detail','km','amount']
};
const abilities: Record<Role, Partial<Record<Resource, string>>> = {
  customer:{vehicle:'rcud',appointment:'rcu',repair:'r',estimate:'ru',invoice:'r',notification:'ru',service_history:'r'},
  technician:{vehicle:'r',appointment:'r',repair:'ru',estimate:'r',job:'ru',part:'r',parts_request:'rc',service_history:'r'},
  manager:{vehicle:'rcu',appointment:'rcu',repair:'rcu',estimate:'rcu',invoice:'rcu',notification:'rc',job:'rcu',part:'rcu',parts_request:'rcu',purchase_order:'rcu',service_history:'rcu'},
  supplier:{part:'rcu',parts_request:'ru',purchase_order:'ru'}
};
const flag: Record<Action,string>={read:'r',create:'c',update:'u',delete:'d'};
export function isResource(x:unknown):x is Resource{return typeof x==='string' && resources.includes(x as Resource);}
export function isRole(x:unknown):x is Role{return x==='customer'||x==='technician'||x==='manager'||x==='supplier';}
export function can(role:Role,type:Resource,action:Action):boolean{return (abilities[role][type]||'').includes(flag[action]);}
export function allowedTypes(role:Role,action:Action='read'):Resource[]{return resources.filter(r=>can(role,r,action));}
export function writableFields(role:Role,type:Resource,action:'create'|'update'):string[]{
  if(!can(role,type,action))return [];
  if(action==='create')return fields[type].filter(k=>!['paid','status'].includes(k));
  if(role==='customer'&&type==='appointment')return ['status'];
  if(role==='customer'&&type==='estimate')return ['status'];
  if(role==='customer'&&type==='notification')return ['read'];
  if(role==='technician'&&type==='repair')return ['stage','update','completion'];
  if(role==='technician'&&type==='job')return ['status','checklist','notes'];
  if(role==='supplier'&&type==='parts_request')return ['status','quote'];
  if(role==='supplier'&&type==='purchase_order')return ['status'];
  if(role==='manager'&&type==='appointment')return ['status','date','time'];
  if(role==='manager'&&type==='estimate')return ['lines','total'];
  if(role==='manager'&&type==='invoice')return [];
  if(role==='manager'&&type==='purchase_order')return ['status'];
  return fields[type].filter(k=>!['paid'].includes(k));
}
export function fieldsAllowed(role:Role,type:Resource,action:'create'|'update',keys:string[]):boolean{
 const allowed=writableFields(role,type,action);
 return keys.every(k=>allowed.includes(k));
}
export function validTransition(role:Role,type:Resource,before:Record<string,unknown>,patch:Record<string,unknown>):boolean{
 if(type==='appointment'&&'status' in patch){
   if(role==='customer')return ['Pending confirmation','Confirmed','Rescheduled'].includes(String(before.status))&&patch.status==='Cancelled';
   if(role==='manager')return ['Pending confirmation','Confirmed','Rescheduled'].includes(String(before.status))&&['Confirmed','Rescheduled','Cancelled','Completed'].includes(String(patch.status));
 }
 if(type==='estimate'&&'status' in patch)return role==='customer'&&before.status==='Awaiting approval'&&['Approved','Rejected'].includes(String(patch.status));
 if(type==='notification'&&'read' in patch)return role==='customer'&&patch.read===true;
 if(type==='parts_request'&&'status' in patch){
   if(role==='supplier')return before.status==='Requested'&&patch.status==='Quoted'&&typeof patch.quote==='number'&&patch.quote>0;
   if(role==='manager')return before.status==='Quoted'&&patch.status==='Ordered';
 }
 if(type==='purchase_order'&&'status' in patch){
   return (before.status==='Placed'&&patch.status==='Dispatched')||(before.status==='Dispatched'&&patch.status==='Delivered');
 }
 if(type==='repair'&&'stage' in patch){
   const stages=['Booking received','Appointment confirmed','Vehicle checked in','Inspection and diagnosis','Estimate awaiting approval','Repair in progress','Waiting for parts','Quality inspection','Ready for collection','Completed'];
   const old=stages.indexOf(String(before.stage)),next=stages.indexOf(String(patch.stage));
   return old>=0&&next>=0&&next>=old&&next<=old+1;
 }
 if(type==='job'&&'status' in patch){
   const states=['Assigned','In progress','Inspection complete','Quality passed'];
   const from=states.indexOf(String(before.status)),to=states.indexOf(String(patch.status));
   return from>=0&&to>=0&&to>=from&&to<=from+1;
 }
 return true;
}
export function validatePayload(type:Resource,value:unknown):value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!fields[type].includes(k)))return false;
 if(JSON.stringify(v).length>25000)return false;
 for(const [key,item] of Object.entries(v)){
   if(['quantity','reorderAt','odometer','total','paid','price','quote'].includes(key)&&(typeof item!=='number'||!Number.isFinite(item)||item<0))return false;
   if(['quantity','reorderAt','odometer'].includes(key)&&(typeof item!=='number'||!Number.isInteger(item)))return false;
   if(key==='lines'&&(!Array.isArray(item)||item.length>40||item.some((line:unknown)=>!line||typeof line!=='object'||typeof (line as any).label!=='string'||!Number.isFinite((line as any).amount)||((line as any).amount)<0)))return false;
   if(key==='checklist'&&(!Array.isArray(item)||item.length>20||item.some((b:unknown)=>typeof b!=='boolean')))return false;
   if(key!=='lines'&&key!=='checklist'&&!['quantity','reorderAt','odometer','total','paid','price','quote','read'].includes(key)&&typeof item!=='string')return false;
   if(key==='read'&&typeof item!=='boolean')return false;
   if(typeof item==='string'&&item.length>2000)return false;
 }
 return true;
}
