export type Role='Customer'|'Technician'|'Service Manager'|'Supplier';
export type Kind='vehicles'|'bookings'|'repairs'|'estimates'|'invoices'|'parts'|'requests'|'orders'|'jobs'|'history'|'alerts';
export type InputValue=string|number|boolean|string[]|{label:string;amount:number}[];
export type Data=Record<string,InputValue>;
export type Entry={id:string;kind:Kind;createdAt:string;updatedAt:string;data:Data};
export type Store={version:1;items:Entry[]};
export type Field={key:string;title:string;type?:'text'|'number'|'date'|'time'|'textarea'|'select'|'link'|'json';required?:boolean;options?:string[];target?:Kind;description?:string};
export const kinds:Kind[]=['vehicles','bookings','repairs','estimates','invoices','parts','requests','orders','jobs','history','alerts'];
export const roles:Role[]=['Customer','Technician','Service Manager','Supplier'];
export const sections:Record<Role,Kind[]>={
 Customer:['vehicles','bookings','repairs','estimates','invoices','history','alerts'],
 Technician:['jobs','repairs','requests','parts','history','alerts'],
 'Service Manager':['bookings','repairs','jobs','estimates','invoices','parts','requests','orders','history','alerts'],
 Supplier:['parts','requests','orders','alerts']
};
export const names:Record<Kind,string>={vehicles:'My vehicles',bookings:'Appointments',repairs:'Service tracking',estimates:'Estimates',invoices:'Invoices',parts:'Parts inventory',requests:'Parts requests',orders:'Purchase orders',jobs:'Technician jobs',history:'Service history',alerts:'Notifications'};
export const singular:Record<Kind,string>={vehicles:'Vehicle',bookings:'Appointment',repairs:'Repair',estimates:'Estimate',invoices:'Invoice',parts:'Part',requests:'Parts request',orders:'Purchase order',jobs:'Job',history:'Service entry',alerts:'Notification'};
export const categoryInfo:Record<Kind,string>={
 vehicles:'Register customer vehicles with odometer and registration details.',
 bookings:'Book workshop visits and manage appointment confirmations.',
 repairs:'Follow each repair through the workshop’s ten-stage process.',
 estimates:'Build itemised estimates and record customer approvals.',
 invoices:'Create bills and track payment status without processing real payments.',
 parts:'Monitor the spare parts catalogue, stock levels and reorder points.',
 requests:'Send workshop parts requests, obtain quotes and approve purchases.',
 orders:'Track supplier dispatch, deliveries and restocking.',
 jobs:'Assign technician tasks, record inspections and quality checks.',
 history:'Keep completed service and maintenance records.',
 alerts:'Review local notifications created by workshop actions.'
};
export const repairStages=['Booking received','Appointment confirmed','Vehicle checked in','Inspection and diagnosis','Estimate awaiting approval','Repair in progress','Waiting for parts','Quality inspection','Ready for collection','Completed'];
export const bookingStages=['Pending confirmation','Confirmed','Rescheduled','Cancelled','Completed'];
export const estimateStages=['Awaiting approval','Approved','Rejected'];
export const jobStages=['Assigned','In progress','Inspection complete','Quality passed'];
export const requestStages=['Requested','Quoted','Ordered'];
export const orderStages=['Placed','Dispatched','Delivered'];
export const invoiceStages=['Unpaid','Paid'];
export const statusStages:Partial<Record<Kind,string[]>>={bookings:bookingStages,repairs:repairStages,estimates:estimateStages,jobs:jobStages,requests:requestStages,orders:orderStages,invoices:invoiceStages};
export const fields:Record<Kind,Field[]>={
 vehicles:[
 {key:'make',title:'Manufacturer',required:true},{key:'model',title:'Model',required:true},{key:'year',title:'Model year',type:'number',required:true},{key:'plate',title:'Registration number',required:true},
 {key:'fuel',title:'Fuel type',type:'select',options:['Petrol','Diesel','Electric','Hybrid','CNG']},{key:'odometer',title:'Odometer (km)',type:'number'},{key:'nickname',title:'Vehicle nickname'}
 ],
 bookings:[
 {key:'vehicleId',title:'Vehicle',type:'link',target:'vehicles',required:true},{key:'service',title:'Service type',type:'select',options:['General servicing','Oil & filters','Brakes','Engine diagnosis','AC maintenance','Suspension','Tyres & alignment','Other'],required:true},
 {key:'issue',title:'Describe the issue',type:'textarea'},{key:'date',title:'Preferred date',type:'date',required:true},{key:'time',title:'Preferred time',type:'time',required:true}
 ],
 repairs:[
 {key:'vehicleId',title:'Vehicle',type:'link',target:'vehicles',required:true},{key:'bookingId',title:'Related appointment',type:'link',target:'bookings'},
 {key:'service',title:'Repair description',required:true},{key:'technician',title:'Technician name',required:true},{key:'date',title:'Date opened',type:'date',required:true},{key:'update',title:'Workshop notes',type:'textarea'}
 ],
 estimates:[
 {key:'vehicleId',title:'Vehicle',type:'link',target:'vehicles',required:true},{key:'repairId',title:'Linked repair',type:'link',target:'repairs',required:true},
 {key:'labour',title:'Labour charge (₹)',type:'number',required:true},{key:'partsCost',title:'Parts charge (₹)',type:'number',required:true},{key:'tax',title:'Tax / additional (₹)',type:'number'},
 {key:'notes',title:'Estimate description',type:'textarea'}
 ],
 invoices:[
 {key:'vehicleId',title:'Vehicle',type:'link',target:'vehicles',required:true},{key:'repairId',title:'Linked repair',type:'link',target:'repairs',required:true},
 {key:'total',title:'Total amount (₹)',type:'number',required:true},{key:'dueDate',title:'Due date',type:'date'},{key:'notes',title:'Invoice notes',type:'textarea'}
 ],
 parts:[
 {key:'name',title:'Part name',required:true},{key:'sku',title:'SKU / product code',required:true},{key:'quantity',title:'Quantity in stock',type:'number',required:true},
 {key:'reorderAt',title:'Reorder threshold',type:'number'},{key:'price',title:'Unit price (₹)',type:'number',required:true},{key:'supplier',title:'Supplier name'}
 ],
 requests:[
 {key:'repairId',title:'Related repair',type:'link',target:'repairs',required:true},{key:'partId',title:'Required part',type:'link',target:'parts',required:true},
 {key:'quantity',title:'Quantity needed',type:'number',required:true},{key:'notes',title:'Additional requirements',type:'textarea'}
 ],
 orders:[
 {key:'requestId',title:'Approved parts request',type:'link',target:'requests',required:true},{key:'supplier',title:'Supplier name',required:true},
 {key:'eta',title:'Expected delivery date',type:'date'}
 ],
 jobs:[
 {key:'repairId',title:'Linked repair',type:'link',target:'repairs',required:true},{key:'technician',title:'Assigned technician',required:true},
 {key:'notes',title:'Inspection / service notes',type:'textarea'}
 ],
 history:[
 {key:'vehicleId',title:'Vehicle',type:'link',target:'vehicles',required:true},{key:'date',title:'Service date',type:'date',required:true},{key:'service',title:'Work completed',required:true},
 {key:'detail',title:'Service description',type:'textarea'},{key:'km',title:'Odometer (km)',type:'number'},{key:'amount',title:'Total (₹)',type:'number'}
 ],
 alerts:[{key:'title',title:'Subject',required:true},{key:'body',title:'Message',type:'textarea',required:true}]
};
export const initialStore=():Store=>({version:1,items:[]});
export function isStore(value:unknown):value is Store{
 if(!value||typeof value!=='object')return false;
 const s=value as Partial<Store>;
 return s.version===1&&Array.isArray(s.items)&&s.items.every(x=>x&&typeof x.id==='string'&&kinds.includes(x.kind)&&typeof x.data==='object');
}
export const newId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
export function caption(item:Entry,items:Entry[]):string{
 const d=item.data,linked=(key:string)=>items.find(x=>x.id===d[key]);
 const vehicle=linked('vehicleId');
 const plate=vehicle?String(vehicle.data.plate||vehicle.data.model||'Vehicle'):'';
 switch(item.kind){
 case 'vehicles':return [d.make,d.model].filter(Boolean).join(' ')||'New vehicle';
 case 'bookings':return String(d.service||'Appointment')+(plate?' · '+plate:'');
 case 'repairs':return String(d.service||'Repair')+(plate?' · '+plate:'');
 case 'estimates':return 'Estimate for '+(plate||String(d.service||'vehicle'));
 case 'invoices':return 'Invoice for '+(plate||'repair');
 case 'parts':return String(d.name||'Spare part');
 case 'requests':return String(items.find(x=>x.id===d.partId)?.data.name||'Parts request');
 case 'orders':return 'Purchase order · '+String(d.supplier||'Supplier');
 case 'jobs':return String(d.technician||'Technician')+' · repair';
 case 'history':return String(d.service||'Maintenance')+(plate?' · '+plate:'');
 case 'alerts':return String(d.title||'Notification');
 }}
