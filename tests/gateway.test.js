import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Tuya,signRequest} from '../gateway/tuya.mjs';
import {validateConfig,buildCommand,toEntity} from '../gateway/devices.mjs';
import {Controller} from '../gateway/controller.mjs';
import {Store} from '../gateway/store.mjs';
import {WhatsApp} from '../gateway/whatsapp.mjs';
import {createHandler} from '../gateway/http.mjs';
import {parseMessage} from '../dist/wa-commands.js';
import {BridgeClient,gatewayURL} from '../dist/bridge-client.js';
import {Connections} from '../dist/connections.js';
const token='test-only-admin-key-with-more-than-32-characters';
const rawDevice={id:'luz_sala',name:'Luz da sala',aliases:['luz principal'],type:'light',tuyaDeviceId:'test_device',whatsapp:true,state:{code:'switch_led',values:{on:true,off:false}},actions:{on:{code:'switch_led',value:true,expect:{code:'switch_led',value:true}},off:{code:'switch_led',value:false,expect:{code:'switch_led',value:false}}}};
const spec={functions:[{code:'switch_led',type:'Boolean',values:'{}'},{code:'bright',type:'Integer',values:'{"min":10,"max":1000,"step":1}'}],status:[{code:'switch_led',type:'Boolean',values:'{}'},{code:'bright',type:'Integer',values:'{"min":10,"max":1000,"step":1}'}]};
const devices=()=>validateConfig({version:1,devices:[structuredClone(rawDevice)]});
function fixture(opts={}){
 const store=new Store(),calls=[],messages=[];let value=false;
 const tuya={configured:true,ensureToken:async()=>{},spec:async()=>spec,read:async()=>({online:opts.online!==false,status:[{code:'switch_led',value}]}),inspect:async()=>({info:{id:'test_device',name:'Teste',online:true},spec,status:[{code:'switch_led',value}]}),command:async(id,cmd)=>{calls.push({id,cmd});if(opts.reject)throw Error('Tuya recusou');if(opts.apply!==false)value=cmd[0].value;return true;}};
 const controller=new Controller({devices:devices(),tuya,store,enabled:opts.enabled!==false,confirmTimeout:0});
 const whatsapp=new WhatsApp({token:'test-only',appSecret:'test-app-secret',verifyToken:'test-verify-token',phoneId:'111111',version:'v24.0',senders:['5599000000000'],control:true,store,controller,fetchImpl:async(url,init)=>{messages.push({url,payload:JSON.parse(init.body)});return Response.json({messages:[{id:'out-'+messages.length}]});}});
 const handler=createHandler({controller,whatsapp,adminToken:token,origins:['https://panel.example']});return{store,calls,messages,tuya,controller,whatsapp,handler};
}
const command=(entity='light.luz_sala',service='turn_on')=>({domain:'light',service,target:{entity_id:entity},service_data:{}});
const authRequest=(path,body,headers={})=>new Request('https://bridge.example'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
function payload({id='wamid.test.1',from='5599000000000',text='ligar luz da sala',stamp=String(Math.floor(Date.now()/1000)),phoneId='111111'}={}){return{object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:phoneId},messages:[{id,from,type:'text',timestamp:stamp,text:{body:text}}]}}]}]};}
const webhook=p=>{const raw=JSON.stringify(p);return new Request('https://bridge.example/webhooks/whatsapp',{method:'POST',headers:{'X-Hub-Signature-256':'sha256='+createHmac('sha256','test-app-secret').update(raw).digest('hex'),'Content-Type':'application/json'},body:raw});};

