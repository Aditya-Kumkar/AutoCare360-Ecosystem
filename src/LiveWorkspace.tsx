import React,{useState} from 'react';
import {ArrowLeft,CheckCircle2,Cloud,LogOut,Plus,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import './live.css';
type Role='customer'|'technician'|'manager'|'supplier';
type Resource='vehicle'|'appointment'|'repair'|'estimate'|'invoice'|'notification'|'job'|'part'|'parts_request'|'purchase_order'|'service_history';
type User={id:string;email:string;role:Role};
type Item={id:string;type:Resource;ownerId:string|null;data:Record<string,unknown>};
type AuthData={access_token?:string;error_description?:string;msg?:string;user?:{email?:string}};
type Me={ok:boolean;user:User;readable:Resource[];creatable:Resource[];editable:Resource[];deletable:Resource[]};
const defaults:Record<Resource,Record<string,unknown>>={
 vehicle:{make:'Honda',model:'City',year:'2022',plate:'TN 09 AB 4421',fuel:'Petrol',odometer:28450,nickname:'Daily drive',lastService:'No service recorded'},
 appointment:{vehicleId:'PASTE-VEHICLE-UUID',service:'Routine maintenance',issue:'Scheduled service',date:'2026-11-01',time:'10:30 AM',created:'Today'},
 repair:{vehicleId:'PASTE-VEHICLE-UUID',service:'Inspection',stage:'Booking received',update:'Booking received.',date:'2026-11-01',completion:'To be assessed'},
 estimate:{vehicleId:'PASTE-VEHICLE-UUID',repair:'PASTE-REPAIR-UUID',date:'2026-11-01',total:1500,lines:[{label:'Labour',amount:1500}]},
 invoice:{vehicleId:'PASTE-VEHICLE-UUID',repair:'PASTE-REPAIR-UUID',date:'2026-11-01',total:1500,status:'Unpaid'},
 notification:{title:'Service update',body:'Your appointment is being reviewed.',time:'Just now',read:false,page:'Appointments'},
 job:{repairId:'PASTE-REPAIR-UUID',technician:'SUPABASE-USER-UUID',status:'Assigned',checklist:[false,false,false,false],notes:''},
 part:{name:'Oil filter',sku:'OIL-FLT-001',quantity:12,reorderAt:4,price:450},
 parts_request:{repairId:'PASTE-REPAIR-UUID',partId:'PASTE-PART-UUID',quantity:1,status:'Requested'},
 purchase_order:{requestId:'PASTE-REQUEST-UUID',status:'Placed',date:'2026-11-01'},
 service_history:{vehicleId:'PASTE-VEHICLE-UUID',date:'2026-11-01',service:'Oil change',detail:'Oil and filter replaced.',km:'28000',amount:'2500'}
};
const titles:Record<Resource,string>={vehicle:'Vehicles',appointment:'Appointments',repair:'Repair orders',estimate:'Estimates',invoice:'Invoices',notification:'Notifications',job:'Technician jobs',part:'Inventory parts',parts_request:'Parts requests',purchase_order:'Purchase orders',service_history:'Service history'};
const config={url:import.meta.env.VITE_SUPABASE_URL as string|undefined,key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined};
function configOkay(){try{const u=new URL(config.url||'');return u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')&&!!config.key;}catch{return false;}}
async function authRequest(path:string,body:object):Promise<AuthData>{
 const response=await fetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.key||'','Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json() as AuthData;
 if(!response.ok)throw Error(data.error_description||data.msg||'Authentication unsuccessful');
 return data;
}
export default function LiveWorkspace({onBack}:{onBack:()=>void}){
 const [accessToken,setAccessToken]=useState<string|null>(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [register,setRegister]=useState(false);
 const [me,setMe]=useState<Me|null>(null);
 const [kind,setKind]=useState<Resource>('vehicle'),[records,setRecords]=useState<Item[]>([]);
 const [body,setBody]=useState(JSON.stringify(defaults.vehicle,null,2)),[ownerId,setOwnerId]=useState('');
 const [editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [loading,setLoading]=useState(false);
 async function request(path:string,token:string,method:string='GET',data?:unknown){
   const response=await fetch('/api/'+path,{method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||'Request failed');
   return result;
 }
 async function load(type:Resource,token=accessToken){
  if(!token)return;
  setBusy(true);
  try{const data=await request('records?type='+type,token);setRecords(data.records);setKind(type);setBody(JSON.stringify(defaults[type],null,2));setEditing(null);setMessage('');}
  catch(e){setMessage(e instanceof Error?e.message:'Could not load records');}
  finally{setBusy(false);}
 }
 async function signIn(e:React.FormEvent){
   e.preventDefault();setLoading(true);setMessage('');
   try{
     if(!configOkay())throw Error('Configure public Supabase URL and publishable key on Vercel first.');
     const data=await authRequest(register?'signup':'token?grant_type=password',{email,password});
     setPassword('');
     if(register){setMessage('Account created. Confirm your email if required, then sign in. New accounts receive the customer role.');setRegister(false);return;}
     if(!data.access_token)throw Error('No session received. Verify your email before signing in.');
     const result=await request('me',data.access_token);
     setAccessToken(data.access_token);setMe(result as Me);
     if(result.readable.length)await load(result.readable[0],data.access_token);
   }catch(e){setMessage(e instanceof Error?e.message:'Authentication failed');}finally{setLoading(false);}
 }
 async function save(){
  if(!accessToken)return;
  let parsed:unknown;
  try{parsed=JSON.parse(body);}catch{setMessage('Record must be valid JSON.');return;}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)){setMessage('Record must be a JSON object.');return;}
  setBusy(true);
  try{
   const query='records?type='+kind+(editing?'&id='+encodeURIComponent(editing):'');
   const payload=editing?{data:parsed}:{data:parsed,...(me?.user.role==='manager'&&ownerId?{ownerId}:{})};
   await request(query,accessToken,editing?'PATCH':'POST',payload);
   await load(kind,accessToken);setMessage(editing?'Changes saved to Salesforce.':'Record created in Salesforce.');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}finally{setBusy(false);}
 }
 async function remove(id:string){
  if(!accessToken||!window.confirm('Delete this Salesforce record? This cannot be undone.'))return;
  setBusy(true);
  try{await request('records?type='+kind+'&id='+encodeURIComponent(id),accessToken,'DELETE');await load(kind,accessToken);setMessage('Record deleted.');}
  catch(e){setMessage(e instanceof Error?e.message:'Delete failed');}finally{setBusy(false);}
 }
 function edit(item:Item){setEditing(item.id);setBody(JSON.stringify(item.data,null,2));setOwnerId(item.ownerId||'');window.scrollTo({top:0,behavior:'smooth'});}
 return <div className="live-shell"><header className="live-header"><div><Cloud size={24}/><strong>AutoCare360 · Salesforce</strong><span>Protected cloud workspace</span></div><button onClick={()=>{setAccessToken(null);setMe(null);setRecords([]);onBack();}}><ArrowLeft size={16}/> Back to demo</button></header>
 <main className="live-main">
 {!me?<section className="live-auth"><ShieldCheck size={29}/><h1>{register?'Create customer account':'Secure sign in'}</h1><p>External Supabase Auth verifies your identity. The backend enforces access permissions before Salesforce reads or writes.</p>
 {!configOkay()?<div className="live-alert">Supabase public configuration is not present. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to Vercel and redeploy.</div>:<form onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete={register?'new-password':'current-password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={loading} type="submit">{loading?'Please wait…':register?'Create account':'Sign in'}</button></form>}
 <button className="live-text" onClick={()=>{setRegister(!register);setMessage('');}}>{register?'Have an account? Sign in':'Need a customer account? Register'}</button>
 <p className="live-fine">Staff and supplier roles must be assigned by a Supabase administrator in trusted app_metadata. Selecting a demo role never grants database access.</p></section>:
 <><section className="live-intro"><div><span className="live-eyebrow">AUTHENTICATED LIVE WORKSPACE</span><h1>{me.user.role.charAt(0).toUpperCase()+me.user.role.slice(1)} records</h1><p>{me.user.email} · Access enforced by Vercel API and Salesforce integration user</p></div><button onClick={()=>{setAccessToken(null);setMe(null);setRecords([]);}}><LogOut size={16}/> Sign out</button></section>
 <div className="live-tabs">{me.readable.map(t=><button key={t} className={kind===t?'active':''} onClick={()=>load(t)}>{titles[t]}</button>)}</div>
 <section className="live-panel"><div className="live-panel-heading"><h2>{titles[kind]}</h2><button onClick={()=>load(kind)} disabled={busy}><RefreshCw size={16}/> Refresh</button></div>
 <p>Records are stored in Salesforce, not localStorage. Relations use the generated record UUIDs shown below.</p>
 <div className="live-rows">{records.length===0?<p>No records found for this account and role.</p>:records.map(r=><div className="live-record" key={r.id}><div><strong>{String(r.data.name||r.data.make||r.data.title||r.data.service||r.data.sku||r.id)}</strong><small>{r.id}{r.ownerId&&me.user.role==='manager'?' · Owner '+r.ownerId:''}</small><pre>{JSON.stringify(r.data,null,2)}</pre></div><div>{me.editable.includes(kind)&&<button onClick={()=>edit(r)}>Edit</button>}{me.deletable.includes(kind)&&<button onClick={()=>remove(r.id)}><Trash2 size={15}/> Delete</button>}</div></div>)}</div></section>
 {(me.creatable.includes(kind)||me.editable.includes(kind)&&editing)&&<section className="live-panel"><h2>{editing?'Edit '+editing:'Create '+titles[kind].toLowerCase().replace(/s$/,'')+' record'}</h2><p>Provide only the allowed fields. The API will validate ownership and relationships, and reject unauthorised changes.</p>{!editing&&me.user.role==='manager'&&<label>Customer Supabase user ID (for customer-owned records)<input value={ownerId} onChange={e=>setOwnerId(e.target.value)} placeholder="UUID, or leave blank for shared record"/></label>}
 <label>JSON record fields<textarea spellCheck={false} rows={11} value={body} onChange={e=>setBody(e.target.value)}/></label><div className="live-actions"><button disabled={busy} onClick={save}><Plus size={16}/>{editing?'Save changes':'Create record'}</button>{editing&&<button onClick={()=>{setEditing(null);setBody(JSON.stringify(defaults[kind],null,2));}}>Cancel editing</button>}</div></section>}
 <p className="live-fine"><CheckCircle2 size={15}/> Live mode never bypasses backend authorization. Email/SMS delivery, payment collection, Salesforce Flows and approval processes require separate configuration and deployment.</p>
 </>}
 {message&&<div className="live-status" role="status">{message}<button onClick={()=>setMessage('')}>Dismiss</button></div>}
 </main></div>;
}
