import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CarFront, CheckCircle2, ClipboardCheck, FileText, Gauge, Package, Plus, Settings, Truck, Wrench } from 'lucide-react';
import './operations.css';

type Vehicle = { id:string; make:string; model:string; plate:string; odometer:number };
type Booking = { id:string; vehicleId:string; service:string; issue:string; date:string; time:string; status:'Pending confirmation'|'Confirmed'|'Rescheduled'|'Cancelled'|'Completed'; created:string };
type Repair = { id:string; vehicleId:string; service:string; stage:string; update:string; date:string; completion:string };
type Estimate = { id:string; vehicleId:string; repair:string; date:string; status:'Awaiting approval'|'Approved'|'Rejected'; total:number; lines:{label:string;amount:number}[] };
type Invoice = { id:string; vehicleId:string; repair:string; date:string; total:number; paid:number; status:string };
type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
type Role = 'Technician'|'Service Manager'|'Supplier';
type Job = { id:string; repairId:string; technician:string; status:'Assigned'|'In progress'|'Inspection complete'|'Quality passed'; checklist:boolean[]; notes:string };
type Part = { id:string; name:string; sku:string; quantity:number; reorderAt:number; price:number };
type Request = { id:string; repairId:string; partId:string; quantity:number; status:'Requested'|'Quoted'|'Ordered'|'Delivered'; quote:number };
type Order = { id:string; requestId:string; status:'Placed'|'Dispatched'|'Delivered'; date:string };
type Update = { id:string; text:string; date:string; role:Role };
type Props = { role:Role; onBack:()=>void; onCustomerPreview:()=>void; vehicles:Vehicle[]; bookings:Booking[]; repairs:Repair[]; estimates:Estimate[]; invoices:Invoice[]; setBookings:Setter<Booking[]>; setRepairs:Setter<Repair[]>; setEstimates:Setter<Estimate[]>; setInvoices:Setter<Invoice[]>; onNotify:(title:string,body:string,page:'Appointments'|'Service tracking'|'Estimates'|'Invoices')=>void };
const STAGES=['Booking received','Appointment confirmed','Vehicle checked in','Inspection and diagnosis','Estimate awaiting approval','Repair in progress','Waiting for parts','Quality inspection','Ready for collection','Completed'] as const;
const CHECKS=['Visual inspection','Diagnostics recorded','Safety checks completed','Customer concerns documented'];
const seedJobs:Job[]=[
  {id:'JOB-001',repairId:'RO-0018',technician:'Demo technician',status:'In progress',checklist:[true,true,false,false],notes:'Inspect engine mounts and confirm noise source.'},
  {id:'JOB-002',repairId:'RO-0019',technician:'Demo technician',status:'Assigned',checklist:[false,false,false,false],notes:''},
  {id:'JOB-003',repairId:'RO-0020',technician:'Demo technician',status:'Assigned',checklist:[false,false,false,false],notes:''}
];
const seedParts:Part[]=[
  {id:'P-01',name:'Engine mounting kit',sku:'ENG-MNT-01',quantity:2,reorderAt:4,price:4200},
  {id:'P-02',name:'Oil filter',sku:'OIL-FLT-02',quantity:3,reorderAt:6,price:450},
  {id:'P-03',name:'Brake pads',sku:'BRK-PAD-03',quantity:1,reorderAt:5,price:2400},
  {id:'P-04',name:'Engine oil (litre)',sku:'ENG-OIL-04',quantity:18,reorderAt:8,price:650}
];
const seedRequests:Request[]=[
  {id:'PR-001',repairId:'RO-0018',partId:'P-01',quantity:1,status:'Requested',quote:0},
  {id:'PR-002',repairId:'RO-0019',partId:'P-02',quantity:2,status:'Quoted',quote:900},
  {id:'PR-003',repairId:'RO-0020',partId:'P-03',quantity:1,status:'Requested',quote:0},
  {id:'PR-004',repairId:'RO-0018',partId:'P-04',quantity:3,status:'Requested',quote:0},
  {id:'PR-005',repairId:'RO-0019',partId:'P-01',quantity:1,status:'Ordered',quote:4200},
  {id:'PR-006',repairId:'RO-0020',partId:'P-02',quantity:1,status:'Delivered',quote:450}
];
const seedOrders:Order[]=[
  {id:'PO-001',requestId:'PR-005',status:'Placed',date:'2026-10-24'},
  {id:'PO-002',requestId:'PR-006',status:'Dispatched',date:'2026-10-24'}
];
function stored<T>(key:string,fallback:T):T {try { const s=localStorage.getItem(key);return s?JSON.parse(s) as T:fallback; }catch{return fallback;}}
function id(prefix:string){return prefix+'-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();}
function today(){return new Date().toISOString().slice(0,10);}
function rupees(n:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);}
function moneyNumber(v:string){const n=Number(v);return Number.isFinite(n)&&n>=0?n:NaN;}
export default function OperationsWorkspace({role,onBack,onCustomerPreview,vehicles,bookings,repairs,estimates,invoices,setBookings,setRepairs,setEstimates,setInvoices,onNotify}:Props){
  const [tab,setTab]=useState('Overview');
  const [jobs,setJobs]=useState<Job[]>(()=>stored('ac360-ops-jobs',seedJobs));
  const [parts,setParts]=useState<Part[]>(()=>stored('ac360-ops-parts',seedParts));
  const [requests,setRequests]=useState<Request[]>(()=>stored('ac360-ops-requests',seedRequests));
  const [orders,setOrders]=useState<Order[]>(()=>stored('ac360-ops-orders',seedOrders));
  const [updates,setUpdates]=useState<Update[]>(()=>stored('ac360-ops-updates',[]));
  const [message,setMessage]=useState('');
  const [selectedJob,setSelectedJob]=useState('JOB-001');
  const [notes,setNotes]=useState('');
  const [requestForm,setRequestForm]=useState({repairId:'RO-0018',partId:'P-01',quantity:'1'});
  const [estimateForm,setEstimateForm]=useState({repairId:'RO-0018',label:'Repair labour',amount:'1500'});
  const [stockForm,setStockForm]=useState({name:'',sku:'',quantity:'0',reorderAt:'3',price:'0'});
  const [invoiceForm,setInvoiceForm]=useState({repairId:'RO-0018',amount:'0'});
  const [activeCategory,setActiveCategory]=useState('');
  useEffect(()=>{localStorage.setItem('ac360-ops-jobs',JSON.stringify(jobs));},[jobs]);
  useEffect(()=>{localStorage.setItem('ac360-ops-parts',JSON.stringify(parts));},[parts]);
  useEffect(()=>{localStorage.setItem('ac360-ops-requests',JSON.stringify(requests));},[requests]);
  useEffect(()=>{localStorage.setItem('ac360-ops-orders',JSON.stringify(orders));},[orders]);
  useEffect(()=>{localStorage.setItem('ac360-ops-updates',JSON.stringify(updates));},[updates]);
  const vehicle=(vId:string)=>{const v=vehicles.find(v=>v.id===vId);return v?v.make+' '+v.model+' · '+v.plate:vId;};
  const jobCount=jobs.filter(j=>j.status!=='Quality passed').length;
  const inspectionCount=jobs.filter(j=>j.status!=='Quality passed'&&!j.checklist.every(Boolean)).length;
  const neededCount=requests.filter(r=>r.status==='Requested').length;
  const appointmentCount=bookings.filter(b=>b.status==='Pending confirmation').length;
  const openCount=repairs.filter(r=>r.stage!=='Completed').length;
  const approvalCount=estimates.filter(e=>e.status==='Awaiting approval').length;
  const lowCount=parts.filter(p=>p.quantity<=p.reorderAt).length;
  const deliveryCount=orders.filter(o=>o.status!=='Delivered').length;
  const alert=(s:string)=>setMessage(s);
  function log(text:string){setUpdates(u=>[{id:id('U'),role,text,date:new Date().toLocaleString('en-IN')},...u]);alert(text);}
  const metrics=role==='Technician'?
    [{label:'Assigned jobs',value:jobCount,section:'Jobs'},{label:'Inspections',value:inspectionCount,section:'Inspections'},{label:'Parts needed',value:neededCount,section:'Parts requests'}]:
    role==='Service Manager'?
    [{label:'Pending appointments',value:appointmentCount,section:'Scheduling'},{label:'Open work orders',value:openCount,section:'Work orders'},{label:'Pending approvals',value:approvalCount,section:'Estimates'}]:
    [{label:'Parts requests',value:requests.filter(r=>r.status!=='Delivered').length,section:'Parts requests'},{label:'Low-stock items',value:lowCount,section:'Catalogue'},{label:'Open deliveries',value:deliveryCount,section:'Deliveries'}];
  const sections=role==='Technician'?['Overview','Work queue','Updates','Jobs','Inspections','Parts requests','Quality checks']:
    role==='Service Manager'?['Overview','Work queue','Updates','Scheduling','Work orders','Estimates','Invoicing','Inventory']:
    ['Overview','Work queue','Updates','Parts requests','Catalogue','Purchase orders','Deliveries'];
  function goto(s:string){setTab(s);setMessage('');}
  function updateJob(jobId:string,change:Partial<Job>){setJobs(old=>old.map(j=>j.id===jobId?{...j,...change}:j));}
  function updateStage(repairId:string,stage:string){
    const repair=repairs.find(r=>r.id===repairId);
    if(!repair){alert('This job is not linked to an active repair order.');return;}
    if(stage==='Repair in progress'&&estimates.some(e=>e.repair===repairId&&e.status==='Awaiting approval')){alert('An estimate still needs customer approval.');return;}
    if(stage==='Repair in progress'&&estimates.some(e=>e.repair===repairId&&e.status==='Rejected')){alert('The estimate was rejected. Prepare a revised estimate before repair.');return;}
    if(stage==='Completed'&&repair.stage!=='Ready for collection'){alert('The repair must be ready for collection before completion.');return;}
    setRepairs(old=>old.map(r=>r.id===repairId?{...r,stage,update:stage==='Completed'?'Your service is complete.':stage+' — workshop status updated.',completion:stage==='Completed'?'Completed':r.completion}:r));
    onNotify('Service progress updated',repairId+' is now at: '+stage+'.','Service tracking');
    log(repairId+' moved to '+stage);
  }
  function createRequest(){
    const quantity=moneyNumber(requestForm.quantity);
    if(!repairs.some(r=>r.id===requestForm.repairId)||!parts.some(p=>p.id===requestForm.partId)||!Number.isInteger(quantity)||quantity<1){alert('Choose an active repair order, a part and a positive whole-number quantity.');return;}
    const request={id:id('PR'),repairId:requestForm.repairId,partId:requestForm.partId,quantity,status:'Requested' as const,quote:0};
    setRequests(old=>[request,...old]);log('Part request '+request.id+' submitted to supplier.');setTab('Parts requests');
  }
  function issueEstimate(){
    const repair=repairs.find(r=>r.id===estimateForm.repairId);
    const amount=moneyNumber(estimateForm.amount);
    if(!repair||!estimateForm.label.trim()||!Number.isFinite(amount)||amount<=0){alert('Select an active repair, enter an item and a positive amount.');return;}
    if(estimates.some(e=>e.repair===repair.id&&e.status==='Awaiting approval')){alert('This repair already has an estimate awaiting a decision.');return;}
    const est:Estimate={id:id('EST'),vehicleId:repair.vehicleId,repair:repair.id,date:today(),status:'Awaiting approval',total:amount,lines:[{label:estimateForm.label.trim(),amount}]};
    setEstimates(old=>[est,...old]);setRepairs(old=>old.map(r=>r.id===repair.id?{...r,stage:'Estimate awaiting approval',update:'An estimate is ready for your approval.'}:r));
    onNotify('Estimate ready for review',est.id+' for '+repair.id+' totals '+rupees(amount)+'.','Estimates');
    log(est.id+' issued for '+repair.id);
  }
  function createInvoice(){
    const repair=repairs.find(r=>r.id===invoiceForm.repairId);
    const amount=moneyNumber(invoiceForm.amount);
    if(!repair||repair.stage!=='Completed'||!Number.isFinite(amount)||amount<=0){alert('Only completed repairs can be invoiced, with a positive amount.');return;}
    if(invoices.some(i=>i.repair===repair.id)){alert('This repair already has an invoice.');return;}
    const invoice:Invoice={id:id('INV'),vehicleId:repair.vehicleId,repair:repair.id,date:today(),total:amount,paid:0,status:'Unpaid'};
    setInvoices(old=>[invoice,...old]);onNotify('Invoice issued',invoice.id+' for '+repair.id+' totals '+rupees(amount)+'.','Invoices');log(invoice.id+' issued for '+repair.id);
  }
  function createStock(){
    const qty=moneyNumber(stockForm.quantity), threshold=moneyNumber(stockForm.reorderAt), price=moneyNumber(stockForm.price);
    if(!stockForm.name.trim()||!stockForm.sku.trim()||parts.some(p=>p.sku.toLowerCase()===stockForm.sku.trim().toLowerCase())||![qty,threshold,price].every(Number.isFinite)||!Number.isInteger(qty)||!Number.isInteger(threshold)){alert('Provide a unique SKU, part name, and valid non-negative stock, reorder level and price.');return;}
    const part:Part={id:id('P'),name:stockForm.name.trim(),sku:stockForm.sku.trim(),quantity:qty,reorderAt:threshold,price};
    setParts(p=>[part,...p]);setStockForm({name:'',sku:'',quantity:'0',reorderAt:'3',price:'0'});log(part.name+' added to supplier catalogue.');
  }
  function placeOrder(r:Request){
    if(r.status!=='Quoted'||r.quote<=0){alert('Supplier quotation required before creating a purchase order.');return;}
    if(orders.some(o=>o.requestId===r.id)){alert('A purchase order exists for this request.');return;}
    const order:Order={id:id('PO'),requestId:r.id,status:'Placed',date:today()};
    setOrders(o=>[order,...o]);setRequests(old=>old.map(q=>q.id===r.id?{...q,status:'Ordered'}:q));log(order.id+' created for '+r.id);
  }
  function deliverOrder(o:Order){
    const request=requests.find(r=>r.id===o.requestId);
    if(!request){alert('Related parts request not found.');return;}
    const part=parts.find(p=>p.id===request.partId);
    if(!part){alert('Related catalogue item not found.');return;}
    const status=o.status==='Placed'?'Dispatched':'Delivered';
    if(o.status==='Delivered')return;
    setOrders(old=>old.map(q=>q.id===o.id?{...q,status}:q));
    if(status==='Delivered'){setRequests(old=>old.map(q=>q.id===request.id?{...q,status:'Delivered'}:q));setParts(old=>old.map(p=>p.id===part.id?{...p,quantity:p.quantity+request.quantity}:p));}
    log(o.id+' marked '+status.toLowerCase()+(status==='Delivered'?' and stock replenished':''));
  }
  const selected=jobs.find(j=>j.id===selectedJob)||jobs[0];
  return <div className={'ops-shell ops-'+(role==='Service Manager'?'manager':role.toLowerCase())}>
    <header className="ops-header"><div><Gauge size={23}/><strong>AutoCare <span>360</span></strong><small>{role} workspace · DEMO</small></div><button onClick={onBack}><ArrowLeft size={15}/> All workspaces</button></header>
    <main className="ops-main"><div className="ops-heading"><div><p>CONNECTED SERVICE OPERATIONS · LOCAL DEMO</p><h1>{role==='Technician'?<Wrench/>:role==='Service Manager'?<Settings/>:<Package/>} {role} workspace</h1><span>Shared customer records and locally editable workshop data. No live Salesforce connection or authentication.</span></div><span className="ops-flag">DEMO DATA</span></div>
    <nav className="ops-nav" aria-label={role+' navigation'}>{sections.map(s=><button key={s} className={tab===s?'active':''} onClick={()=>goto(s)}>{s}</button>)}</nav>
    {message&&<div className="ops-feedback" role="status">{message}<button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>}
    {tab==='Overview'&&<><div className="ops-metrics">{metrics.map(m=><button key={m.label} onClick={()=>goto(m.section)}><span>{m.label}</span><strong>{m.value}</strong><small>Open {m.section.toLowerCase()} <ArrowRight size={13}/></small></button>)}</div><section className="ops-card ops-next"><div><p>NEXT STEP</p><h2>{role==='Technician'?'Review assigned work':role==='Service Manager'?'Review workshop workload':'Review incoming parts requests'}</h2><span>Choose a queue or open one of the detailed work areas above.</span></div><button className="ops-primary" onClick={()=>goto('Work queue')}>Open work queue <ArrowRight size={16}/></button></section></>}
    {tab==='Work queue'&&<section className="ops-card"><h2>{role} work queue</h2><p>Counts update as demo records change.</p><div className="ops-queue">{metrics.map((m,i)=><button key={m.label} onClick={()=>goto(m.section)}><b>0{i+1}</b><strong>{m.label}</strong><span>{m.value} records</span><ArrowRight size={16}/></button>)}</div></section>}
    {tab==='Updates'&&<section className="ops-card"><h2>Workspace updates</h2>{updates.filter(u=>u.role===role).length===0?<p>No actions have been recorded in this demo workspace yet.</p>:updates.filter(u=>u.role===role).map(u=><div className="ops-line" key={u.id}><Bell size={17}/><div><strong>{u.text}</strong><small>{u.date}</small></div></div>)}</section>}
    {role==='Technician'&&tab==='Jobs'&&<section className="ops-card"><h2>Assigned jobs</h2><p>Select a job to record progress. Missing repair links are sample queue placeholders.</p><div className="ops-list">{jobs.map(j=><article key={j.id}><div><strong>{j.id} · {j.repairId}</strong><small>{repairs.find(r=>r.id===j.repairId)?.service||'Sample work order'} · {j.technician}</small></div><span className="ops-pill">{j.status}</span><button onClick={()=>{setSelectedJob(j.id);goto('Inspections');}}>Open inspection</button></article>)}</div></section>}
    {role==='Technician'&&tab==='Inspections'&&<section className="ops-card"><h2>Inspection checklist</h2><label>Assigned job <select value={selected?.id||''} onChange={e=>setSelectedJob(e.target.value)}>{jobs.map(j=><option key={j.id} value={j.id}>{j.id} · {j.repairId}</option>)}</select></label>{selected&&<><div className="ops-checklist">{CHECKS.map((label,i)=><label key={label}><input type="checkbox" checked={selected.checklist[i]||false} onChange={e=>updateJob(selected.id,{checklist:selected.checklist.map((v,index)=>index===i?e.target.checked:v)})}/>{label}</label>)}</div><label>Inspection notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={selected.notes||'Inspection findings'}/></label><button className="ops-primary" onClick={()=>{if(!selected.checklist.every(Boolean)){alert('Complete each inspection check before submitting.');return;}updateJob(selected.id,{status:'Inspection complete',notes:notes.trim()||selected.notes});log(selected.id+' inspection completed.');}}>Complete inspection</button></>}</section>}
    {role==='Technician'&&tab==='Parts requests'&&<section className="ops-card"><h2>Request workshop parts</h2><div className="ops-form"><label>Repair order<select value={requestForm.repairId} onChange={e=>setRequestForm(f=>({...f,repairId:e.target.value}))}>{repairs.map(r=><option key={r.id}>{r.id}</option>)}</select></label><label>Part<select value={requestForm.partId} onChange={e=>setRequestForm(f=>({...f,partId:e.target.value}))}>{parts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label><label>Quantity<input type="number" min="1" step="1" value={requestForm.quantity} onChange={e=>setRequestForm(f=>({...f,quantity:e.target.value}))}/></label></div><button className="ops-primary" onClick={createRequest}><Plus size={15}/> Request parts</button><h3>Recent parts requests</h3><div className="ops-list">{requests.slice(0,12).map(r=><article key={r.id}><div><strong>{r.id} · {parts.find(p=>p.id===r.partId)?.name||r.partId}</strong><small>{r.repairId} · Qty {r.quantity}</small></div><span className="ops-pill">{r.status}</span></article>)}</div></section>}
    {role==='Technician'&&tab==='Quality checks'&&<section className="ops-card"><h2>Quality inspection and service stages</h2><p>Update customer-visible repair progress only when the corresponding workshop stage is actually complete.</p>{repairs.map(r=><article className="ops-work" key={r.id}><h3>{r.id} · {r.service}</h3><p>{vehicle(r.vehicleId)} · Current: {r.stage}</p><div className="ops-form"><label>Customer-visible stage<select value={r.stage} onChange={e=>updateStage(r.id,e.target.value)}>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></label></div></article>)}</section>}
    {role==='Service Manager'&&tab==='Scheduling'&&<section className="ops-card"><h2>Appointment scheduling</h2><p>Confirm customer requests or cancel them. These decisions appear in the customer portal.</p><div className="ops-list">{bookings.map(b=><article key={b.id}><div><strong>{b.id} · {b.service}</strong><small>{vehicle(b.vehicleId)} · {b.date} {b.time} · {b.issue}</small></div><span className="ops-pill">{b.status}</span>{b.status==='Pending confirmation'&&<button onClick={()=>{setBookings(old=>old.map(q=>q.id===b.id?{...q,status:'Confirmed'}:q));onNotify('Appointment confirmed',b.id+' confirmed for '+b.date+' at '+b.time+'.','Appointments');log(b.id+' confirmed.');}}>Confirm</button>}{b.status==='Confirmed'&&<button onClick={()=>{setBookings(old=>old.map(q=>q.id===b.id?{...q,status:'Cancelled'}:q));onNotify('Appointment cancelled',b.id+' has been cancelled by the workshop.','Appointments');log(b.id+' cancelled.');}}>Cancel</button>}</article>)}</div></section>}
    {role==='Service Manager'&&tab==='Work orders'&&<section className="ops-card"><h2>Workshop work orders</h2><p>Create a repair order from a confirmed appointment, then assign work to a technician.</p><div className="ops-list">{bookings.filter(b=>b.status==='Confirmed'&&!repairs.some(r=>r.vehicleId===b.vehicleId&&r.service===b.service)).map(b=><article key={b.id}><div><strong>{b.id} · {vehicle(b.vehicleId)}</strong><small>{b.service}</small></div><button onClick={()=>{const next:Repair={id:id('RO'),vehicleId:b.vehicleId,service:b.service,stage:'Vehicle checked in',update:'Vehicle checked in and awaiting inspection.',date:today(),completion:'To be assessed after diagnosis'};setRepairs(old=>[next,...old]);setJobs(old=>[{id:id('JOB'),repairId:next.id,technician:'Demo technician',status:'Assigned',checklist:[false,false,false,false],notes:''},...old]);onNotify('Vehicle checked in',next.id+' is now in the workshop.','Service tracking');log(next.id+' created from '+b.id);}}>Create & assign job</button></article>)}</div><h3>Current repair orders</h3><div className="ops-list">{repairs.map(r=><article key={r.id}><div><strong>{r.id} · {r.service}</strong><small>{vehicle(r.vehicleId)} · {r.stage}</small></div><span className="ops-pill">{jobs.find(j=>j.repairId===r.id)?.technician||'Unassigned'}</span><button onClick={()=>goto('Estimates')}>Prepare estimate</button></article>)}</div></section>}
    {role==='Service Manager'&&tab==='Estimates'&&<section className="ops-card"><h2>Estimate preparation and approval</h2><p>Issue an itemised demo estimate for customer approval. Customer decisions sync to this list.</p><div className="ops-form"><label>Repair order<select value={estimateForm.repairId} onChange={e=>setEstimateForm(f=>({...f,repairId:e.target.value}))}>{repairs.map(r=><option key={r.id}>{r.id}</option>)}</select></label><label>Line item<input value={estimateForm.label} onChange={e=>setEstimateForm(f=>({...f,label:e.target.value}))}/></label><label>Amount (₹)<input type="number" min="1" value={estimateForm.amount} onChange={e=>setEstimateForm(f=>({...f,amount:e.target.value}))}/></label></div><button className="ops-primary" onClick={issueEstimate}>Issue estimate</button><div className="ops-list">{estimates.map(e=><article key={e.id}><div><strong>{e.id} · {e.repair}</strong><small>{rupees(e.total)} · {vehicle(e.vehicleId)}</small></div><span className="ops-pill">{e.status}</span></article>)}</div></section>}
    {role==='Service Manager'&&tab==='Invoicing'&&<section className="ops-card"><h2>Service invoicing</h2><p>Generate an unpaid invoice for a completed repair order. Online payments are not connected.</p><div className="ops-form"><label>Completed repair<select value={invoiceForm.repairId} onChange={e=>setInvoiceForm(f=>({...f,repairId:e.target.value}))}>{repairs.map(r=><option key={r.id}>{r.id}{r.stage!=='Completed'?' (not completed)':''}</option>)}</select></label><label>Invoice amount (₹)<input type="number" min="1" value={invoiceForm.amount} onChange={e=>setInvoiceForm(f=>({...f,amount:e.target.value}))}/></label></div><button className="ops-primary" onClick={createInvoice}>Create invoice</button><div className="ops-list">{invoices.map(i=><article key={i.id}><div><strong>{i.id} · {vehicle(i.vehicleId)}</strong><small>{i.repair} · {rupees(i.total)} · Paid {rupees(i.paid)}</small></div><span className="ops-pill">{i.status}</span></article>)}</div></section>}
    {role==='Service Manager'&&tab==='Inventory'&&<section className="ops-card"><h2>Inventory and purchasing</h2><p>Review low stock and approve quoted parts requests to create purchase orders.</p><div className="ops-list">{parts.map(p=><article key={p.id}><div><strong>{p.name}</strong><small>{p.sku} · In stock: {p.quantity} · Reorder at {p.reorderAt}</small></div><span className={'ops-pill '+(p.quantity<=p.reorderAt?'ops-low':'')}>{p.quantity<=p.reorderAt?'Low stock':'Available'}</span></article>)}</div><h3>Supplier quotations</h3><div className="ops-list">{requests.filter(r=>r.status==='Quoted').map(r=><article key={r.id}><div><strong>{r.id} · {parts.find(p=>p.id===r.partId)?.name}</strong><small>Qty {r.quantity} · Quote {rupees(r.quote)}</small></div><button onClick={()=>placeOrder(r)}>Create purchase order</button></article>)}</div></section>}
    {role==='Supplier'&&tab==='Parts requests'&&<section className="ops-card"><h2>Incoming parts requests</h2><p>Quote requested items. Quotes remain local until a manager raises a purchase order.</p><div className="ops-list">{requests.map(r=><SupplierRequest key={r.id} request={r} part={parts.find(p=>p.id===r.partId)} onQuote={amount=>{setRequests(old=>old.map(q=>q.id===r.id?{...q,quote:amount,status:'Quoted'}:q));log(r.id+' quoted at '+rupees(amount));}}/>)}</div></section>}
    {role==='Supplier'&&tab==='Catalogue'&&<section className="ops-card"><h2>Parts catalogue and stock levels</h2><p>Add products and update available quantities in the browser demo.</p><div className="ops-form"><label>Part name<input value={stockForm.name} onChange={e=>setStockForm(f=>({...f,name:e.target.value}))}/></label><label>Unique SKU<input value={stockForm.sku} onChange={e=>setStockForm(f=>({...f,sku:e.target.value}))}/></label><label>Quantity<input type="number" min="0" step="1" value={stockForm.quantity} onChange={e=>setStockForm(f=>({...f,quantity:e.target.value}))}/></label><label>Reorder threshold<input type="number" min="0" step="1" value={stockForm.reorderAt} onChange={e=>setStockForm(f=>({...f,reorderAt:e.target.value}))}/></label><label>Unit price (₹)<input type="number" min="0" value={stockForm.price} onChange={e=>setStockForm(f=>({...f,price:e.target.value}))}/></label></div><button className="ops-primary" onClick={createStock}><Plus size={15}/> Add catalogue item</button><div className="ops-list">{parts.map(p=><article key={p.id}><div><strong>{p.name} · {p.sku}</strong><small>{rupees(p.price)} / unit · Reorder at {p.reorderAt}</small></div><label className="ops-qty">Stock <input aria-label={'Stock for '+p.name} type="number" min="0" step="1" value={p.quantity} onChange={e=>{const n=moneyNumber(e.target.value);if(Number.isInteger(n))setParts(old=>old.map(q=>q.id===p.id?{...q,quantity:n}:q));}}/></label><span className={'ops-pill '+(p.quantity<=p.reorderAt?'ops-low':'')}>{p.quantity<=p.reorderAt?'Low stock':'Available'}</span></article>)}</div></section>}
    {role==='Supplier'&&tab==='Purchase orders'&&<section className="ops-card"><h2>Purchase orders</h2><p>Orders placed by the service manager appear here.</p><div className="ops-list">{orders.map(o=><article key={o.id}><div><strong>{o.id} · {o.requestId}</strong><small>{o.date} · {requests.find(r=>r.id===o.requestId)?.quantity||0} units</small></div><span className="ops-pill">{o.status}</span><button onClick={()=>goto('Deliveries')}>Manage delivery</button></article>)}</div></section>}
    {role==='Supplier'&&tab==='Deliveries'&&<section className="ops-card"><h2>Track deliveries</h2><p>Mark an order dispatched or delivered. Delivered quantities replenish the catalogue once.</p><div className="ops-list">{orders.map(o=><article key={o.id}><div><strong>{o.id} · {o.requestId}</strong><small>Delivery status: {o.status}</small></div>{o.status!=='Delivered'?<button onClick={()=>deliverOrder(o)}>{o.status==='Placed'?'Mark dispatched':'Mark delivered'}</button>:<span className="ops-pill">Delivered</span>}</article>)}</div></section>}
    <div className="ops-disclaimer"><CheckCircle2 size={16}/> Changes are stored locally in this browser and shared across demo workspaces. Salesforce records, real authentication, payments, email and SMS are not connected.</div>
    </main><footer className="ops-footer"><span>© 2026 AutoCare 360 · Demo environment</span><button onClick={onCustomerPreview}><CarFront size={15}/> Open customer preview</button></footer>
  </div>;
}
function SupplierRequest({request,part,onQuote}:{request:Request;part?:Part;onQuote:(amount:number)=>void}){
 const [amount,setAmount]=useState(String(request.quote||part?.price&&part.price*request.quantity||''));
 return <article><div><strong>{request.id} · {part?.name||request.partId}</strong><small>{request.repairId} · Quantity {request.quantity}</small></div><span className="ops-pill">{request.status}</span>{request.status==='Requested'&&<div className="ops-quote"><input type="number" min="1" aria-label={'Quote for '+request.id} placeholder="Quote ₹" value={amount} onChange={e=>setAmount(e.target.value)}/><button onClick={()=>{const n=moneyNumber(amount);if(Number.isFinite(n)&&n>0)onQuote(n);}}>Send quote</button></div>}{request.status!=='Requested'&&<strong>{request.quote>0?rupees(request.quote):'—'}</strong>}</article>;
}