test('assinatura Tuya reproduz vetor público oficial',()=>{
 // Segredo abaixo é o exemplo público da documentação, nunca uma credencial de usuário.
 assert.equal(signRequest({clientId:'1KAD46OrT9HafiKdsXeg',secret:'4OHBOnWOqaEC1mWXOpVL3yV50s0qGSRC',timestamp:'1588925778000',nonce:'5138cc3a9033d69856923fd07b491173',method:'GET',path:'/v1.0/token?grant_type=1',headers:'area_id:29a33e8796834b1efa6\ncall_id:8afdb70ab2ed11eb85290242ac130003\n'}),'9E48A3E93B302EEECC803C7241985D0A34EB944F40FB573C7B5C2A82158AF13E');
});
test('Tuya assina requisição autenticada no data center escolhido',async()=>{
 const sent=[],api=new Tuya({clientId:'test-client',secret:'test-secret',region:'us',fetchImpl:async(url,init)=>{sent.push({url,init});return Response.json({success:true,result:url.includes('/token?')?{access_token:'fake-token',expire_time:3600}:true});}});
 await api.command('device123',[{code:'switch_led',value:true}]);assert.equal(sent.length,2);assert.equal(sent[1].url,'https://openapi.tuyaus.com/v1.0/iot-03/devices/device123/commands');assert.equal(sent[1].init.headers.access_token,'fake-token');assert.equal(sent[1].init.body,'{"commands":[{"code":"switch_led","value":true}]}');assert.equal(sent[1].init.redirect,'error');assert.throws(()=>api.command('../evil',[]));
});
test('gramática rejeita negações, condições, grupos e nomes ambíguos',()=>{
 const ds=devices();assert.equal(parseMessage('ligar luz da sala',ds).action,'on');assert.equal(parseMessage('desligue a luz principal',ds).action,'off');
 for(const text of ['não ligar luz da sala','ligar tudo','ligar luz da sala e desligar luz principal','se escurecer ligar luz da sala','ligar luz da sala\ndesligar luz da sala'])assert.ok(parseMessage(text,ds).error);
 assert.ok(parseMessage('ligar luz da sala',[...ds,...ds]).error);
});
test('cadastro rejeita aliases, canais duplicados e ignora campos extras',()=>{
 for(const d of [{...rawDevice,id:undefined},{...rawDevice,aliases:[{}]},{...rawDevice,aliases:['luz\nsala']}])assert.throws(()=>validateConfig({version:1,devices:[d]}));
 assert.throws(()=>validateConfig({version:1,devices:[rawDevice,{...rawDevice,id:'outra',name:'Outra',aliases:[]}]}));
 assert.ok(!JSON.stringify(validateConfig({version:1,devices:[{...rawDevice,token:'never-store'}]})).includes('never-store'));
});
test('especificação impede função ausente e tipo incorreto',()=>{
 const d=devices()[0];assert.equal(buildCommand(d,'on',undefined,spec).commands[0].value,true);assert.throws(()=>buildCommand(d,'level',30,spec));assert.throws(()=>buildCommand(d,'on',undefined,{functions:[],status:spec.status}));assert.throws(()=>buildCommand(d,'on',undefined,{functions:[{code:'switch_led',type:'Enum',values:'{"range":["on","off"]}'}],status:spec.status}));
});
test('intensidade converte escala e rejeita extrapolação',()=>{
 const d=devices()[0];d.actions.level={code:'bright',statusCode:'bright',rawMin:10,rawMax:1000};assert.equal(buildCommand(d,'level',50,spec).commands[0].value,505);assert.throws(()=>buildCommand(d,'level',101,spec));assert.equal(toEntity(d,{online:true,status:[{code:'switch_led',value:true},{code:'bright',value:505}]}).attributes.brightness,128);
});
test('aceite sem mudança de estado não confirma sucesso',async()=>{
 const h=fixture({apply:false});const r=await h.controller.execute({id:'api:test-0001',device:'luz_sala',action:'on'});assert.equal(r.ok,false);assert.match(r.message,/não foi confirmado/);assert.equal(h.calls.length,1);h.store.close();
});
test('ID repetido não reenvia e ID conflitante é recusado',async()=>{
 const h=fixture(),req={id:'api:test-0001',device:'luz_sala',action:'on'};assert.equal((await h.controller.execute(req)).ok,true);assert.equal((await h.controller.execute(req)).ok,true);assert.equal(h.calls.length,1);assert.equal((await h.controller.execute({...req,action:'off'})).ok,false);h.store.close();
});
test('modo leitura e dispositivo offline bloqueiam acionamentos',async()=>{
 for(const opts of [{online:false},{enabled:false}]){const h=fixture(opts);assert.equal((await h.controller.execute({id:'api:test-0001',device:'luz_sala',action:'on'})).ok,false);assert.equal(h.calls.length,0);h.store.close();}
});
test('API valida chave, origem e alvo antes de agir',async()=>{
 const h=fixture();assert.equal((await h.handler(new Request('https://bridge.example/api/info'))).status,401);assert.equal((await h.handler(authRequest('/api/command',{id:'operation-1',command:command()},{Origin:'https://evil.example'}))).status,403);assert.equal((await h.handler(authRequest('/api/command',{id:'operation-1',command:command('light.unknown')}))).status,400);assert.equal(h.calls.length,0);const r=await h.handler(authRequest('/api/command',{id:'operation-2',command:command()},{Origin:'https://panel.example'}));assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://panel.example');h.store.close();
});
test('cadastro API valida especificação antes de salvar sem acionar',async()=>{
 const h=fixture({enabled:false});h.whatsapp.control=false;let writes=0;const handler=createHandler({...h,adminToken:token,saveDevices:async()=>{writes++;}});const d={...structuredClone(rawDevice),id:'teste',name:'Outra luz',aliases:[],tuyaDeviceId:'outro_device'};assert.equal((await handler(authRequest('/api/devices',{device:d}))).status,201);assert.equal(writes,1);assert.equal(h.calls.length,0);assert.equal(h.controller.devices.length,2);h.store.close();
});
test('webhook confere desafio e assinatura',async()=>{
 const h=fixture(),url='https://bridge.example/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=1234';assert.equal(await(await h.handler(new Request(url))).text(),'1234');assert.equal((await h.handler(new Request(url.replace('test-verify-token','wrong')))).status,403);assert.equal((await h.handler(new Request('https://bridge.example/webhooks/whatsapp',{method:'POST',body:JSON.stringify(payload())}))).status,401);await h.whatsapp.drain();assert.equal(h.calls.length,0);h.store.close();
});
test('fluxo WhatsApp → webhook → Tuya → resposta e deduplicação',async()=>{
 const h=fixture();assert.equal((await h.handler(webhook(payload()))).status,200);await h.whatsapp.drain();assert.equal(h.calls.length,1);assert.equal(h.messages.length,1);assert.equal(h.messages[0].payload.to,'5599000000000');assert.match(h.messages[0].payload.text.body,/confirmado pelo Tuya/);await h.handler(webhook(payload()));await h.whatsapp.drain();assert.equal(h.calls.length,1);assert.equal(h.messages.length,1);h.store.close();
});
test('remetente, telefone do bot e timestamp são conferidos',async()=>{
 const h=fixture();for(const data of [{from:'5599111111111'},{id:'old',stamp:'1'},{id:'wrong-phone',phoneId:'2222'},{id:'future',stamp:String(Math.floor(Date.now()/1000)+300)}])await h.handler(webhook(payload(data)));await h.whatsapp.drain();assert.equal(h.calls.length,0);assert.equal(h.messages.length,0);h.store.close();
});
test('negação e WhatsApp pausado respondem sem acionar',async()=>{
 const h=fixture();await h.handler(webhook(payload({text:'não ligar luz da sala'})));await h.whatsapp.drain();assert.equal(h.calls.length,0);assert.match(h.messages[0].payload.text.body,/não executado/);h.whatsapp.control=false;await h.handler(webhook(payload({id:'paused'})));await h.whatsapp.drain();assert.equal(h.calls.length,0);assert.match(h.messages[1].payload.text.body,/pausado/);h.store.close();
});
test('falha ao responder não repete comando Tuya',async()=>{
 const h=fixture();h.whatsapp.fetchImpl=async()=>{throw Error('network');};await h.handler(webhook(payload()));await h.whatsapp.drain();await h.handler(webhook(payload()));await h.whatsapp.drain();assert.equal(h.calls.length,1);assert.equal(h.store.db.prepare('SELECT delivery FROM inbox').get().delivery,'failed_or_unknown');h.store.close();
});
test('reinício preserva deduplicação e não retoma operação incerta',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jm-test-')),path=join(dir,'db.sqlite');let s=new Store(path);s.reserve('api:interrupted','luz_sala','on','panel',Date.now());s.receive({id:'wamid.persist',sender:'5599000000000',text:'ligar luz da sala',stamp:Date.now()},Date.now());s.next();s.close();s=new Store(path);assert.equal(s.operation('api:interrupted').status,'uncertain');assert.equal(s.seen('wamid.persist'),true);assert.equal(s.next(),undefined);s.close();rmSync(dir,{recursive:true,force:true});
});
test('cliente do painel autentica, lê, comanda e limpa a chave',async()=>{
 const h=fixture(),api=new BridgeClient({pollInterval:100000,fetchImpl:async(url,init)=>h.handler(new Request(url,init))});await api.connect('https://bridge.example',token);assert.equal(api.states.get('light.luz_sala').state,'off');await api.call(command());await api.refresh();assert.equal(api.states.get('light.luz_sala').state,'on');api.disconnect();assert.equal(api.token,'');assert.equal(api.states.size,0);h.store.close();
});
test('URL bloqueia credenciais e HTTP misto',()=>{
 assert.equal(gatewayURL('https://bridge.example/'),'https://bridge.example');assert.throws(()=>gatewayURL('https://u:pass@bridge.example'));assert.throws(()=>gatewayURL('http://192.168.1.1:8787','https:'));assert.throws(()=>gatewayURL('https://bridge.example/path'));assert.equal(gatewayURL('http://127.0.0.1:8787','http:'),'http://127.0.0.1:8787');
});
test('reconexão ignora leitura atrasada da sessão anterior',async()=>{
 const h=fixture();let release,delay=false;const api=new BridgeClient({pollInterval:100000,fetchImpl:async(url,init)=>{if(delay&&url.endsWith('/api/snapshot')){delay=false;return new Promise(resolve=>{release=resolve;});}return h.handler(new Request(url,init));}});await api.connect('https://bridge.example',token);delay=true;const oldRead=api.refresh(),rejected=assert.rejects(oldRead,/Conexão mudou/);api.disconnect();await api.connect('https://bridge.example',token);release(Response.json({states:[],controlEnabled:false}));await rejected;assert.equal(api.status,'connected');assert.equal(api.states.size,1);assert.equal(api.controlEnabled,true);api.disconnect();h.store.close();
});
test('eventos de entrega e estruturas desconhecidas não acionam cargas',async()=>{
 const h=fixture();await h.handler(webhook(payload()));await h.whatsapp.drain();const p=payload(),v=p.entry[0].changes[0].value;v.messages=null;v.statuses=[null,{id:{},status:'read'},{id:'out-1',status:'delivered'}];assert.equal((await h.handler(webhook(p))).status,200);assert.equal(h.store.db.prepare('SELECT delivery FROM inbox').get().delivery,'delivered');assert.equal((await h.handler(webhook({object:'whatsapp_business_account',entry:[null,{changes:{}}]}))).status,200);assert.equal(h.calls.length,1);h.store.close();
});
test('vínculos Tuya e Home Assistant são independentes',()=>{
 const storage=new Map(),c=new Connections({getDevices:()=>[{id:'l1',type:'light'}],storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},defaultProvider:'tuya'});c.config.address='https://bridge.example';c.config.bindings={l1:'light.luz_sala'};c.persist();c.selectProvider('ha');assert.deepEqual(c.config.bindings,{});c.config.address='https://ha.example';c.config.bindings={l1:'light.ha'};c.persist();c.selectProvider('tuya');assert.equal(c.config.bindings.l1,'light.luz_sala');assert.equal(c.config.address,'https://bridge.example/');c.api.disconnect();
});
