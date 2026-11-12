import {buildCommand,toEntity,statusMap,services,actionFromService} from './devices.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class Controller{
 constructor({devices,tuya,store,enabled=false,now=Date.now,wait=delay,confirmTimeout=8000}){Object.assign(this,{devices,tuya,store,enabled,now,wait,confirmTimeout});this.busy=new Map();this.specs=new Map();this.lastSnapshot=null;}
 catalog(){return this.devices.map(d=>({id:d.id,name:d.name,aliases:d.aliases,type:d.type,entity_id:d.entity_id,whatsapp:d.whatsapp,actions:Object.fromEntries(Object.keys(d.actions).map(k=>[k,true]))}));}
 async snapshot(force=false){
  if(!force&&this.lastSnapshot&&this.now()-this.lastSnapshot.at<10000)return this.lastSnapshot.data;
  if(this.readJob)return this.readJob;
  this.readJob=(async()=>{try{
   const rows=new Map(),ids=[...new Set(this.devices.map(d=>d.tuyaDeviceId))];let index=0;
   await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{while(index<ids.length){const id=ids[index++];try{rows.set(id,await this.tuya.read(id));}catch{rows.set(id,{online:false,status:[]});}}}));
   const data={states:this.devices.map(d=>toEntity(d,rows.get(d.tuyaDeviceId))),services,config:{unit_system:{temperature:'°C'}},catalog:this.catalog(),controlEnabled:this.enabled,at:this.now()};this.lastSnapshot={at:this.now(),data};return data;
  }finally{this.readJob=null;}})();return this.readJob;
 }
 async specification(id){const c=this.specs.get(id);if(c&&this.now()-c.at<300000)return c.data;const data=await this.tuya.spec(id);this.specs.set(id,{data,at:this.now()});return data;}
 resolveService(command){if(!command||typeof command.target?.entity_id!=='string'||Object.keys(command.target).some(k=>k!=='entity_id'))throw Error('Selecione exatamente um dispositivo autorizado.');const d=this.devices.find(d=>d.entity_id===command.target.entity_id);if(!d)throw Error('Dispositivo não cadastrado.');return{device:d.id,...actionFromService(d,command)};}
 async execute({id,device,action,value,source='panel'}){
  if(!this.enabled)return{ok:false,message:'Servidor em leitura. Ative JM_CONTROL_ENABLED após conferir o cadastro.'};
  const d=this.devices.find(d=>d.id===device);if(!d)return{ok:false,message:'Dispositivo não autorizado.'};
  if(typeof id!=='string'||id.length<8||id.length>220)return{ok:false,message:'Identificador de operação inválido.'};
  if(!this.store.reserve(id,device,action,source,this.now(),JSON.stringify(value??null))){const old=this.store.operation(id);if(old.device!==device||old.action!==action||old.payload!==JSON.stringify(value??null))return{ok:false,message:'Identificador utilizado para outra ação. Nenhum comando enviado.'};return old?.result?JSON.parse(old.result):{ok:false,message:'Operação recebida ou com resultado incerto. Consulte o estado; não foi repetida.'};}
  const ticket=Symbol();if(this.busy.has(device)&&action!=='stop'){const r={ok:false,message:'Dispositivo ocupado. Aguarde o comando em andamento.'};this.store.done(id,r);return r;}
  this.busy.set(device,ticket);let result;
  try{
   const[spec,reading]=await Promise.all([this.specification(d.tuyaDeviceId),this.tuya.read(d.tuyaDeviceId)]);
   if(!reading.online)throw Error('Dispositivo offline no Tuya. Nenhum comando enviado.');
   const cmd=buildCommand(d,action,value,spec),expected=[cmd.expect];
   if(action==='level'&&['light','fan'].includes(d.type)){const power=buildCommand(d,value===0?'off':'on',undefined,spec);cmd.commands=[...power.commands,...(value===0?[]:cmd.commands)];expected.splice(0,expected.length,...(value===0?[]:expected),power.expect);}
   const matches=r=>r.online&&expected.every(e=>statusMap(r.status).get(e.code)===e.value);
   if(this.busy.get(device)!==ticket)throw Error('Comando substituído por parada.');
   if(!matches(reading)){
    if(await this.tuya.command(d.tuyaDeviceId,cmd.commands)!==true)throw Error('Tuya não aceitou a ação.');
    const deadline=this.now()+this.confirmTimeout;let confirmed=false;
    do{if(this.busy.get(device)!==ticket)throw Error('Comando substituído por parada.');const actual=await this.tuya.read(d.tuyaDeviceId);if(matches(actual)){confirmed=true;break;}if(this.now()>=deadline)break;await this.wait(1000);}while(this.now()<deadline);
    if(!confirmed)throw Error('Tuya aceitou o comando, mas o estado esperado não foi confirmado. Verifique o equipamento antes de repetir.');
   }
   result={ok:true,message:`${d.name}: estado solicitado confirmado pelo Tuya.`,device:d.id};
  }catch(e){result={ok:false,message:e.message,device:d.id};}
  finally{if(this.busy.get(device)===ticket)this.busy.delete(device);this.lastSnapshot=null;}
  this.store.done(id,result);return result;
 }
 async describe(id){const d=this.devices.find(d=>d.id===id);if(!d)return'Dispositivo não autorizado.';const e=toEntity(d,await this.tuya.read(d.tuyaDeviceId));const label=({on:'ligado',off:'desligado',open:'aberta',closed:'fechada',opening:'abrindo',closing:'fechando',cool:'refrigeração',unavailable:'indisponível',unknown:'estado desconhecido',idle:'parado'})[e.state]??e.state;return`${d.name}: ${label}. Estado informado pelo Tuya.`;}
}
