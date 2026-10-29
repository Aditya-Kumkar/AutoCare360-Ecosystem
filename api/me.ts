import {allowedMethod,handleError,requireUser,send} from './_lib/auth';
import {allowedTypes} from './_lib/policy';
export default async function handler(req:any,res:any){
 try{
  allowedMethod(req,['GET']);
  const user=await requireUser(req);
  send(res,200,{ok:true,user,readable:allowedTypes(user.role),creatable:allowedTypes(user.role,'create'),editable:allowedTypes(user.role,'update'),deletable:allowedTypes(user.role,'delete')});
 }catch(e){handleError(res,e);}
}
