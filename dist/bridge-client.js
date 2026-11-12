export function gatewayURL(input,protocol=globalThis.location?.protocol??'https:'){
 let u;try{u=new URL(String(input).trim());}catch{throw Error('Informe a URL completa do servidor JM CONNECT.');}
 if(u.username||u.password||u.search||u.hash||!['https:','http:'].includes(u.protocol)||u.pathname!=='/')throw Error('Use a origem do servidor, sem caminho, parâmetros ou credenciais.');
 if(u.protocol==='http:'&&(protocol==='https:'||!/^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)$/.test(u.hostname)))throw Error('O painel online exige servidor HTTPS com certificado válido.');return u.origin;
}
export class BridgeClient{
 constructor({onStatus=()=>{},onState=()=>{},fetchImpl=globalThis.fetch,pollInterval=60000}={}){Object.assign(this,{onStatus,onState,fetchImpl,pollInterval});this.status='offline';this.generation=0;this.states=new Map();this.services={};this.config={};this.catalog=[];this.info=null;this.token='';this.kind='tuya';}
 statusTo(status,message){this.status=status;this.onStatus(status,message);}
 disconnect(message='Servidor desconectado. O WhatsApp mantém a configuração definida no servidor.'){
  this.generation++;clearInterval(this.timer);this.abort?.abort();this.abort=null;this.readJob=null;this.token='';this.states.clear();this.services={};this.config={};this.catalog=[];this.info=null;this.controlEnabled=false;this.statusTo('offline',message);
 }
 async connect(address,token){
  const base=gatewayURL(address);if(typeof token!=='string'||token.trim().length<32)throw Error('Informe JM_ADMIN_TOKEN com pelo menos 32 caracteres.');
  this.disconnect();this.base=base;this.token=token.trim();this.abort=new AbortController();const generation=this.generation;this.statusTo('connecting','Verificando servidor e conta Tuya…');
  try{const info=await this.request('/api/info');if(generation!==this.generation)throw Error('Conexão cancelada.');this.info=info;await this.refresh();if(generation!==this.generation)throw Error('Conexão cancelada.');this.statusTo('connected','Servidor conectado. Estados consultados na nuvem Tuya.');this.timer=setInterval(()=>this.refresh().catch(()=>{}),this.pollInterval);return this.states;}
  catch(e){if(generation===this.generation)this.disconnect(e.message);throw e;}
 }
 async request(path,data){
  if(!this.token||!this.abort)throw Error('Conecte primeiro o JM CONNECT.');
  let r,j;try{r=await this.fetchImpl(this.base+path,{method:data===undefined?'GET':'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(45000)])});j=await r.json();}catch{throw Error('Servidor sem resposta. Confira HTTPS, rede e origem autorizada. O comando não será repetido.');}
  if(!r.ok)throw Error(String(j.error??j.message??'Servidor recusou a solicitação.').slice(0,300));return j;
 }
 async refresh(){
  if(this.readJob)return this.readJob;const generation=this.generation;
  this.readJob=(async()=>{try{const r=await this.request('/api/snapshot');if(generation!==this.generation)throw Error('Conexão mudou.');if(!Array.isArray(r.states))throw Error('Resposta inválida.');this.states=new Map(r.states.map(s=>[s.entity_id,s]));this.services=r.services??{};this.config=r.config??{};this.catalog=r.catalog??[];this.controlEnabled=r.controlEnabled===true;this.lastRead=r.at;this.onState();return this.states;}catch(e){if(generation===this.generation)this.disconnect(e.message);throw e;}finally{if(generation===this.generation)this.readJob=null;}})();return this.readJob;
 }
 validate(command){
  const d=this.catalog.find(d=>d.entity_id===command.target?.entity_id);if(!d)throw Error('Canal não cadastrado no servidor Tuya.');
  const p=command.service_data??{},action=({turn_on:p.brightness_pct!==undefined?'level':'on',turn_off:'off',set_percentage:'level',open_cover:'open',close_cover:'close',stop_cover:'stop',set_cover_position:'level',set_temperature:'temp',set_hvac_mode:p.hvac_mode==='cool'?'on':'off'})[command.service];
  if(!action||!d.actions[action])throw Error('Ação não cadastrada para este canal Tuya.');
  if(command.service==='set_temperature'&&p.hvac_mode!==undefined)throw Error('No Tuya, configure temperatura e modo em ações separadas.');
  if(!this.controlEnabled)throw Error('Servidor em leitura. Ative JM_CONTROL_ENABLED após configurar os dispositivos.');
 }
 call(command){this.validate(command);return this.request('/api/command',{id:crypto.randomUUID(),command});}
}
