import test from 'node:test';
import assert from 'node:assert/strict';
import {can,fieldsAllowed,isRole,isResource,validTransition,validatePayload} from '../api/_lib/policy.ts';

test('customers cannot access staff actions',()=>{
 assert.equal(can('customer','invoice','create'),false);
 assert.equal(can('customer','vehicle','create'),true);
 assert.equal(can('supplier','vehicle','read'),false);
 assert.equal(can('technician','job','create'),false);
 assert.equal(can('manager','invoice','create'),true);
});
test('roles and object types are strictly allowlisted',()=>{
 assert.equal(isRole('manager'),true);
 assert.equal(isRole('administrator'),false);
 assert.equal(isResource('purchase_order'),true);
 assert.equal(isResource('__proto__'),false);
});
test('customers can decide only their pending estimate',()=>{
 assert.equal(validTransition('customer','estimate',{status:'Awaiting approval'},{status:'Approved'}),true);
 assert.equal(validTransition('customer','estimate',{status:'Approved'},{status:'Rejected'}),false);
 assert.equal(fieldsAllowed('customer','estimate','update',['total']),false);
 assert.equal(fieldsAllowed('customer','estimate','update',['status']),true);
});
test('customers cannot confirm their own appointments',()=>{
 assert.equal(validTransition('customer','appointment',{status:'Pending confirmation'},{status:'Confirmed'}),false);
 assert.equal(validTransition('customer','appointment',{status:'Pending confirmation'},{status:'Cancelled'}),true);
});
test('technicians cannot skip repair workflow stages',()=>{
 assert.equal(validTransition('technician','repair',{stage:'Vehicle checked in'},{stage:'Inspection and diagnosis'}),true);
 assert.equal(validTransition('technician','repair',{stage:'Vehicle checked in'},{stage:'Completed'}),false);
});
test('rejects untrusted and malformed record fields',()=>{
 assert.equal(validatePayload('vehicle',{make:'Honda',model:'City',odometer:1234}),true);
 assert.equal(validatePayload('vehicle',{make:'Honda',ownerId:'other-user'}),false);
 assert.equal(validatePayload('part',{name:'Filter',quantity:-2}),false);
 assert.equal(validatePayload('part',{name:'Filter',quantity:'2'}),false);
 assert.equal(validatePayload('estimate',{lines:[{label:'Labour',amount:-500}]}),false);
});