export function status(item:Entry):string{return String(item.data.status||item.data.stage||(item.kind==='vehicles'?'Registered':item.kind==='parts'?stockState(item):item.kind==='history'?'Completed':'New'));}
export function stockState(item:Entry){const have=Number(item.data.quantity||0),floor=Number(item.data.reorderAt||0);return have<=0?'Out of stock':have<=floor?'Low stock':'In stock'}
export function amount(item:Entry):number|null{
 if(item.kind==='estimates')return ['labour','partsCost','tax'].reduce((sum,key)=>sum+Number(item.data[key]||0),0);
 if(item.kind==='invoices')return Number(item.data.total||0);
 if(item.kind==='parts')return Number(item.data.price||0);
 if(item.kind==='requests')return item.data.quote===undefined?null:Number(item.data.quote);
 if(item.kind==='history')return Number(item.data.amount||0);
 return null;
}
export const money=(n:number)=>'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:0});
export function validation(kind:Kind,data:Data,items:Entry[],editingId?:string):string|null{
 for(const f of fields[kind]){
  if(f.required&&(data[f.key]===undefined||data[f.key]===''||data[f.key]===null))return f.title+' is required.';
  if(f.type==='number'&&data[f.key]!==undefined&&(!Number.isFinite(Number(data[f.key]))||Number(data[f.key])<0))return f.title+' must be a valid nonnegative number.';
  if(f.type==='link'&&data[f.key]&&(!items.find(x=>x.id===data[f.key]&&x.kind===f.target)))return f.title+' must reference an existing record.';
 }
 if(kind==='vehicles'&&items.some(x=>x.kind==='vehicles'&&x.id!==editingId&&String(x.data.plate).toLowerCase()===String(data.plate).toLowerCase()))return 'This vehicle registration number already exists.';
 if(kind==='parts'&&items.some(x=>x.kind==='parts'&&x.id!==editingId&&String(x.data.sku).toLowerCase()===String(data.sku).toLowerCase()))return 'This SKU already exists.';
 if(kind==='bookings'&&data.date&&String(data.date)<new Date().toLocaleDateString('en-CA'))return 'Choose a current or future appointment date.';
 if(['estimates','invoices'].includes(kind)){
  const repair=items.find(x=>x.id===data.repairId&&x.kind==='repairs');
  if(repair&&repair.data.vehicleId!==data.vehicleId)return 'The repair belongs to a different vehicle.';
 }
 if(kind==='requests'&&Number(data.quantity||0)<=0)return 'Requested quantity must be greater than zero.';
 if(kind==='orders'){
  const req=items.find(x=>x.id===data.requestId&&x.kind==='requests');
  if(req?.data.status!=='Ordered')return 'Approve the supplier quote before creating a purchase order.';
 }
 return null;
}
export function initialize(kind:Kind,provided:Data):Data{
 const d={...provided};
 if(kind==='bookings')d.status='Pending confirmation';
 if(kind==='repairs')d.stage='Booking received';
 if(kind==='estimates')d.status='Awaiting approval';
 if(kind==='invoices')d.status='Unpaid';
 if(kind==='requests')d.status='Requested';
 if(kind==='jobs'){d.status='Assigned';d.checklist=[false,false,false,false];}
 if(kind==='orders')d.status='Placed';
 if(kind==='alerts')d.read=false;
 return d;
}
export function addRecord(store:Store,kind:Kind,input:Data,id=newId(),now=new Date().toISOString()):Store{
 const error=validation(kind,input,store.items);
 if(error)throw new Error(error);
 return {version:1,items:[{kind,id,createdAt:now,updatedAt:now,data:initialize(kind,input)},...store.items]};
}
export function changeRecord(store:Store,id:string,patch:Data,now=new Date().toISOString()):Store{
 const current=store.items.find(x=>x.id===id);if(!current)throw new Error('Record not found.');
 const merged={...current.data,...patch};const err=validation(current.kind,merged,store.items,id);if(err)throw new Error(err);
 return {version:1,items:store.items.map(x=>x.id===id?{...x,updatedAt:now,data:merged}:x)};
}
export function removeRecord(store:Store,id:string):Store{
 if(store.items.some(x=>x.id!==id&&Object.values(x.data).includes(id)))throw new Error('This record is referenced by other workshop records and cannot be removed.');
 return {...store,items:store.items.filter(x=>x.id!==id)};
}
export function nextStatus(item:Entry,role:Role):string[]{
 const current=status(item);
 switch(item.kind){
 case 'bookings':return role==='Customer'?['Pending confirmation','Confirmed','Rescheduled'].includes(current)?['Cancelled']:[]:
 role==='Service Manager'?current==='Pending confirmation'?['Confirmed','Rescheduled','Cancelled']:current==='Confirmed'||current==='Rescheduled'?['Completed','Rescheduled','Cancelled']:[ ]:[];
 case 'repairs':{if(role!=='Technician'&&role!=='Service Manager')return [];const n=repairStages.indexOf(current);return n>=0&&n<repairStages.length-1?[repairStages[n+1]]:[];}
 case 'estimates':return role==='Customer'&&current==='Awaiting approval'?['Approved','Rejected']:[];
 case 'invoices':return role==='Service Manager'&&current==='Unpaid'?['Paid']:[];
 case 'jobs':{if(role!=='Technician'&&role!=='Service Manager')return [];const n=jobStages.indexOf(current);return n>=0&&n<jobStages.length-1?[jobStages[n+1]]:[];}
 case 'requests':return role==='Supplier'&&current==='Requested'?['Quoted']:role==='Service Manager'&&current==='Quoted'?['Ordered']:[];
 case 'orders':return role==='Supplier'&&current==='Placed'?['Dispatched']:role==='Supplier'&&current==='Dispatched'?['Delivered']:[];
 default:return [];
 }
}
export function addAlert(store:Store,title:string,body:string,now=new Date().toISOString()):Store{
 return {version:1,items:[{id:newId(),kind:'alerts',createdAt:now,updatedAt:now,data:{title,body,read:false}},...store.items]};
}
export function advance(store:Store,id:string,newStatus:string,role:Role,extras:Data={}):Store{
 const item=store.items.find(x=>x.id===id);if(!item)throw new Error('Record not found.');
 if(!nextStatus(item,role).includes(newStatus))throw new Error('That status transition is not permitted for this role.');
 if(item.kind==='requests'&&newStatus==='Quoted'&&!(typeof extras.quote==='number'&&extras.quote>0))throw new Error('A positive supplier quote is required.');
 const key=item.kind==='repairs'?'stage':'status';
 let next=changeRecord(store,id,{[key]:newStatus,...extras});
 next=addAlert(next,singular[item.kind]+' updated',caption(item,store.items)+' → '+newStatus);
 if(item.kind==='orders'&&newStatus==='Delivered'){
  const req=next.items.find(x=>x.id===item.data.requestId);
  const part=req&&next.items.find(x=>x.id===req.data.partId);
  if(part){next=changeRecord(next,part.id,{quantity:Number(part.data.quantity||0)+Number(req.data.quantity||0)});}
 }
 if(item.kind==='repairs'&&newStatus==='Completed'){
  const vehicle=next.items.find(x=>x.id===item.data.vehicleId);
  if(vehicle){
   next=addRecord(next,'history',{vehicleId:String(item.data.vehicleId),date:new Date().toISOString().slice(0,10),service:String(item.data.service||'Repair'),detail:String(item.data.update||'Repair completed'),km:Number(vehicle.data.odometer||0),amount:0});
  }
 }
 return next;
}
export function summary(items:Entry[]){
 const of=(kind:Kind)=>items.filter(x=>x.kind===kind);
 return {vehicles:of('vehicles').length,bookings:of('bookings').filter(x=>!['Completed','Cancelled'].includes(status(x))).length,repairs:of('repairs').filter(x=>status(x)!=='Completed').length,
 jobs:of('jobs').filter(x=>status(x)!=='Quality passed').length,parts:of('parts').length,lowStock:of('parts').filter(x=>stockState(x)!=='In stock').length,
 revenue:of('invoices').filter(x=>status(x)==='Paid').reduce((t,x)=>t+Number(x.data.total||0),0),
 pendingEstimates:of('estimates').filter(x=>status(x)==='Awaiting approval').length,orders:of('orders').filter(x=>status(x)!=='Delivered').length};
}
export const recent=(items:Entry[],limit=8)=>[...items].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,limit);
export const escapeCSV=(v:unknown)=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+\-@\t\r]/,'\u2019$&')+'"';
export function csvFor(items:Entry[],kind:Kind){
 const keys=['id','createdAt',...fields[kind].map(f=>f.key),'status'];
 const entries=items.filter(x=>x.kind===kind);
 return [keys.map(escapeCSV).join(','),...entries.map(e=>keys.map(k=>escapeCSV(k==='id'?e.id:k==='createdAt'?e.createdAt:k==='status'?status(e):e.data[k])).join(','))].join('\r\n');
}
