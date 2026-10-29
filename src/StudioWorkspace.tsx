import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
 Activity,ArrowDownRight,ArrowRight,BarChart3,Bell,CalendarClock,CalendarDays,CarFront,
 Check,CheckCheck,CheckCircle2,ChevronDown,ChevronRight,ClipboardCheck,ClipboardList,Cloud,
 CreditCard,Download,ExternalLink,FileClock,FileText,Gauge,History,LayoutDashboard,
 LifeBuoy,LockKeyhole,Menu,MoreHorizontal,Package,PackageCheck,Pencil,Plus,
 Printer,RefreshCw,Search,Settings2,ShieldCheck,Sparkles,Trash2,TrendingUp,
 TriangleAlert,Truck,UserRound,Wrench,X
} from 'lucide-react';
import {
 addAlert,addRecord,advance,amount,caption,categoryInfo,changeRecord,csvFor,fields,
 initialStore,isStore,kinds,money,names,newId,nextStatus,recent,removeRecord,
 repairStages,roles,sections,singular,status,stockState,summary,validation,
 type Data,type Entry,type Field,type Kind,type Role,type Store
} from './studioModel';
import './studio.css';

const STORAGE='autocare360-dark-studio-v1';
const WORKSPACE_ID='AC360 / WORKSPACE';
const nowDate=()=>new Date().toISOString().slice(0,10);
function read():Store {
 try{const v=localStorage.getItem(STORAGE);if(!v)return initialStore();const parsed:unknown=JSON.parse(v);return isStore(parsed)?parsed:initialStore();}
 catch{return initialStore();}
}
const icons:Record<Kind,React.ElementType>={
 vehicles:CarFront,bookings:CalendarDays,repairs:Wrench,estimates:FileText,invoices:CreditCard,
 parts:Package,requests:ClipboardList,orders:Truck,jobs:ClipboardCheck,history:History,alerts:Bell
};
const roleIcons:Record<Role,React.ElementType>={Customer:CarFront,Technician:Wrench,'Service Manager':Gauge,Supplier:PackageCheck};
const roleIntro:Record<Role,string>={
 Customer:'Everything about your vehicle, in one place.',
 Technician:'Your workshop jobs and service progress.',
 'Service Manager':'A clear view of your entire workshop.',
 Supplier:'Keep spare parts moving, end to end.'
};
const roleKpis:Record<Role,[string,Kind| 'revenue'|'lowStock'|'pendingEstimates',string][]> = {
 Customer:[['My vehicles','vehicles','vehicles'],['Appointments','bookings','bookings'],['Active repairs','repairs','repairs'],['Pending estimates','pendingEstimates','estimates']],
 Technician:[['Active jobs','jobs','jobs'],['Repair orders','repairs','repairs'],['Parts requests','requests','requests'],['Parts in stock','parts','parts']],
 'Service Manager':[['Appointments','bookings','bookings'],['Active repairs','repairs','repairs'],['Low stock items','lowStock','parts'],['Paid invoices','revenue','invoices']],
 Supplier:[['Parts available','parts','parts'],['Incoming requests','requests','requests'],['Open purchase orders','orders','orders'],['Low stock items','lowStock','parts']]
};
const metricValue=(key:Kind|'revenue'|'lowStock'|'pendingEstimates',items:Entry[]):string=>{
 const m=summary(items);
 if(key==='revenue')return money(m.revenue);
 if(key==='lowStock')return String(m.lowStock);
 if(key==='pendingEstimates')return String(m.pendingEstimates);
 return String(items.filter(x=>x.kind===key).length);
};
const typeIcon=(kind:Kind)=>icons[kind];
const headline=(e:Entry,all:Entry[])=>caption(e,all);
const dateString=(v:string)=>{try{return new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}catch{return v}};
const secondary=(entry:Entry,items:Entry[])=>{
 const d=entry.data,vehicle=items.find(x=>x.id===d.vehicleId),part=items.find(x=>x.id===d.partId);
 if(entry.kind==='vehicles')return [d.plate,d.year,d.fuel].filter(Boolean).join(' · ');
 if(entry.kind==='parts')return [d.sku,Number(d.quantity||0)+' units',money(Number(d.price||0))].join(' · ');
 if(entry.kind==='bookings')return [d.date,d.time,String(vehicle?.data.plate||'')].filter(Boolean).join(' · ');
 if(entry.kind==='repairs')return [d.technician,vehicle?.data.plate].filter(Boolean).join(' · ');
 if(entry.kind==='jobs')return [d.technician,Number((d.checklist as boolean[]||[]).filter(Boolean).length)+'/4 checks done'].join(' · ');
 if(entry.kind==='requests')return [String(part?.data.name||'Part'),d.quantity+' units'].join(' · ');
 if(entry.kind==='invoices'||entry.kind==='estimates')return [String(vehicle?.data.plate||''),dateString(entry.createdAt)].filter(Boolean).join(' · ');
 if(entry.kind==='alerts')return String(d.body||'');
 if(entry.kind==='history')return [d.date,vehicle?.data.plate].filter(Boolean).join(' · ');
 return dateString(entry.createdAt);
};
const protectedKinds=new Set<Kind>(['vehicles','bookings','repairs','estimates','invoices','jobs','history','alerts']);
const allowCreate:Record<Role,Kind[]>={
 Customer:['vehicles','bookings'],
 Technician:['requests'],
 'Service Manager':['bookings','repairs','jobs','estimates','invoices','parts','requests','orders','history','alerts'],
 Supplier:['parts']
};
const allowEdit:Record<Role,Kind[]>={
 Customer:['vehicles','bookings'],
 Technician:['jobs','repairs'],
 'Service Manager':['vehicles','bookings','repairs','jobs','estimates','invoices','parts','requests','orders','history'],
 Supplier:['parts','requests','orders']
};
function badgeClass(label:string){
 const s=label.toLowerCase();
 if(/approved|confirmed|completed|quality passed|delivered|paid$|in stock|registered/.test(s))return 'good';
 if(/rejected|cancelled|out of stock|overdue/.test(s))return 'bad';
 if(/awaiting|pending|requested|low stock|quoted/.test(s))return 'amber';
 return 'neutral';
}
function SummaryIcon({kind,size=18}:{kind:Kind,size?:number}){const Icon=typeIcon(kind);return <Icon size={size}/>;}
function safeHTML(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function exportCSV(text:string,filename:string){
 const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function labelForField(field:Field,entry:Entry,items:Entry[]){
 if(field.type==='link'){
  const chosen=items.find(x=>x.id===entry.data[field.key]);
  return chosen?caption(chosen,items):'—';
 }
 const val=entry.data[field.key];return Array.isArray(val)?JSON.stringify(val):String(val??'—');
}

export default function StudioWorkspace(){
 const [store,setStore]=useState<Store>(read);
 const [role,setRole]=useState<Role>('Service Manager');
 const [page,setPage]=useState<Kind|'overview'|'reports'|'settings'|'help'>('overview');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [modal,setModal]=useState<{kind:Kind;item?:Entry}|null>(null);
 const [form,setForm]=useState<Data>({});
 const [detail,setDetail]=useState<Entry|null>(null);
 const [toast,setToast]=useState('');
 const [error,setError]=useState('');
 const [quote,setQuote]=useState('');
 const [showMenu,setShowMenu]=useState(false);
 const [roleMenu,setRoleMenu]=useState(false);
 const [importOpen,setImportOpen]=useState(false);
 const [confirmClear,setConfirmClear]=useState(false);
 const upload=useRef<HTMLInputElement>(null);
 const items=store.items,metrics=useMemo(()=>summary(items),[items]);
 const allSection=sections[role];
 useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(store))}catch{setError('Your browser storage is full or unavailable. Export your records before closing this tab.');}},[store]);
 useEffect(()=>{const onStorage=(e:StorageEvent)=>{if(e.key!==STORAGE||!e.newValue)return;try{const v=JSON.parse(e.newValue);if(isStore(v))setStore(v)}catch{}};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage)},[]);
 const showToast=(message:string)=>{setToast(message);setError('')};
 const showError=(err:unknown)=>{setError(err instanceof Error?err.message:String(err));setToast('')};
 const switchRole=(next:Role)=>{setRole(next);setPage('overview');setFilter('all');setSearch('');setModal(null);setDetail(null);setRoleMenu(false);setShowMenu(false);showToast('Switched to '+next+' workspace · same browser data')};
 const go=(next:typeof page)=>{setPage(next);setSearch('');setFilter('all');setShowMenu(false);setRoleMenu(false);setModal(null);setDetail(null)};
 const currentKind=kinds.includes(page as Kind)?page as Kind:null;
 const currentItems=useMemo(()=>items.filter(i=>i.kind===currentKind)
  .filter(i=>filter==='all'||status(i)===filter)
  .filter(i=>(headline(i,items)+' '+secondary(i,items)+' '+status(i)).toLowerCase().includes(search.toLowerCase()))
  .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[items,currentKind,filter,search]);
 const pageStatuses=useMemo(()=>currentKind?[...new Set(items.filter(x=>x.kind===currentKind).map(status))]:[],[items,currentKind]);
 function begin(kind:Kind,prefill:Data={}){
  setModal({kind});setDetail(null);
  setForm({date:nowDate(),time:'10:00',year:new Date().getFullYear(),...prefill});
  setError('');
 }
 function edit(entry:Entry){setModal({kind:entry.kind,item:entry});setDetail(null);setForm({...entry.data});setError('');}
 function save(e:React.FormEvent){
  e.preventDefault();if(!modal)return;
  try{
   const input:Data={};
   for(const field of fields[modal.kind]){
    const val=form[field.key];
    if(val!==undefined&&val!==''&&val!==null)input[field.key]=field.type==='number'?Number(val):val;
   }
   if(modal.item){
    const updated=changeRecord(store,modal.item.id,input);
    setStore(updated);showToast(singular[modal.kind]+' updated.');
   }else{
    const createdId=newId();
    let updated=addRecord(store,modal.kind,input,createdId);
    if(modal.kind!=='alerts')updated=addAlert(updated,singular[modal.kind]+' created',String(input.service||input.name||input.title||input.plate||singular[modal.kind])+' was added to the browser workspace.');
    setStore(updated);showToast(singular[modal.kind]+' created and saved on this device.');
   }
   setModal(null);setForm({});
  }catch(ex){showError(ex)}
 }
 function statusAction(entry:Entry,newStatus:string){
  try{
   const extra:Data={};
   if(entry.kind==='requests'&&newStatus==='Quoted'){
    const n=Number(quote||0);if(!Number.isFinite(n)||n<=0)throw Error('Enter a positive quote amount before submitting.');
    extra.quote=n;
   }
   const updated=advance(store,entry.id,newStatus,role,extra);
   setStore(updated);
   setDetail(null);setQuote('');showToast(singular[entry.kind]+' moved to '+newStatus+'.');
  }catch(ex){showError(ex)}
 }
 function remove(entry:Entry){
  if(!window.confirm('Remove '+headline(entry,items)+'? You cannot undo this action.'))return;
  try{setStore(removeRecord(store,entry.id));setDetail(null);showToast('Record removed from this browser.')}catch(ex){showError(ex)}
 }
 const filteredRecent=useMemo(()=>recent(items.filter(x=>allSection.includes(x.kind)),7),[items,allSection]);
 const statusData=useMemo(()=>[
  {label:'Pending',value:items.filter(x=>x.kind==='bookings'&&status(x)==='Pending confirmation').length},
  {label:'Confirmed',value:items.filter(x=>x.kind==='bookings'&&status(x)==='Confirmed').length},
  {label:'Active repairs',value:metrics.repairs},
  {label:'Completed',value:items.filter(x=>x.kind==='repairs'&&status(x)==='Completed').length},
 ],[items,metrics.repairs]);
 const chartMax=Math.max(1,...statusData.map(x=>x.value));
 const lowStock=items.filter(x=>x.kind==='parts'&&stockState(x)!=='In stock');
 const canMake=(kind:Kind)=>allowCreate[role].includes(kind);
 const canEdit=(kind:Kind)=>allowEdit[role].includes(kind);
 const missingDeps=(kind:Kind)=>fields[kind].filter(f=>f.required&&f.type==='link'&&!items.some(x=>x.kind===f.target));
 function maybeCreate(kind:Kind){
  const missing=missingDeps(kind);
  if(missing.length){const first=missing[0];setError('Create '+names[first.target!]+' before creating '+singular[kind].toLowerCase()+'.');if(canMake(first.target!))begin(first.target!);return}
  begin(kind);
 }
 function download(kind:Kind){exportCSV(csvFor(items,kind),'autocare360-'+kind+'-'+nowDate()+'.csv');showToast(names[kind]+' exported as CSV.')}
 function backup(){const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='autocare360-browser-backup-'+nowDate()+'.json';a.click();URL.revokeObjectURL(url);showToast('Full browser workspace backup saved.')}
 function importBackup(file:File|undefined){
  if(!file)return;if(file.size>4_000_000){showError('Backup file must be under 4MB.');return}
  file.text().then(s=>{try{const data:unknown=JSON.parse(s);if(!isStore(data))throw Error('Not a compatible AutoCare360 backup.');if(!window.confirm('Import this backup? It will replace your current browser records.'))return;setStore(data);setImportOpen(false);showToast('Browser workspace backup imported.')}catch(ex){showError(ex)}}).catch(showError);
 }
 function invoicePrint(entry:Entry){
  if(entry.kind!=='invoices')return;
  const vehicle=items.find(x=>x.id===entry.data.vehicleId);
  const repair=items.find(x=>x.id===entry.data.repairId);
  const date=dateString(entry.createdAt);
  const markup='<!doctype html><html><head><title>AutoCare360 invoice</title><style>body{font:15px Arial,sans-serif;max-width:730px;margin:50px auto;color:#182c39}h1{margin:0;color:#11695c}header{display:flex;justify-content:space-between;border-bottom:2px solid #b9d8d2;padding-bottom:25px}section{padding:30px 0}dl{display:grid;grid-template-columns:1fr 1fr;gap:14px}dt{font-size:12px;color:#687b85}dd{font-weight:700;margin:5px 0 0}.total{font-size:30px;text-align:right;border-top:1px solid #ddd;padding:22px 0}footer{font-size:11px;color:#84939b}button{display:none}@media print{body{margin:30px}}</style></head><body><header><div><h1>AutoCare360</h1><p>WORKSHOP INVOICE · BROWSER PREVIEW</p></div><div>'+safeHTML(entry.id.slice(0,8).toUpperCase())+'</div></header><section><dl><div><dt>Created</dt><dd>'+safeHTML(date)+'</dd></div><div><dt>Status</dt><dd>'+safeHTML(status(entry))+'</dd></div><div><dt>Vehicle</dt><dd>'+safeHTML(String(vehicle?.data.plate||'—'))+'</dd></div><div><dt>Service</dt><dd>'+safeHTML(String(repair?.data.service||'—'))+'</dd></div></dl></section><div class="total">'+safeHTML(money(Number(entry.data.total||0)))+'</div><footer>Browser-generated preview. Not a fiscal invoice or payment receipt.</footer><script>window.print();<\/script></body></html>';
  const win=window.open('','_blank');if(!win){showError('Please allow popups to print the invoice.');return}win.document.open();win.document.write(markup);win.document.close();
 }
 const roleIcon=roleIcons[role],RoleIcon=roleIcon;
 const quick:Kind[]=role==='Customer'?['vehicles','bookings']:role==='Technician'?['requests','jobs']:role==='Supplier'?['parts','requests']:['bookings','repairs','estimates','parts'];
 const safeQuick=quick.filter(canMake);
 return <div className="studio-root">
  <aside className={'studio-sidebar '+(showMenu?'is-open':'')}>
   <button className="studio-brand" onClick={()=>go('overview')} aria-label="AutoCare360 home"><span className="studio-brand-mark"><Gauge size={22}/></span><span><strong>autocare<span>360</span></strong><small>WORKSHOP OPERATING SYSTEM</small></span></button>
   <div className="studio-divider"/>
   <div className="studio-workspace"><div className="studio-workspace-label">CURRENT WORKSPACE</div><button className="studio-role-select" onClick={()=>setRoleMenu(!roleMenu)} aria-expanded={roleMenu}><span className="studio-role-avatar"><RoleIcon size={19}/></span><span><strong>{role}</strong><small>Browser sandbox</small></span><ChevronDown size={16}/></button>
    {roleMenu&&<div className="studio-role-menu">{roles.map(r=>{const Icon=roleIcons[r];return <button key={r} className={role===r?'active':''} onClick={()=>switchRole(r)}><Icon size={16}/><span>{r}</span>{r===role&&<Check size={15}/>}</button>})}</div>}
   </div>
   <nav className="studio-nav" aria-label="Main navigation">
    <div className="studio-nav-heading">WORKSPACE</div>
    <button className={page==='overview'?'active':''} onClick={()=>go('overview')}><LayoutDashboard size={18}/><span>Overview</span></button>
    <div className="studio-nav-heading">OPERATIONS</div>
    {allSection.map(kind=>{const Icon=icons[kind],n=items.filter(x=>x.kind===kind).length;return <button className={page===kind?'active':''} key={kind} onClick={()=>go(kind)}><Icon size={18}/><span>{names[kind]}</span>{n>0&&<em>{n}</em>}</button>})}
    <div className="studio-nav-heading">TOOLS</div>
    <button className={page==='reports'?'active':''} onClick={()=>go('reports')}><BarChart3 size={18}/><span>Reports</span></button>
    <button className={page==='settings'?'active':''} onClick={()=>go('settings')}><Settings2 size={18}/><span>Settings</span></button>
    <button className={page==='help'?'active':''} onClick={()=>go('help')}><LifeBuoy size={18}/><span>Help & guide</span></button>
   </nav>
   <div className="studio-sidebar-bottom">
    <div className="studio-sandbox-sign"><span className="studio-pulse"/><span><strong>Local sandbox active</strong><small>Private to this browser</small></span></div>
    <a href="/?login=1" className="studio-cloud-link"><Cloud size={17}/> Switch to cloud sign-in <ArrowRight size={15}/></a>
   </div>
  </aside>
  {showMenu&&<div className="studio-backdrop" onClick={()=>setShowMenu(false)}/>}
  <main className="studio-main">
   <header className="studio-topbar">
    <button className="studio-mobile-menu" onClick={()=>setShowMenu(true)} aria-label="Open navigation"><Menu size={21}/></button>
    <div className="studio-breadcrumb"><span>AutoCare360</span><ChevronRight size={15}/><strong>{page==='overview'?'Dashboard':currentKind?names[currentKind]:page.charAt(0).toUpperCase()+page.slice(1)}</strong></div>
    <div className="studio-topbar-right">
     <span className="studio-mode-tag"><span/> BROWSER MODE</span>
     <button className="studio-head-icon" title="Notifications" onClick={()=>go('alerts')}><Bell size={19}/>{items.filter(x=>x.kind==='alerts'&&x.data.read!==true).length>0&&<i/>}</button>
     <a href="/?login=1" className="studio-head-login"><LockKeyhole size={15}/> Cloud sign-in</a>
     <span className="studio-user-avatar" title="Local workshop sandbox">AC</span>
    </div>
   </header>
   <div className="studio-body">
    {toast&&<div className="studio-toast success" role="status"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={()=>setToast('')}><X size={16}/></button></div>}
    {error&&<div className="studio-toast error" role="alert"><TriangleAlert size={17}/><span>{error}</span><button onClick={()=>setError('')}><X size={16}/></button></div>}
    <div className="studio-page-title"><div><div className="studio-overline"><span/> AUTOCARE360 / {role.toUpperCase()}</div><h1>{page==='overview'?role==='Customer'?'Welcome to your garage':role==='Technician'?'Technician workspace':role==='Supplier'?'Supplier portal':'Workshop overview':currentKind?names[currentKind]:page==='reports'?'Operational reports':page==='settings'?'Workspace settings':'Help & support'}</h1><p>{page==='overview'?roleIntro[role]:currentKind?categoryInfo[currentKind]:page==='reports'?'KPIs and trends are calculated only from records you create.':page==='settings'?'Manage this browser-based workshop workspace.':'Find your way around AutoCare360.'}</p></div><div className="studio-title-buttons">
     {currentKind&&<button className="studio-btn ghost" onClick={()=>download(currentKind)}><Download size={16}/> Export CSV</button>}
     {currentKind&&canMake(currentKind)&&<button className="studio-btn primary" onClick={()=>maybeCreate(currentKind)}><Plus size={17}/> New {singular[currentKind].toLowerCase()}</button>}
     {page==='overview'&&safeQuick.length>0&&<button className="studio-btn primary" onClick={()=>maybeCreate(safeQuick[0])}><Plus size={17}/> New {singular[safeQuick[0]].toLowerCase()}</button>}
    </div></div>
    <div className="studio-disclaimer"><ShieldCheck size={19}/><span><strong>Working browser workspace.</strong> You can create and manage records across all four roles with no email verification. Data is saved on this device only—not synced to Salesforce or Supabase. Use <a href="/?login=1">cloud sign-in</a> for authenticated records.</span></div>
    {page==='overview'&&<>
     <div className="studio-kpi-grid">{roleKpis[role].map(([label,key,target],idx)=>{const Icon=[CarFront,CalendarClock,Wrench,TrendingUp][idx];const value=metricValue(key,items);return <button className="studio-kpi" key={label} onClick={()=>go(target as Kind)}><div className="studio-kpi-row"><span className={'studio-kpi-icon tint'+idx}><Icon size={20}/></span><span className="studio-kpi-arrow"><ArrowRight size={16}/></span></div><small>{label}</small><strong>{value}</strong><span>View {names[target as Kind].toLowerCase()} <ArrowRight size={13}/></span></button>})}</div>
     <div className="studio-overview-row">
      <section className="studio-panel studio-activity-panel"><div className="studio-panel-heading"><div><h2>Recent activity</h2><p>Your latest workshop records, not preset demo entries.</p></div><span className="studio-meta">Updated locally</span></div>
       {filteredRecent.length?<div className="studio-activity-list">{filteredRecent.map(x=>{const Icon=icons[x.kind];return <button key={x.id} className="studio-activity-item" onClick={()=>{go(x.kind);setDetail(x)}}><span className="studio-activity-icon"><Icon size={18}/></span><span><strong>{headline(x,items)}</strong><small>{names[x.kind]} · {dateString(x.updatedAt)}</small></span><ChevronRight size={17}/></button>})}</div>:
       <div className="studio-empty compact"><span className="studio-empty-icon"><Activity size={23}/></span><h3>No activity yet</h3><p>Create your first record to start the workshop. Your changes will appear here automatically.</p><button className="studio-btn primary" onClick={()=>switchRole('Customer')}><CarFront size={16}/> Start with a vehicle</button></div>}
      </section>
      <section className="studio-panel studio-chart-panel"><div className="studio-panel-heading"><div><h2>Workshop pulse</h2><p>Live totals from your browser records.</p></div><BarChart3 size={19}/></div>
       <div className="studio-chart">{statusData.map((x,i)=><div className="studio-chart-col" key={x.label}><span className="studio-bar-value">{x.value}</span><div className="studio-bar-track"><div className={'studio-bar-fill bar'+i} style={{height:(x.value?Math.max(14,(x.value/chartMax)*100):0)+'%'}}/></div><span className="studio-bar-label">{x.label}</span></div>)}</div>
       <div className="studio-chart-footer"><span><span className="studio-dot"/> Real entries only</span><button onClick={()=>go('reports')}>Open reports <ArrowRight size={14}/></button></div>
      </section>
     </div>
     <div className="studio-overview-row bottom">
      <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Quick actions</h2><p>Move your workflow forward.</p></div></div><div className="studio-quick-grid">{safeQuick.map(kind=>{const Icon=icons[kind];return <button key={kind} className="studio-quick-item" onClick={()=>maybeCreate(kind)}><span><Icon size={18}/></span><strong>{singular[kind]}</strong><Plus size={16}/></button>})}{role==='Technician'&&<button className="studio-quick-item" onClick={()=>go('jobs')}><span><ClipboardCheck size={18}/></span><strong>Update a job</strong><ArrowRight size={16}/></button>}</div></section>
      <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Inventory watch</h2><p>Spare parts requiring attention.</p></div></div>{lowStock.length?<div className="studio-stock-list">{lowStock.slice(0,5).map(x=><button key={x.id} onClick={()=>{go('parts');setDetail(x)}}><span><Package size={16}/>{String(x.data.name)}</span><span className={'studio-status '+badgeClass(stockState(x))}>{stockState(x)}</span></button>)}</div>:<div className="studio-empty small"><CheckCircle2 size={25}/><p>{metrics.parts?'All '+metrics.parts+' listed parts are above reorder levels.':'No parts in inventory yet.'}</p>{canMake('parts')&&<button className="studio-btn subtle" onClick={()=>begin('parts')}>Add inventory</button>}</div>}</section>
     </div>
     <div className="studio-helper"><Sparkles size={20}/><div><strong>Explore the complete workflow</strong><p>Switch between Customer, Technician, Service Manager and Supplier. Changes are shared across these four workspaces in your browser.</p></div><button onClick={()=>setRoleMenu(true)}>Switch role <ArrowRight size={15}/></button></div>
    </>}
    {currentKind&&<>
     <section className="studio-panel studio-record-panel"><div className="studio-panel-heading studio-record-top"><div><h2>{names[currentKind]} <span className="studio-count">{items.filter(x=>x.kind===currentKind).length}</span></h2><p>{categoryInfo[currentKind]}</p></div><div className="studio-record-tools"><div className="studio-search"><Search size={17}/><input aria-label="Search records" placeholder="Search records…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}><X size={14}/></button>}</div><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{pageStatuses.map(x=><option key={x} value={x}>{x}</option>)}</select></div></div>
      {currentItems.length?<div className="studio-record-list">{currentItems.map(item=>{const Icon=icons[item.kind],val=amount(item);return <div className="studio-record-row" key={item.id}><div className="studio-record-icon"><Icon size={19}/></div><div className="studio-record-main"><button onClick={()=>setDetail(item)}>{headline(item,items)}</button><small>{secondary(item,items)}</small><span>ID {item.id.slice(0,8).toUpperCase()} · {dateString(item.createdAt)}</span></div>{val!==null&&<div className="studio-record-amount">{money(val)}</div>}<span className={'studio-status '+badgeClass(item.kind==='parts'?stockState(item):status(item))}>{item.kind==='parts'?stockState(item):status(item)}</span><div className="studio-record-actions"><button title="View details" onClick={()=>setDetail(item)}><ChevronRight size={19}/></button></div></div>})}</div>:
      <div className="studio-empty"><span className="studio-empty-icon"><SummaryIcon kind={currentKind} size={26}/></span><h3>{search||filter!=='all'?'No matching records':'No '+names[currentKind].toLowerCase()+' yet'}</h3><p>{search||filter!=='all'?'Try adjusting your search or status filter.':'Your workshop starts empty. Add real information to this browser workspace, or visit another role to create linked records.'}</p>{canMake(currentKind)?<button className="studio-btn primary" onClick={()=>maybeCreate(currentKind)}><Plus size={16}/> Add {singular[currentKind].toLowerCase()}</button>:<button className="studio-btn subtle" onClick={()=>go('overview')}>Go to overview <ArrowRight size={15}/></button>}</div>}
     </section>
     {currentKind==='repairs'&&<div className="studio-guide"><Wrench size={20}/><span><strong>Ten-stage service tracking.</strong> Select a repair to move it one step forward. The technician and service manager can update the stages; customers can review them.</span></div>}
     {currentKind==='requests'&&<div className="studio-guide"><PackageCheck size={20}/><span><strong>Connected supplier workflow.</strong> Technicians create parts requests → suppliers quote → managers approve → suppliers dispatch and deliver. Delivered items replenish stock.</span></div>}
     {currentKind==='invoices'&&<div className="studio-guide"><CreditCard size={20}/><span><strong>Demo billing only.</strong> Invoice totals and paid statuses are tracked locally; no payment gateway or financial charge is performed.</span></div>}
    </>}
    {page==='reports'&&<div className="studio-reports-grid">
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Workshop summary</h2><p>Calculated from your records.</p></div></div><div className="studio-report-cards">
      {[['Vehicles registered',metrics.vehicles],['Active appointments',metrics.bookings],['Repairs underway',metrics.repairs],['Pending estimates',metrics.pendingEstimates],['Low-stock SKUs',metrics.lowStock],['Open purchase orders',metrics.orders]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}
     </div></section>
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Billing summary</h2><p>For sandbox preview only. Not a payment report.</p></div></div><div className="studio-billing"><div className="studio-billing-icon"><TrendingUp size={25}/></div><small>Marked-paid invoice total</small><strong>{money(metrics.revenue)}</strong><p>All invoice amounts and statuses are local entries.</p></div></section>
     <section className="studio-panel studio-reports-wide"><div className="studio-panel-heading"><div><h2>Export data by category</h2><p>Save CSVs to work with your workshop records.</p></div></div><div className="studio-export-grid">{kinds.filter(k=>k!=='alerts').map(k=><button key={k} onClick={()=>download(k)}><SummaryIcon kind={k} size={17}/>{names[k]}<Download size={15}/></button>)}</div></section>
    </div>}
    {page==='settings'&&<div className="studio-settings-grid">
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Local data management</h2><p>Everything in this workspace is saved in this browser.</p></div></div>
      <div className="studio-setting-line"><div><strong>Backup all records</strong><small>Download your complete workspace as a JSON file.</small></div><button className="studio-btn subtle" onClick={backup}><Download size={16}/> Download</button></div>
      <div className="studio-setting-line"><div><strong>Restore a backup</strong><small>Import an AutoCare360 browser workspace backup.</small></div><input style={{display:'none'}} accept="application/json,.json" ref={upload} type="file" onChange={e=>importBackup(e.target.files?.[0])}/><button className="studio-btn subtle" onClick={()=>upload.current?.click()}><RefreshCw size={16}/> Import</button></div>
      <div className="studio-setting-line danger"><div><strong>Reset browser workspace</strong><small>Delete all local records. Cannot be undone.</small></div><button className="studio-btn danger" onClick={()=>setConfirmClear(true)}><Trash2 size={16}/> Clear data</button></div>
      {confirmClear&&<div className="studio-reset"><p>Remove all {items.length} records from this browser?</p><button onClick={()=>setConfirmClear(false)} className="studio-btn ghost">Cancel</button><button className="studio-btn danger" onClick={()=>{setStore(initialStore());setConfirmClear(false);showToast('Browser workspace cleared.')}}>Yes, erase local data</button></div>}
     </section>
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Cloud connection</h2><p>Optional access to private Supabase records.</p></div></div><div className="studio-settings-callout"><Cloud size={24}/><h3>Cloud sign-in is separate</h3><p>Supabase authentication requires a confirmed account and working email configuration. This sandbox does not require email, but cannot save data online.</p><a className="studio-btn primary" href="/?login=1">Open secure login <ExternalLink size={15}/></a></div></section>
     <section className="studio-panel studio-reports-wide"><div className="studio-panel-heading"><div><h2>Integration status</h2><p>What is available and what still requires setup.</p></div></div><div className="studio-integration-list"><div><span className="studio-status good">READY</span><strong>Browser workspace</strong><small>CRUD and local role workflows</small></div><div><span className="studio-status amber">CONFIGURATION</span><strong>Supabase authentication</strong><small>Requires approved accounts / correct mail settings</small></div><div><span className="studio-status amber">NOT CONNECTED</span><strong>Salesforce org</strong><small>API authentication and custom object deployment unverified</small></div><div><span className="studio-status neutral">NOT ENABLED</span><strong>Email/SMS and real payments</strong><small>External service providers not connected</small></div></div></section>
    </div>}
    {page==='help'&&<div className="studio-help-layout">
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Getting started</h2><p>Run the full service lifecycle using only your browser.</p></div></div><div className="studio-guide-steps">
      {[['01','Customer','Register a vehicle and book a service'],['02','Service Manager','Confirm the booking, create a repair and technician job'],['03','Technician','Inspect the vehicle, update repair stages and request parts'],['04','Supplier','Create catalogue parts, quote requests and dispatch orders'],['05','Service Manager','Approve the quotation, create an estimate and invoice'],['06','Customer','Review an estimate and follow service progress']].map(([id,r,desc])=><div key={id}><span>{id}</span><div><strong>{r}</strong><p>{desc}</p></div></div>)}
     </div></section>
     <section className="studio-panel"><div className="studio-panel-heading"><div><h2>Common questions</h2></div></div><div className="studio-faq"><details open><summary>Why do I not need an email to explore?</summary><p>The browser sandbox stores user-created records on your device, so it does not access any private account or Supabase records.</p></details><details><summary>Will the four roles share information?</summary><p>Yes, within this browser. Switch roles using the selector in the sidebar. Every role sees the same local records through its own workflow.</p></details><details><summary>How do I share my data?</summary><p>Settings → Download backup. Import the file in another browser. For secure multi-user shared data, an authenticated cloud workspace is required.</p></details><details><summary>Is Salesforce connected?</summary><p>No. The Salesforce connection has not been authenticated and verified. These local records cannot appear automatically in Salesforce.</p></details><details><summary>Are invoices and payments real?</summary><p>No money is charged. Invoices are locally stored documents for demonstration, not issued tax invoices.</p></details></div></section>
    </div>}
    <footer className="studio-footer"><span>© AutoCare360 · Workshop Operating System</span><span><span className="studio-pulse"/> Saved locally · {items.length} records · {WORKSPACE_ID}</span></footer>
   </div>
  </main>
  {(modal||detail)&&<div className="studio-modal-shade" onMouseDown={e=>{if(e.currentTarget===e.target){setModal(null);setDetail(null);setError('')}}}>
   <aside className="studio-drawer" role="dialog" aria-modal="true" aria-label={modal?'Record form':'Record details'}>
    <header className="studio-drawer-head"><div><span className="studio-overline">AUTOCARE360 / {role.toUpperCase()}</span><h2>{modal?(modal.item?'Edit ':'New ')+singular[modal.kind]:detail&&headline(detail,items)}</h2><p>{modal?categoryInfo[modal.kind]:detail&&names[detail.kind]}</p></div><button title="Close" onClick={()=>{setModal(null);setDetail(null);setError('')}}><X size={20}/></button></header>
    {error&&<div className="studio-drawer-error"><TriangleAlert size={16}/>{error}</div>}
    {modal?<form onSubmit={save} className="studio-drawer-form"><div className="studio-field-grid">{fields[modal.kind].map(f=>{
      const links=f.target?items.filter(x=>x.kind===f.target):[];
      const value=form[f.key]??'';
      const update=(v:string|number)=>setForm(old=>{
       const n={...old,[f.key]:v};
       if(f.key==='repairId'&&v){const repair=items.find(x=>x.id===v);if(repair?.data.vehicleId)n.vehicleId=repair.data.vehicleId;}
       if(f.key==='requestId'&&v){const req=items.find(x=>x.id===v);if(req?.data.quote)n.quotedAmount=req.data.quote;}
       return n;
      });
      return <label key={f.key} className={f.type==='textarea'?'studio-field full':'studio-field'}><span>{f.title}{f.required&&<b> *</b>}</span>
       {f.type==='textarea'?<textarea value={String(value)} onChange={e=>update(e.target.value)} rows={4} placeholder={f.title}/>:
        f.type==='select'?<select required={f.required} value={String(value)} onChange={e=>update(e.target.value)}><option value="">Select {f.title.toLowerCase()}</option>{f.options?.map(x=><option key={x} value={x}>{x}</option>)}</select>:
        f.type==='link'?<select required={f.required} value={String(value)} onChange={e=>update(e.target.value)}><option value="">Choose {f.title.toLowerCase()}</option>{links.map(x=><option key={x.id} value={x.id}>{caption(x,items)} — {x.id.slice(0,6)}</option>)}</select>:
        <input type={f.type==='number'?'number':f.type==='date'?'date':f.type==='time'?'time':'text'} min={f.type==='number'?0:undefined} step={f.type==='number'?'any':undefined} value={String(value)} required={f.required} placeholder={f.title} onChange={e=>update(e.target.value)}/>}
       {f.type==='link'&&!links.length&&<small>No {names[f.target!].toLowerCase()} found. Add one first in the relevant workspace.</small>}
       {f.description&&<small>{f.description}</small>}
      </label>
     })}</div>
     {modal.kind==='estimates'&&<div className="studio-form-total">Estimated total <strong>{money(Number(form.labour||0)+Number(form.partsCost||0)+Number(form.tax||0))}</strong></div>}
     <div className="studio-drawer-form-actions"><button type="button" className="studio-btn ghost" onClick={()=>{setModal(null);setError('')}}>Cancel</button><button type="submit" className="studio-btn primary"><Check size={16}/>{modal.item?'Save changes':'Create '+singular[modal.kind].toLowerCase()}</button></div></form>:
     detail&&<div className="studio-detail">
       <div className="studio-detail-summary"><span className={'studio-status '+badgeClass(detail.kind==='parts'?stockState(detail):status(detail))}>{detail.kind==='parts'?stockState(detail):status(detail)}</span><span>Record #{detail.id.slice(0,8).toUpperCase()}</span></div>
       <div className="studio-detail-facts">{fields[detail.kind].map(f=><div key={f.key}><small>{f.title}</small><strong>{labelForField(f,detail,items)}</strong></div>)}<div><small>Created</small><strong>{dateString(detail.createdAt)}</strong></div><div><small>Last modified</small><strong>{dateString(detail.updatedAt)}</strong></div></div>
       {detail.kind==='repairs'&&<div className="studio-timeline"><h3>Service stages</h3>{repairStages.map((stage,i)=>{const index=repairStages.indexOf(status(detail));return <div key={stage} className={i<=index?'passed':''}><span>{i<index?<Check size={13}/>:i+1}</span><p>{stage}</p></div>})}</div>}
       {detail.kind==='jobs'&&<div className="studio-checklist"><h3>Inspection checklist</h3>{['Exterior and tyres','Engine and fluid levels','Electrical systems','Road-test and quality'].map((label,i)=>{
        const value=Array.isArray(detail.data.checklist)?(detail.data.checklist as boolean[])[i]===true:false;
        return <label key={label}><input type="checkbox" checked={value} disabled={role!=='Technician'&&role!=='Service Manager'} onChange={e=>{const arr=Array.isArray(detail.data.checklist)?[...(detail.data.checklist as boolean[])]:[false,false,false,false];arr[i]=e.target.checked;try{setStore(changeRecord(store,detail.id,{checklist:arr}));setDetail({...detail,data:{...detail.data,checklist:arr}});showToast('Inspection checklist saved.')}catch(ex){showError(ex)}}}/><span>{label}</span></label>
       })}</div>}
       {detail.kind==='requests'&&nextStatus(detail,role).includes('Quoted')&&<div className="studio-quote"><label>Supplier quote (₹)</label><input type="number" min="1" placeholder="Enter quoted amount" value={quote} onChange={e=>setQuote(e.target.value)}/></div>}
       {nextStatus(detail,role).length>0&&<div className="studio-status-actions"><h3>Next action</h3>{nextStatus(detail,role).map(next=><button className="studio-btn primary" key={next} onClick={()=>statusAction(detail,next)}><CheckCircle2 size={17}/>{next}</button>)}</div>}
       <div className="studio-detail-actions">{canEdit(detail.kind)&&<button className="studio-btn subtle" onClick={()=>edit(detail)}><Pencil size={16}/> Edit fields</button>}
        {detail.kind==='invoices'&&<button className="studio-btn subtle" onClick={()=>invoicePrint(detail)}><Printer size={16}/> Print preview</button>}
        {(canMake(detail.kind)||role==='Service Manager')&&<button className="studio-btn danger" onClick={()=>remove(detail)}><Trash2 size={16}/> Delete</button>}
        {detail.kind==='bookings'&&role==='Service Manager'&&<button className="studio-btn subtle" onClick={()=>begin('repairs',{vehicleId:detail.data.vehicleId,bookingId:detail.id,service:detail.data.service,date:nowDate()})}><Wrench size={16}/> Create work order</button>}
        {detail.kind==='requests'&&role==='Service Manager'&&status(detail)==='Ordered'&&<button className="studio-btn subtle" onClick={()=>begin('orders',{requestId:detail.id})}><Truck size={16}/> Create purchase order</button>}
       </div>
     </div>}
   </aside>
  </div>}
 </div>;

}
