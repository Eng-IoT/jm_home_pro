import {createHmac,timingSafeEqual} from 'node:crypto';
import {parseMessage,helpText} from '../dist/wa-commands.js';
export const same=(a,b)=>{const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));return x.length===y.length&&timingSafeEqual(x,y);};
export function verifySignature(raw,header,secret){return !!secret&&typeof header==='string'&&/^sha256=[0-9a-f]{64}$/.test(header)&&same(header,'sha256='+createHmac('sha256',secret).update(raw).digest('hex'));}
export class WhatsApp{
 constructor({token='',appSecret='',verifyToken='',phoneId='',version='',senders=[],control=false,botNumber='',store,controller,fetchImpl=fetch,now=Date.now}){Object.assign(this,{token,appSecret,verifyToken,phoneId,version,control,botNumber,store,controller,fetchImpl,now});this.senders=new Set(senders);}
 get configured(){return !!(this.token&&this.appSecret&&this.verifyToken&&/^\d+$/.test(this.phoneId)&&/^v\d+\.0$/.test(this.version)&&this.senders.size);}
 info(){return{configured:this.configured,controlEnabled:this.control,authorizedCount:this.senders.size,botNumber:/^[1-9]\d{7,14}$/.test(this.botNumber)?this.botNumber:'',summary:this.store.summary()};}
 receive(payload){
  if(payload?.object!=='whatsapp_business_account')return;
  const list=(v,n)=>Array.isArray(v)?v.slice(0,n).filter(x=>x&&typeof x==='object'):[];
  for(const entry of list(payload.entry,100))for(const change of list(entry.changes,100)){
   const v=change.value;if(change.field!=='messages'||v?.metadata?.phone_number_id!==this.phoneId)continue;
   for(const s of list(v.statuses,100))if(typeof s.id==='string'&&typeof s.status==='string')this.store.delivery(s.id,s.status);
   for(const m of list(v.messages,50)){
    const stamp=Number(m.timestamp)*1000;if(!this.senders.has(m.from)||!Number.isFinite(stamp)||stamp<this.now()-300000||stamp>this.now()+60000||typeof m.id!=='string'||m.id.length>200||!m.id.length)continue;
    const text=m.type==='text'&&typeof m.text?.body==='string'?m.text.body.slice(0,181):'';this.store.receive({id:m.id,sender:m.from,text,stamp},this.now());
   }
  }
 }
 async sendReply(to,text,replyId){
  if(!this.configured||!this.senders.has(to))throw Error('WhatsApp não configurado ou destinatário não autorizado.');
  const payload={messaging_product:'whatsapp',recipient_type:'individual',to,type:'text',context:{message_id:replyId},text:{preview_url:false,body:text.slice(0,4000)}};
  let r,j;try{r=await this.fetchImpl(`https://graph.facebook.com/${this.version}/${this.phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(10000)});j=await r.json();}catch{throw Error('Resultado do envio ao WhatsApp desconhecido. Não houve reenvio.');}
  if(!r.ok||typeof j.messages?.[0]?.id!=='string')throw Error('WhatsApp recusou o envio. Confira conta e token no servidor.');return j.messages[0].id;
 }
 async processOne(){
  const job=this.store.next();if(!job)return false;
  if(job.stamp<this.now()-300000||!this.senders.has(job.sender)){this.store.expire(job.id);return true;}
  let reply;const devices=this.controller.catalog().filter(d=>d.whatsapp),p=parseMessage(job.text,devices);
  try{
   if(!job.text)reply='Envie o comando por texto. Áudio e anexos não executam ações.';
   else if(p.error)reply=p.error;else if(p.action==='help')reply=helpText;
   else if(p.action==='list')reply=devices.length?'Dispositivos autorizados:\n'+devices.map(d=>`${d.name}: ${Object.keys(d.actions).join(', ')}`).join('\n'):'Nenhum dispositivo liberado para WhatsApp.';
   else if(p.action==='status')reply=await this.controller.describe(p.device);
   else if(!this.control)reply='Controle pelo WhatsApp pausado no servidor. Nenhum comando enviado.';
   else reply=(await this.controller.execute({id:'wa:'+job.id,...p,source:'whatsapp'})).message;
  }catch{reply='Não foi possível consultar a central. Confira o equipamento antes de repetir.';}
  this.store.db.prepare('UPDATE inbox SET reply=? WHERE id=?').run(reply,job.id);
  try{const waId=await this.sendReply(job.sender,reply,job.id);this.store.finish(job.id,reply,waId,'accepted');}catch{this.store.finish(job.id,reply,'','failed_or_unknown');}return true;
 }
 async drain(){if(this.working)return;this.working=true;try{while(await this.processOne()){}this.store.purge(this.now());}finally{this.working=false;}}
}
