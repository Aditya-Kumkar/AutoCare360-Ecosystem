import assert from 'node:assert/strict';
import test from 'node:test';
import {
 addRecord,advance,amount,csvFor,initialStore,isStore,nextStatus,removeRecord,repairStages,status,summary,validation,
 type Store
} from '../src/studioModel.ts';

const record=(s:Store,kind:Parameters<typeof addRecord>[1],data:Parameters<typeof addRecord>[2],id:string)=>addRecord(s,kind,data,id,'2026-10-29T10:00:00.000Z');
const vehicleId='11111111-1111-4111-8111-111111111111';
const bookingId='22222222-2222-4222-8222-222222222222';
const repairId='33333333-3333-4333-8333-333333333333';
const partId='44444444-4444-4444-8444-444444444444';
const requestId='55555555-5555-4555-8555-555555555555';
const orderId='66666666-6666-4666-8666-666666666666';
const vehicle=()=>record(initialStore(),'vehicles',{make:'Maruti',model:'Swift',plate:'TN 00 XX 1234',year:2023},vehicleId);
const withRepair=()=>{
 let s=vehicle();
 s=record(s,'bookings',{vehicleId,service:'General servicing',date:'2099-01-05',time:'10:00'},bookingId);
 s=record(s,'repairs',{vehicleId,bookingId,service:'Engine inspection',technician:'Test technician',date:'2026-10-29'},repairId);
 return s;
};

test('customer vehicle and appointment are created without seeded sample data',()=>{
 let s=initialStore();
 assert.equal(s.items.length,0);
 s=record(s,'vehicles',{make:'Maruti',model:'Swift',year:2023,plate:'TN 00 XX 1234'},vehicleId);
 s=record(s,'bookings',{vehicleId,service:'General servicing',date:'2099-01-05',time:'10:00'},bookingId);
 assert.equal(s.items.length,2);
 assert.equal(status(s.items.find(x=>x.id===bookingId)!), 'Pending confirmation');
 assert.equal(summary(s.items).vehicles,1);
 assert.equal(summary(s.items).bookings,1);
});

test('an appointment must point to an existing vehicle',()=>{
 assert.match(String(validation('bookings',{vehicleId,service:'Oil & filters',date:'2099-01-05',time:'10:00'},[])),/existing record/i);
});

test('status transitions are role-restricted and do not skip a repair stage',()=>{
 let s=withRepair();
 const repair=s.items.find(x=>x.id===repairId)!;
 assert.deepEqual(nextStatus(repair,'Customer'),[]);
 assert.deepEqual(nextStatus(repair,'Technician'),[repairStages[1]]);
 assert.throws(()=>advance(s,repairId,'Completed','Technician'),/not permitted/i);
 for(let i=1;i<repairStages.length;i++)s=advance(s,repairId,repairStages[i],'Technician');
 assert.equal(status(s.items.find(x=>x.id===repairId)!), 'Completed');
 assert.equal(s.items.filter(x=>x.kind==='history').length,1);
 assert.equal(s.items.filter(x=>x.kind==='alerts').length,repairStages.length-1);
});

test('supplier quote → manager order → delivery replenishes inventory',()=>{
 let s=withRepair();
 s=record(s,'parts',{name:'Brake pads',sku:'BP-25',price:750,quantity:2,reorderAt:2},partId);
 s=record(s,'requests',{repairId,partId,quantity:3},requestId);
 assert.throws(()=>advance(s,requestId,'Quoted','Supplier'),/positive supplier quote/i);
 s=advance(s,requestId,'Quoted','Supplier',{quote:2250});
 assert.equal(status(s.items.find(x=>x.id===requestId)!), 'Quoted');
 s=advance(s,requestId,'Ordered','Service Manager');
 s=record(s,'orders',{requestId,supplier:'Test supplier',eta:'2099-01-06'},orderId);
 s=advance(s,orderId,'Dispatched','Supplier');
 s=advance(s,orderId,'Delivered','Supplier');
 assert.equal(Number(s.items.find(x=>x.id===partId)!.data.quantity),5);
 assert.equal(status(s.items.find(x=>x.id===orderId)!), 'Delivered');
});

test('estimate approval and invoice updates produce accurate workshop metrics',()=>{
 let s=withRepair();
 s=record(s,'estimates',{vehicleId,repairId,labour:900,partsCost:450,tax:100},'estimate-1');
 assert.equal(amount(s.items.find(x=>x.id==='estimate-1')!),1450);
 s=advance(s,'estimate-1','Approved','Customer');
 s=record(s,'invoices',{vehicleId,repairId,total:1450},'invoice-1');
 s=advance(s,'invoice-1','Paid','Service Manager');
 assert.equal(summary(s.items).revenue,1450);
 assert.equal(summary(s.items).pendingEstimates,0);
});

test('referenced records cannot be accidentally deleted',()=>{
 const s=withRepair();
 assert.throws(()=>removeRecord(s,vehicleId),/referenced/i);
});

test('CSV exports quote spreadsheet formulas rather than executing them',()=>{
 const s=record(initialStore(),'parts',{name:'=SUM(1+1)',sku:'FORMULA',quantity:1,price:20},'part-1');
 const csv=csvFor(s.items,'parts');
 assert.ok(csv.includes('\u2019=SUM(1+1)'));
 assert.ok(csv.includes('FORMULA'));
});

test('saved workspace schema rejects malformed browser backups',()=>{
 assert.equal(isStore(initialStore()),true);
 assert.equal(isStore({version:1,items:[{id:42}]}),false);
 assert.equal(isStore({items:[]}),false);
});
