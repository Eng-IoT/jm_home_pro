import {same,verifySignature} from './whatsapp.mjs';
import {parseMessage} from '../dist/wa-commands.js';
import {validateConfig,buildCommand,validateValue} from './devices.mjs';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function createHandler({controller,whatsapp,adminToken='',origins=[],now=Date.now,saveDevices=async()=>{throw Error('Gravação não configurada.');}}){
 const requests=new Map();
 return async function handle(request,peer='test'){
  const url=new URL(request.url),path=url.pathname,origin=request.headers.get('origin'),cors=origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
  if(path==='/health'&&request.method==='GET')return json({ok:true,service:'JM CONNECT R04'});
  try{
   if(path==='/webhooks/whatsapp'){
    if(!whatsapp.configured)return json({error:'WhatsApp não configurado.'},503);
    if(request.method==='GET'){const challenge=url.searchParams.get('hub.challenge');if(url.searchParams.get('hub.mode')==='subscribe'&&same(url.searchParams.get('hub.verify_token'),whatsapp.verifyToken)&&challenge&&challenge.length<=200)return new Response(challenge,{headers:{'Cache-Control':'no-store','Content-Type':'text/plain'}});return json({error:'Verificação recusada.'},403);}
    if(request.method!=='POST')return json({error:'Método não permitido.'},405);
    const raw=Buffer.from(await request.arrayBuffer());if(raw.length>3200000)return json({error:'Payload excede o limite.'},413);
    if(!verifySignature(raw,request.headers.get('x-hub-signature-256'),whatsapp.appSecret))return json({error:'Assinatura inválida.'},401);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'JSON inválido.'},400);}
    if(!body||!Array.isArray(body.entry))return json({error:'Evento inválido.'},400);
    whatsapp.receive(body);return json({received:true});
   }
   if(!path.startsWith('/api/'))return json({error:'Rota não encontrada.'},404);
   if(origin&&!origins.includes(origin))return json({error:'Origem não autorizada.'},403);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'300'}});
   if(adminToken.length<32)return json({error:'Configure JM_ADMIN_TOKEN no servidor.'},503,cors);
   const bucket=requests.get(peer)??{at:now(),n:0};if(now()-bucket.at>60000){bucket.at=now();bucket.n=0;}bucket.n++;requests.set(peer,bucket);
   if(requests.size>1024)for(const[k,v]of requests)if(now()-v.at>60000)requests.delete(k);
   if(bucket.n>120)return json({error:'Muitas solicitações. Aguarde um minuto.'},429,cors);
   if(!same(request.headers.get('authorization'),`Bearer ${adminToken}`))return json({error:'Chave do servidor recusada.'},401,cors);
   let body={};if(request.method==='POST'){
    if(!(request.headers.get('content-type')??'').startsWith('application/json'))return json({error:'Use JSON.'},415,cors);
    const raw=await request.text();if(raw.length>16384)return json({error:'Solicitação muito grande.'},413,cors);
    try{body=JSON.parse(raw);}catch{return json({error:'JSON inválido.'},400,cors);}
    if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Objeto JSON necessário.'},400,cors);
   }
   if(path==='/api/info'&&request.method==='GET')return json({version:'R04',tuyaConfigured:controller.tuya.configured,controlEnabled:controller.enabled,whatsapp:whatsapp.info(),deviceCount:controller.devices.length},200,cors);
   if(path==='/api/snapshot'&&request.method==='GET'){await controller.tuya.ensureToken();return json(await controller.snapshot(),200,cors);}
   if(path==='/api/catalog'&&request.method==='GET')return json({devices:controller.catalog()},200,cors);
   if(path==='/api/audit'&&request.method==='GET')return json({events:controller.store.audit()},200,cors);
   if(path==='/api/inspect'&&request.method==='POST')return json(await controller.tuya.inspect(body.deviceId),200,cors);
   if(path==='/api/whatsapp/preview'&&request.method==='POST')return json({simulation:true,...parseMessage(body.text,controller.catalog().filter(d=>d.whatsapp))},200,cors);
   if(path==='/api/devices'&&request.method==='POST'){
    if(controller.enabled||whatsapp.control)return json({error:'Pause os comandos no servidor antes de alterar o cadastro.'},409,cors);
    const next=validateConfig({version:1,devices:[...controller.devices,body.device]}),d=next.at(-1),spec=await controller.tuya.spec(d.tuyaDeviceId);
    for(const v of Object.values(d.state.values))validateValue(spec.status?.find(s=>s.code===d.state.code),v);
    for(const action of Object.keys(d.actions)){const a=d.actions[action];if(['level','temp'].includes(action)){buildCommand(d,action,action==='level'?0:a.min,spec);buildCommand(d,action,action==='level'?100:a.max,spec);}else buildCommand(d,action,undefined,spec);}
    await saveDevices(next);controller.devices=next;controller.lastSnapshot=null;return json({added:true,device:d.id},201,cors);
   }
   if(path==='/api/command'&&request.method==='POST'){
    if(typeof body.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(body.id))return json({error:'Identificador de operação inválido.'},400,cors);
    const action=controller.resolveService(body.command),result=await controller.execute({id:'api:'+body.id,...action,source:'panel'});return json(result,result.ok?200:409,cors);
   }
   return json({error:'Rota ou método não permitido.'},404,cors);
  }catch(e){return json({error:e instanceof SyntaxError?'Resposta inválida do serviço.':String(e.message??'Falha no servidor.').slice(0,300)},400,cors);}
 };
}
