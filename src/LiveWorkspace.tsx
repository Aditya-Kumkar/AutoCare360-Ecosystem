import React, {useEffect,useState} from 'react';
import {Activity,ArrowLeft,ArrowRight,Bell,CalendarDays,CarFront,CheckCircle2,ClipboardList,Cloud,FileText,Gauge,LogOut,Menu,Package,Plus,RefreshCw,Search,ShieldCheck,Trash2,Truck,Wrench,X} from 'lucide-react';
import './live.css';
import {authErrorMessage,authErrorCode} from './authErrors';

type Role='customer'|'technician'|'manager'|'supplier';
type Resource='vehicle'|'appointment'|'repair'|'estimate'|'invoice'|'notification'|'job'|'part'|'parts_request'|'purchase_order'|'service_history';
type Item={id:string;type:Resource;ownerId:string|null;assignedTo:string|null;createdAt:string;data:Record<string,any>};
type Me={ok:boolean;user:{id:string;email:string;role:Role};readable:Resource[];creatable:Resource[];editable:Resource[];deletable:Resource[]};
type Field={key:string;label:string;kind?:'text'|'number'|'date'|'time'|'textarea'|'ref'|'json'|'status'|'boolean';ref?:Resource;required?:boolean;hint?:string};
type Session={access:string;refresh:string};
const labels:Record<Resource,string>={vehicle:'Vehicles',appointment:'Appointments',repair:'Repairs',estimate:'Estimates',invoice:'Invoices',notification:'Notifications',job:'Technician jobs',part:'Parts inventory',parts_request:'Parts requests',purchase_order:'Purchase orders',service_history:'Service history'};
const icons:Record<Resource,React.ElementType>={vehicle:CarFront,appointment:CalendarDays,repair:Wrench,estimate:ClipboardList,invoice:FileText,notification:Bell,job:Wrench,part:Package,parts_request:Package,purchase_order:Truck,service_history:Activity};
const specs:Record<Resource,Field[]>={
 vehicle:[{key:'make',label:'Manufacturer',required:true},{key:'model',label:'Model',required:true},{key:'year',label:'Year'},{key:'plate',label:'Registration number',required:true},{key:'fuel',label:'Fuel type'},{key:'odometer',label:'Odometer (km)',kind:'number'},{key:'nickname',label:'Vehicle nickname'},{key:'lastService',label:'Last service date'}],
 appointment:[{key:'vehicleId',label:'Vehicle',kind:'ref',ref:'vehicle',required:true},{key:'service',label:'Requested service',required:true},{key:'issue',label:'Describe the problem',kind:'textarea'},{key:'date',label:'Preferred date',kind:'date',required:true},{key:'time',label:'Preferred time',kind:'time',required:true},{key:'status',label:'Appointment status',kind:'status'}],
 repair:[{key:'vehicleId',label:'Vehicle',kind:'ref',ref:'vehicle',required:true},{key:'service',label:'Repair / service',required:true},{key:'technician',label:'Assigned technician user ID',hint:'The technician must have a registered Supabase account.'},{key:'date',label:'Opened date',kind:'date'},{key:'stage',label:'Repair stage',kind:'status'},{key:'update',label:'Workshop update',kind:'textarea'},{key:'completion',label:'Estimated completion'}],
 estimate:[{key:'vehicleId',label:'Vehicle',kind:'ref',ref:'vehicle',required:true},{key:'repair',label:'Repair order',kind:'ref',ref:'repair',required:true},{key:'date',label:'Estimate date',kind:'date'},{key:'total',label:'Estimate total (₹)',kind:'number',required:true},{key:'lines',label:'Line items (JSON array)',kind:'json',hint:'Example: [{"label":"Labour","amount":500}]'},{key:'status',label:'Approval status',kind:'status'}],
 invoice:[{key:'vehicleId',label:'Vehicle',kind:'ref',ref:'vehicle',required:true},{key:'repair',label:'Repair order',kind:'ref',ref:'repair',required:true},{key:'date',label:'Invoice date',kind:'date'},{key:'total',label:'Invoice total (₹)',kind:'number',required:true}],
 notification:[{key:'title',label:'Subject',required:true},{key:'body',label:'Message',kind:'textarea',required:true},{key:'time',label:'Time'},{key:'page',label:'Related page'},{key:'read',label:'Mark as read',kind:'boolean'}],
 job:[{key:'repairId',label:'Related repair',kind:'ref',ref:'repair',required:true},{key:'technician',label:'Technician user ID',required:true},{key:'status',label:'Job status',kind:'status'},{key:'checklist',label:'Checklist (JSON array of booleans)',kind:'json',hint:'Example: [false,false,false,false]'},{key:'notes',label:'Inspection notes',kind:'textarea'}],
 part:[{key:'name',label:'Part name',required:true},{key:'sku',label:'SKU',required:true},{key:'quantity',label:'Stock quantity',kind:'number',required:true},{key:'reorderAt',label:'Reorder threshold',kind:'number'},{key:'price',label:'Unit price (₹)',kind:'number'}],
 parts_request:[{key:'repairId',label:'Repair order',kind:'ref',ref:'repair',required:true},{key:'partId',label:'Required part',kind:'ref',ref:'part',required:true},{key:'quantity',label:'Quantity needed',kind:'number',required:true},{key:'status',label:'Request status',kind:'status'},{key:'quote',label:'Supplier quote (₹)',kind:'number'}],
 purchase_order:[{key:'requestId',label:'Parts request',kind:'ref',ref:'parts_request',required:true},{key:'date',label:'Order date',kind:'date'},{key:'status',label:'Delivery status',kind:'status'}],
 service_history:[{key:'vehicleId',label:'Vehicle',kind:'ref',ref:'vehicle',required:true},{key:'date',label:'Service date',kind:'date',required:true},{key:'service',label:'Service performed',required:true},{key:'detail',label:'Work completed',kind:'textarea'},{key:'km',label:'Odometer'},{key:'amount',label:'Cost'}]
};
const stages=['Booking received','Appointment confirmed','Vehicle checked in','Inspection and diagnosis','Estimate awaiting approval','Repair in progress','Waiting for parts','Quality inspection','Ready for collection','Completed'];
const jobStages=['Assigned','In progress','Inspection complete','Quality passed'];
const allTypes=Object.keys(labels) as Resource[];
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
const selfSignupEnabled=import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP==='true';
const sessionKey='autocare360-auth-session-v1';
const validConfig=()=>{try {const u=new URL(url||'');return u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')&&Boolean(key)}catch{return false}};
const cap=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
function shortTitle(item:Item){
 const d=item.data;
 return String(d.name||[d.make,d.model].filter(Boolean).join(' ')||d.service||d.title||d.sku||d.plate||d.status||d.stage||item.id.slice(0,8));
}
function detail(item:Item){
 const d=item.data;
 return [d.plate,d.issue,d.date,d.time,d.sku,d.status||d.stage,d.quantity===undefined?'':String(d.quantity)].filter(Boolean).join(' · ');
}
function numeric(value:any){return typeof value==='number'&&Number.isFinite(value)?'₹'+value.toLocaleString('en-IN'):null;}
function readableError(code:string){
 const human:Record<string,string>={invalid_record_or_relationship:'Check required fields, linked records and ownership.',customer_owner_required:'Select a customer user ID to save this record.',missing_or_invalid_reference:'Select a valid linked record first.',referenced_record_not_found:'This linked record was not found or is not accessible.',record_access_denied:'Your account does not have permission for this change.',invalid_record_fields:'One of the fields is invalid or cannot be modified.',database_not_configured:'Cloud database has not been configured.',invalid_record_transition:'This status transition is not allowed.',authentication_required:'Your session has expired. Please sign in again.'};
 return human[code]||code.replace(/_/g,' ');
}
function editableFields(role:Role,type:Resource):string[]{
 if(role==='customer'){
  if(type==='appointment'||type==='estimate')return ['status'];
  if(type==='notification')return ['read'];
 }
 if(role==='technician'){
  if(type==='repair')return ['stage','update','completion'];
  if(type==='job')return ['status','checklist','notes'];
 }
 if(role==='supplier'){
  if(type==='parts_request')return ['status','quote'];
  if(type==='purchase_order')return ['status'];
 }
 if(role==='manager'){
  if(type==='appointment')return ['date','time','status'];
  if(type==='estimate')return ['lines','total'];
  if(type==='invoice')return [];
  if(type==='purchase_order')return ['status'];
 }
 return specs[type].filter(f=>f.key!=='status'&&f.key!=='read').map(f=>f.key);
}
function statusChoices(type:Resource,role:Role,current:string):string[]{
 if(type==='appointment')return role==='customer'?['Cancelled']:['Confirmed','Rescheduled','Cancelled','Completed'];
 if(type==='estimate')return ['Approved','Rejected'];
 if(type==='repair'){const n=stages.indexOf(current);return n>=0&&n<stages.length-1?[stages[n+1]]:[]}
 if(type==='job'){const n=jobStages.indexOf(current);return n>=0&&n<jobStages.length-1?[jobStages[n+1]]:[]}
 if(type==='parts_request')return role==='supplier'?['Quoted']:['Ordered'];
 if(type==='purchase_order')return current==='Placed'?['Dispatched']:current==='Dispatched'?['Delivered']:[];
 return [];
}
async function authRequest(path:string,payload:object){
 const resp=await fetch(url+'/auth/v1/'+path,{method:'POST',headers:{apikey:key||'','Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await resp.json();
 if(!resp.ok){
  const err=new Error(authErrorMessage(data,resp.status));
  (err as Error & {authCode?:string}).authCode=authErrorCode(data,resp.status);
  throw err;
 }
 return data;
}
async function callApi(path:string,token:string,method='GET',body?:object){
 const resp=await fetch('/api/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await resp.json().catch(()=>({ok:false,error:'server_unavailable'}));
 if(!resp.ok||!data.ok)throw new Error(readableError(String(data.error||'server_error')));
 return data;
}
export default function LiveWorkspace({onBack}:{onBack:()=>void}){
 const [session,setSession]=useState<Session|null>(null);
 const [me,setMe]=useState<Me|null>(null);
 const [loginEmail,setLoginEmail]=useState('');
 const [password,setPassword]=useState('');
 const [register,setRegister]=useState(false);
 const [emailQuotaBlocked,setEmailQuotaBlocked]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [notice,setNotice]=useState('');
 const [rows,setRows]=useState<Partial<Record<Resource,Item[]>>>({});
 const [tab,setTab]=useState<Resource|'overview'>('overview');
 const [query,setQuery]=useState('');
 const [edit,setEdit]=useState<Item|null>(null);
 const [createType,setCreateType]=useState<Resource|null>(null);
 const [draft,setDraft]=useState<Record<string,any>>({});
 const [ownerId,setOwnerId]=useState('');
 const [menu,setMenu]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [updated,setUpdated]=useState('');
 const token=session?.access||'';
 async function refresh(resources:Resource[],auth=token){
  if(!auth)return;
  setBusy(true);
  try{
   // One authenticated read replaces a burst of up to eleven /auth/v1/user checks.
   const response=await callApi('records?type=all',auth);
   const gathered:Partial<Record<Resource,Item[]>>={};
   for(const type of resources)gathered[type]=[];
   for(const item of response.records as Item[]){
    if(resources.includes(item.type))gathered[item.type]?.push(item);
   }
   setRows(gathered);
   setMessage('');
   setUpdated(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
   setLoaded(true);
  }catch(err){setMessage(err instanceof Error?err.message:'Could not load cloud records');setLoaded(true)}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  let cancelled=false;
  const boot=async()=>{
   // Supabase redirects with an error fragment when a confirmation link is invalid.
   const hash=new URLSearchParams(window.location.hash.slice(1));
   const errorCode=hash.get('error_code')||hash.get('error');
   if(errorCode){
    const text=errorCode==='otp_expired'
     ?'The confirmation link is invalid or expired. Your account is not verified. Contact the project administrator to approve your account or configure email sending.'
     :'Authentication could not complete: '+errorCode.replace(/_/g,' ')+'.';
    setMessage(text);
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
    return;
   }
   const inlineAccess=hash.get('access_token');
   const inlineRefresh=hash.get('refresh_token');
   let stored:Session|null=null;
   try{const raw=sessionStorage.getItem(sessionKey);if(raw)stored=JSON.parse(raw) as Session;}catch{sessionStorage.removeItem(sessionKey);}
   if(!inlineAccess&&!stored)return;
   setBusy(true);
   try{
    let credentials:Session;
    if(inlineAccess&&inlineRefresh){
     credentials={access:inlineAccess,refresh:inlineRefresh};
    }else{
     // Refresh a tab-bound session rather than keeping an expired JWT.
     const refreshed=await authRequest('token?grant_type=refresh_token',{refresh_token:stored!.refresh});
     if(!refreshed.access_token)throw Error('Session expired. Sign in again.');
     credentials={access:refreshed.access_token,refresh:refreshed.refresh_token||''};
    }
    const account=await callApi('me',credentials.access);
    if(cancelled)return;
    sessionStorage.setItem(sessionKey,JSON.stringify(credentials));
    setSession(credentials);setMe(account as Me);setTab('overview');setMessage('');
    await refresh(account.readable,credentials.access);
   }catch(e){
    if(!cancelled){sessionStorage.removeItem(sessionKey);setMessage('A cloud session could not be restored. Sign in with an already confirmed account.');}
   }finally{if(!cancelled)setBusy(false)}
   if(inlineAccess)window.history.replaceState(null,'',window.location.pathname+window.location.search);
  };
  void boot();
  return()=>{cancelled=true};
 },[]);
 async function signin(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('');setNotice('');
  try {
   if(!validConfig())throw new Error('Supabase public configuration is missing. Contact the project administrator.');
   if(register){
    if(!selfSignupEnabled)throw new Error('Public account registration is paused until the administrator configures the email provider.');
    await authRequest('signup?redirect_to='+encodeURIComponent(window.location.origin+'/'),{email:loginEmail.trim(),password});
    setRegister(false);setPassword('');
    setNotice('Account requested. Please verify your email if required, then sign in. New users start with Customer access.');
    return;
   }
   const data=await authRequest('token?grant_type=password',{email:loginEmail.trim(),password});
   if(!data.access_token)throw new Error('No login session returned. Verify your email and try again.');
   const user=await callApi('me',data.access_token);
   const fresh={access:data.access_token,refresh:data.refresh_token||''};
   setSession(fresh);
   sessionStorage.setItem(sessionKey,JSON.stringify(fresh));
   setMe(user as Me);setTab('overview');setPassword('');setNotice('');
   await refresh(user.readable,data.access_token);
  }catch(err){
   if((err as {authCode?:string})?.authCode==='over_email_send_rate_limit')setEmailQuotaBlocked(true);
   setMessage(err instanceof Error?err.message:'Login failed');
  }
  finally{setBusy(false)}
 }
 async function resendConfirmation(){
  if(!selfSignupEnabled){setMessage('Email registration is paused until an SMTP provider is configured. Ask the administrator to approve a test account.');return;}
  if(!loginEmail.trim()||!loginEmail.includes('@')){setMessage('Enter your registered email address first.');return;}
  if(!validConfig()){setMessage('Auth configuration is missing.');return;}
  if(emailQuotaBlocked){setMessage('Email sending is blocked. A project administrator must configure SMTP before requesting another confirmation email.');return;}
  setBusy(true);setMessage('');setNotice('');
  try{
   await authRequest('resend?redirect_to='+encodeURIComponent(window.location.origin+'/'),
    {type:'signup',email:loginEmail.trim()});
   setNotice('A new confirmation email was requested. Open the newest email link once. If it redirects to localhost, the administrator must update Supabase Authentication → URL Configuration.');
  }catch(err){if((err as {authCode?:string})?.authCode==='over_email_send_rate_limit')setEmailQuotaBlocked(true);setMessage(err instanceof Error?err.message:'Unable to resend confirmation email')}
  finally{setBusy(false)}
 }
 async function signout(){
  if(session?.access)fetch(url+'/auth/v1/logout',{method:'POST',headers:{apikey:key||'',Authorization:'Bearer '+session.access}}).catch(()=>{});
  sessionStorage.removeItem(sessionKey);
  setSession(null);setMe(null);setRows({});setTab('overview');setDraft({});setEdit(null);setCreateType(null);setLoaded(false);setNotice('Signed out.');
 }
 function beginCreate(type:Resource){
  setTab(type);setCreateType(type);setEdit(null);setDraft({});setOwnerId('');setMessage('');
  window.scrollTo({top:0,behavior:'smooth'});
 }
 function beginEdit(item:Item){
  const keys=editableFields(me!.user.role,item.type);
  setTab(item.type);setEdit(item);setCreateType(null);
  setDraft(Object.fromEntries(keys.filter(k=>item.data[k]!==undefined).map(k=>[k,item.data[k]])));
  setMessage('');window.scrollTo({top:0,behavior:'smooth'});
 }
 function closeEditor(){setEdit(null);setCreateType(null);setDraft({});setOwnerId('')}
 async function save(e:React.FormEvent){
  e.preventDefault();if(!session||!me)return;
  const type=(edit?.type||createType)!;
  const input:Record<string,unknown>={};
  for(const f of specs[type]){
   if(!(f.key in draft))continue;
   let value=draft[f.key];
   if(value===''||value===undefined||value===null)continue;
   if(f.kind==='json'&&typeof value==='string'){
    try {value=JSON.parse(value)}catch{setMessage('Please enter valid JSON for '+f.label);return}
   }
   if(f.kind==='number'&&typeof value!=='number')value=Number(value);
   if(edit&&JSON.stringify(value)===JSON.stringify(edit.data[f.key]))continue;
   input[f.key]=value;
  }
  if(edit&&Object.keys(input).length===0){setNotice('No changes to save.');closeEditor();return}
  setBusy(true);setMessage('');
  try{
   await callApi('records?type='+type+(edit?'&id='+encodeURIComponent(edit.id):''),session.access,edit?'PATCH':'POST',
    edit?{data:input}:{data:input,...(me.user.role==='manager'&&ownerId?{ownerId}:{})});
   closeEditor();setNotice(edit?'Changes saved to the cloud.':'New record saved to the cloud.');
   await refresh(me.readable,session.access);
  }catch(err){setMessage(err instanceof Error?err.message:'Could not save record')}
  finally{setBusy(false)}
 }
 async function remove(item:Item){
  if(!session||!me||!window.confirm('Delete this vehicle? This cannot be undone.'))return;
  setBusy(true);setMessage('');
  try{
   await callApi('records?type='+item.type+'&id='+encodeURIComponent(item.id),session.access,'DELETE');
   setNotice('Vehicle deleted.');await refresh(me.readable,session.access);
  }catch(err){setMessage(err instanceof Error?err.message:'Unable to delete')}
  finally{setBusy(false)}
 }
 const role=me?.user.role||'customer';
 const allowedCreate=me?.creatable||[];
 const allowedEdit=me?.editable||[];
 const allowedDelete=me?.deletable||[];
 const current:Resource|null=tab==='overview'?null:tab;
 const currentRows=current?(rows[current]||[]).filter(item=>[shortTitle(item),detail(item),item.id].join(' ').toLowerCase().includes(query.toLowerCase())):[];
 const editorType=edit?.type||createType;
 const editorFields=editorType?(edit?specs[editorType].filter(f=>editableFields(role,editorType).includes(f.key)):specs[editorType].filter(f=>!['status','read'].includes(f.key))):[];
 const stats=(me?.readable||[]).filter(t=>t!=='notification').slice(0,4);
 function inputFor(f:Field){
  const raw=draft[f.key],value=raw??'';
  const set=(v:any)=>setDraft(p=>({...p,[f.key]:v}));
  if(f.kind==='ref'){
   const options=(rows[f.ref!]||[]).filter(x=>!ownerId||!x.ownerId||x.ownerId===ownerId);
   return <select required={f.required} value={String(value)} onChange={e=>set(e.target.value)}>
     <option value="">Select a saved {labels[f.ref!].toLowerCase().replace(/s$/,'')}</option>
     {options.map(x=><option key={x.id} value={x.id}>{shortTitle(x)} · {x.id.slice(0,8)}</option>)}
    </select>;
  }
  if(f.kind==='status'){
   const options=edit?statusChoices(editorType!,role,String(edit.data[f.key]||'')):[];
   return <select value={String(value)} onChange={e=>set(e.target.value)}><option value="">Choose next status</option>
    {options.map(x=><option key={x} value={x}>{x}</option>)}</select>;
  }
  if(f.kind==='boolean')return <label className="ac-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>set(e.target.checked)}/> Mark as read</label>;
  if(f.kind==='textarea'||f.kind==='json')return <textarea required={f.required} rows={f.kind==='json'?3:4}
   value={f.kind==='json'&&typeof value!=='string'?JSON.stringify(value,null,2):String(value)}
   onChange={e=>set(e.target.value)} placeholder={f.hint||f.label}/>;
  return <input type={f.kind==='number'?'number':f.kind==='date'?'date':f.kind==='time'?'time':'text'}
   required={f.required} min={f.kind==='number'?0:undefined} step={f.kind==='number'?'any':undefined}
   value={String(value)} onChange={e=>set(f.kind==='number'?e.target.value===''?'':Number(e.target.value):e.target.value)} placeholder={f.label}/>;
 }
 if(!me)return <div className="ac-auth-shell">
  <div className="ac-auth-brand"><div className="ac-mark"><CarFront size={26}/></div><strong>auto care<span>360</span></strong><small>REAL SERVICE MANAGEMENT</small></div>
  <main className="ac-auth-card">
   <button className="ac-auth-back" type="button" onClick={onBack}>← Return to dark workshop</button>
   <button type="button" className="ac-auth-return" onClick={onBack}>← Back to full dark-mode app</button>
   <div className="ac-auth-diagnostic" role="note">
    <strong>Verification email opens localhost or expires?</strong>
    This is a Supabase Auth redirect setting, not a working local app server. In Supabase Authentication → URL Configuration, set Site URL to the Vercel site, then request a new link only after email delivery is configured.
    <a href="https://supabase.com/dashboard/project/vxincycqpldqpdsacadk/auth/url-configuration" target="_blank" rel="noreferrer">Open Auth URL settings ↗</a>
   </div>
   <div className="ac-lock"><ShieldCheck size={27}/></div>
   <span className="ac-kicker">SECURE CLOUD WORKSPACE</span>
   <h1>{register?'Create your account':'Welcome to AutoCare360'}</h1>
   <p>Sign in to access actual workshop records. Your role and permissions come from your account, not from demo selections.</p>
   {!validConfig()?<div className="ac-alert">Supabase configuration is missing from this deployment.</div>:
    <form onSubmit={signin} className="ac-auth-form">
     <label>Email<input required type="email" autoComplete="username" placeholder="you@example.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/></label>
     <label>Password<input required type="password" autoComplete={register?'new-password':'current-password'} minLength={6} placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <button className="ac-primary" type="submit" disabled={busy||(register&&emailQuotaBlocked)}>{busy?'Please wait…':register?'Register account':'Sign in'} <ArrowRight size={18}/></button>
    </form>}
   {selfSignupEnabled&&<button className="ac-switch" onClick={()=>{setRegister(!register);setMessage('');setNotice('')}}>{register?'Already registered? Sign in':'New customer? Create an account'}</button>}
   {selfSignupEnabled&&!register&&<button className="ac-switch" disabled={busy||emailQuotaBlocked} onClick={resendConfirmation}>Email not confirmed? Request one verification email</button>}
   {!selfSignupEnabled&&<div className="ac-auth-bottom" role="note"><ShieldCheck size={17}/><span>Online registration is temporarily paused because Supabase's default email service is not configured for public registrations. Ask the project administrator to create an approved account under Supabase → Authentication → Users. Existing confirmed accounts can sign in normally. You can explore the complete dark workshop without an account.</span></div>}
   <div className="ac-auth-bottom" role="note"><ShieldCheck size={16}/><span>
    {emailQuotaBlocked?'Email registration is paused because the project email quota is exhausted. Your details were not registered by the failed request. Sign in only with an existing confirmed account. A project administrator must configure an SMTP provider for reliable email delivery.':
    'Email sign-up requires a confirmation message. If your email cannot be confirmed, use an administrator-created, auto-confirmed test user. Do not repeatedly register or resend while the project email quota is exhausted.'}
   </span></div>
   {message&&<div className="ac-alert" role="alert">{message}</div>}
   {notice&&<div className="ac-success" role="status">{notice}</div>}
   <div className="ac-auth-bottom"><ShieldCheck size={16}/><span>Customer access on registration. Technician, manager and supplier roles require administrator approval.</span></div>
  </main>
  <footer className="ac-auth-footer">AutoCare360 · Connected workshop records · No sample data</footer>
 </div>;
 return <div className="ac-app">
  <aside className={'ac-sidebar '+(menu?'ac-sidebar-open':'')}>
   <div className="ac-sidebar-brand"><div className="ac-mark"><CarFront size={20}/></div><strong>auto care<span>360</span></strong><button className="ac-close" onClick={()=>setMenu(false)}><X size={19}/></button></div>
   <div className="ac-workspace-label">{cap(role)} workspace</div>
   <nav className="ac-navigation">
    <button className={tab==='overview'?'current':''} onClick={()=>{setTab('overview');setMenu(false);closeEditor();}}><Gauge size={18}/> Overview</button>
    <div className="ac-nav-heading">YOUR RECORDS</div>
    {me.readable.map(t=>{const Icon=icons[t];return <button key={t} className={tab===t?'current':''} onClick={()=>{setTab(t);setMenu(false);closeEditor();setQuery('')}}><Icon size={18}/><span>{labels[t]}</span><i>{rows[t]?.length||0}</i></button>})}
   </nav>
   <div className="ac-sidebar-footer"><div className="ac-avatar">{me.user.email.slice(0,1).toUpperCase()}</div><div><strong>{me.user.email}</strong><small>{cap(role)} · verified login</small></div><button title="Sign out" onClick={signout}><LogOut size={18}/></button></div>
  </aside>
  {menu&&<div className="ac-shade" onClick={()=>setMenu(false)}/>}
  <main className="ac-content">
   <header className="ac-topbar"><button className="ac-mobile-button" onClick={()=>setMenu(true)}><Menu size={20}/></button><div><span>AutoCare360</span><b> / {current?labels[current]:'Overview'}</b></div><div className="ac-connected"><span/> Cloud records</div></header>
   <div className="ac-body">
    <div className="ac-heading"><div><div className="ac-kicker"><Cloud size={14}/> LIVE CLOUD WORKSPACE</div><h1>{current?labels[current]:cap(role)+' dashboard'}</h1><p>{current?'Actual records saved by authorised users. No sample entries.':'Your workshop activity from secure, persistent records.'}</p></div>
     <div className="ac-heading-actions"><button className="ac-secondary" disabled={busy} onClick={()=>refresh(me.readable)}><RefreshCw size={16}/> Refresh</button>
     {current&&allowedCreate.includes(current)&&<button className="ac-primary" disabled={busy} onClick={()=>beginCreate(current)}><Plus size={17}/> Add {labels[current].toLowerCase().replace(/s$/,'')}</button>}</div>
    </div>
    {notice&&<div className="ac-success ac-banner" role="status"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {message&&<div className="ac-alert ac-banner" role="alert">{message}<button onClick={()=>setMessage('')}><X size={15}/></button></div>}
    {!loaded&&busy?<div className="ac-empty">Loading your records…</div>:null}
    {!current&&!editorType&&<><div className="ac-stat-grid">{stats.map(t=>{const Icon=icons[t];return <button className="ac-stat" key={t} onClick={()=>setTab(t)}><div className="ac-stat-icon"><Icon size={21}/></div><small>{labels[t]}</small><strong>{rows[t]?.length||0}</strong><span>Saved records <ArrowRight size={14}/></span></button>})}</div>
     <section className="ac-panel"><div className="ac-panel-head"><div><h2>Recent activity</h2><p>Items are shown only when your account is permitted to view them.</p></div><span>Last refreshed {updated||'—'}</span></div>
      {allTypes.flatMap(t=>rows[t]||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8).length?
       <div className="ac-list">{allTypes.flatMap(t=>rows[t]||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8).map(r=>{const Icon=icons[r.type];return <button className="ac-list-item" key={r.id} onClick={()=>setTab(r.type)}><span className="ac-list-icon"><Icon size={19}/></span><div><strong>{shortTitle(r)}</strong><small>{labels[r.type]} · {detail(r)||new Date(r.createdAt).toLocaleDateString('en-IN')}</small></div><ArrowRight size={16}/></button>})}</div>:
       <div className="ac-empty"><Cloud size={30}/><h3>No saved records yet</h3><p>When customers book appointments or your workshop creates jobs, they will appear here automatically.</p>{allowedCreate.includes('vehicle')&&<button className="ac-primary" onClick={()=>beginCreate('vehicle')}><Plus size={16}/> Add your first vehicle</button>}</div>}
     </section>
     <div className="ac-help"><ShieldCheck size={21}/><div><strong>Authenticated access</strong><p>This dashboard does not use seeded or localStorage records. Changes are persisted in Supabase with database-enforced permissions. Salesforce synchronization is a separate integration step.</p></div></div>
    </>}
    {current&&!editorType&&<section className="ac-panel"><div className="ac-panel-head"><div><h2>{labels[current]}</h2><p>{rows[current]?.length||0} total accessible records</p></div><div className="ac-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records"/></div></div>
     {currentRows.length?<div className="ac-list">{currentRows.map(item=>{const Icon=icons[item.type];return <article className="ac-list-item" key={item.id}><span className="ac-list-icon"><Icon size={19}/></span><div className="ac-record-text"><strong>{shortTitle(item)}</strong><small>{detail(item)||new Date(item.createdAt).toLocaleDateString('en-IN')}</small><span className="ac-record-meta">Record {item.id.slice(0,8)} · {new Date(item.createdAt).toLocaleDateString('en-IN')}</span></div>
       {item.data.total!==undefined&&numeric(item.data.total)&&<span className="ac-amount">{numeric(item.data.total)}</span>}
       <div className="ac-record-actions">{allowedEdit.includes(item.type)&&editableFields(role,item.type).length>0&&<button onClick={()=>beginEdit(item)}>Update</button>}{allowedDelete.includes(item.type)&&<button title="Delete record" onClick={()=>remove(item)}><Trash2 size={16}/></button>}</div>
      </article>})}</div>:<div className="ac-empty"><Package size={30}/><h3>{query?'No matching records':'No '+labels[current].toLowerCase()+' yet'}</h3><p>{query?'Try a different search.':'Nothing is prefilled with sample data. Records will appear here once created.'}</p>
      {allowedCreate.includes(current)&&<button className="ac-primary" onClick={()=>beginCreate(current)}><Plus size={16}/> Create first record</button>}</div>}
    </section>}
    {editorType&&<section className="ac-panel ac-editor"><div className="ac-panel-head"><div><h2>{edit?'Update '+labels[editorType]:'Create '+labels[editorType]}</h2><p>{edit?'Only permitted fields can be changed.':'This will save a new record to the cloud.'}</p></div><button className="ac-secondary" onClick={closeEditor}><X size={16}/> Close</button></div>
      <form onSubmit={save}>
       {!edit&&role==='manager'&&['vehicle','appointment','repair','estimate','invoice','notification','service_history'].includes(editorType)&&
       <label className="ac-field ac-wide"><span>Customer account ID (required)</span><input required placeholder="Supabase customer UUID" value={ownerId} onChange={e=>setOwnerId(e.target.value)}/><small>The customer can copy their Account ID from their own workspace.</small></label>}
       <div className="ac-form-grid">{editorFields.map(f=><label key={f.key} className={'ac-field '+(['textarea','json'].includes(f.kind||'')?'ac-wide':'')}><span>{f.label}{f.required?' *':''}</span>{inputFor(f)}{f.hint&&<small>{f.hint}</small>}</label>)}</div>
       {editorType==='appointment'&&!edit&&!(rows.vehicle||[]).length&&<div className="ac-alert">Add a vehicle before requesting an appointment.</div>}
       {!editorFields.length?<p>You don't have editable fields for this record.</p>:<div className="ac-form-actions"><button type="button" className="ac-secondary" onClick={closeEditor}>Cancel</button><button type="submit" disabled={busy} className="ac-primary">{busy?'Saving…':edit?'Save changes':'Create record'} <ArrowRight size={16}/></button></div>}
      </form>
    </section>}
    <footer className="ac-content-footer"><span>AutoCare360 · Actual cloud records</span><span>Account ID: <button onClick={()=>navigator.clipboard?.writeText(me.user.id)} title="Copy your user ID">{me.user.id.slice(0,8)}… Copy</button></span></footer>
   </div>
  </main>
 </div>;
}
