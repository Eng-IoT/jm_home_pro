import http from 'node:http';
import {readFileSync,mkdirSync,chmodSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {Tuya} from './tuya.mjs';
import {validateConfig} from './devices.mjs';
import {Store} from './store.mjs';
import {Controller} from './controller.mjs';
import {WhatsApp} from './whatsapp.mjs';
import {createHandler} from './http.mjs';
const env=process.env,origins=(env.JM_ALLOWED_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean);
for(const value of origins){const u=new URL(value);if(u.origin!==value||u.username||u.password||!['https:','http:'].includes(u.protocol))throw Error('JM_ALLOWED_ORIGINS exige origens exatas, sem caminho ou curingas.');}
const configPath=resolve(env.JM_DEVICES_FILE||'gateway/devices.json');
let devices;try{devices=validateConfig(JSON.parse(readFileSync(configPath,'utf8')));}catch(e){console.error('Não foi possível ler/validar JM_DEVICES_FILE:',e instanceof SyntaxError?'JSON inválido.':e.code==='ENOENT'?'Crie gateway/devices.json a partir do exemplo.':e.message);process.exit(1);}
const dbPath=resolve(env.JM_DB_PATH||'gateway/data/jm-connect.sqlite');mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
const store=new Store(dbPath);try{chmodSync(dbPath,0o600);}catch{}
const tuya=new Tuya({clientId:env.TUYA_CLIENT_ID,secret:env.TUYA_CLIENT_SECRET,region:env.TUYA_REGION});
const controller=new Controller({devices,tuya,store,enabled:env.JM_CONTROL_ENABLED==='true'});
const senders=(env.WA_ALLOWED_SENDERS??'').split(',').map(s=>s.trim()).filter(Boolean);
if(senders.some(n=>!/^[1-9]\d{7,14}$/.test(n)||n===env.WA_BOT_NUMBER))throw Error('Remetentes devem ser números internacionais sem +, distintos do bot.');
const whatsapp=new WhatsApp({token:env.WA_ACCESS_TOKEN,appSecret:env.WA_APP_SECRET,verifyToken:env.WA_VERIFY_TOKEN,phoneId:env.WA_PHONE_NUMBER_ID,version:env.WA_GRAPH_VERSION,senders,control:env.WA_CONTROL_ENABLED==='true',botNumber:env.WA_BOT_NUMBER,store,controller});
const saveDevices=async devices=>{const temp=configPath+'.tmp';writeFileSync(temp,JSON.stringify({version:1,devices},null,2)+'\n',{mode:0o600});renameSync(temp,configPath);};
const handle=createHandler({controller,whatsapp,adminToken:env.JM_ADMIN_TOKEN,origins,saveDevices});
const staticRoot=resolve('dist'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.zip':'application/zip'};
const server=http.createServer(async(req,res)=>{
 let size=0;const chunks=[];
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&!path.startsWith('/api/')&&!path.startsWith('/webhooks/')&&path!=='/health'){
   const asset=resolve(staticRoot,'.'+(path==='/'?'/index.html':decodeURIComponent(path))),extension=extname(asset);
   if(asset.startsWith(staticRoot+'/')&&mime[extension]&&statSync(asset,{throwIfNoEntry:false})?.isFile()){res.writeHead(200,{'Content-Type':mime[extension],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(readFileSync(asset));return;}
  }
  for await(const chunk of req){size+=chunk.length;if(size>3200000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const method=req.method??'GET',request=new Request('http://localhost'+req.url,{method,headers:req.headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
  const response=await handle(request,req.socket.remoteAddress??'unknown');res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Falha interna. Consulte o estado antes de repetir."}');}
});
server.requestTimeout=15000;server.headersTimeout=10000;
const host=env.JM_HOST||'127.0.0.1',port=Number(env.JM_PORT||8787);
server.listen(port,host,()=>console.log(`JM CONNECT R04 em ${host}:${port}. Tuya: ${tuya.configured?'credenciais presentes':'pendente'}. WhatsApp: ${whatsapp.configured?'parâmetros presentes':'pendente'}. Controle: ${controller.enabled?'habilitado':'leitura'}.`));
const timer=setInterval(()=>whatsapp.drain().catch(()=>console.error('Falha na fila; comandos em andamento não serão repetidos.')),1000);
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(timer);server.close(()=>{if(!whatsapp.working){store.close();process.exit(0);}});setTimeout(()=>process.exit(0),12000).unref();});
