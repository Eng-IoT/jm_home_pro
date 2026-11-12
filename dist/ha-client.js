// Protocolo oficial: https://developers.home-assistant.io/docs/api/websocket/
// Sem dependências externas; token somente em memória durante a autenticação.
export function websocketURL(input, protocol = globalThis.location?.protocol ?? 'https:') {
  let u; try { u=new URL(String(input).trim()); } catch { throw Error('Informe o endereço completo da central, incluindo https://.'); }
  if(!['http:','https:','ws:','wss:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('Use um endereço HTTP(S) sem usuário, senha ou parâmetros.');
  u.protocol=['https:','wss:'].includes(u.protocol)?'wss:':'ws:';
  if(protocol==='https:'&&u.protocol==='ws:')throw Error('Este painel HTTPS exige uma central HTTPS/WSS. Para central HTTP, use a versão local do painel. Consulte o guia.');
  if(u.protocol==='ws:'&&!/^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)$/.test(u.hostname))throw Error('Para acesso fora da rede local, use HTTPS.');
  u.pathname=u.pathname.replace(/\/$/,'').replace(/\/api\/websocket$/,'')+'/api/websocket';return u.href;
}
export class HAClient {
  constructor({WebSocketImpl=globalThis.WebSocket,timeout=10000,heartbeat=20000,onStatus=()=>{},onState=()=>{}}={}) {
    Object.assign(this,{WebSocketImpl,timeout,heartbeat,onStatus,onState});this.status='offline';this.socket=null;this.pending=new Map();this.states=new Map();this.services={};this.config={};this.nextId=0;this.generation=0;
  }
  statusTo(status,message=''){this.status=status;this.message=message;this.onStatus(status,message);}
  disconnect(message='Central desconectada. Reconecte manualmente para retomar.') {
    this.generation++;const socket=this.socket;this.socket=null;
    if(socket){socket.onmessage=socket.onclose=socket.onerror=null;try{socket.close();}catch{}}
    clearTimeout(this.authTimer);clearInterval(this.pingTimer);
    if(this.authReject){const reject=this.authReject;this.authReject=null;reject(Error(message));}
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(message));}this.pending.clear();this.states.clear();this.services={};this.config={};this.buffer=null;this.statusTo('offline',message);
  }
  async connect(address,accessToken,pageProtocol) {
    const url=websocketURL(address,pageProtocol);if(typeof accessToken!=='string'||!accessToken.trim())throw Error('Informe o token da central.');
    this.disconnect('Preparando conexão.');const generation=this.generation;let token=accessToken.trim();accessToken='';this.nextId=0;this.statusTo('connecting','Autenticando na central…');
    try {
      const socket=new this.WebSocketImpl(url);this.socket=socket;
      await new Promise((resolve,reject)=>{
        this.authReject=reject;this.authTimer=setTimeout(()=>this.disconnect('A central não respondeu à autenticação.'),this.timeout);
        socket.onerror=()=>this.disconnect('Conexão falhou. Confira endereço, certificado e acesso à rede.');
        socket.onclose=()=>this.disconnect('Conexão perdida. Comandos bloqueados; reconecte manualmente.');
        socket.onmessage=({data})=>{
          if(socket!==this.socket)return;let m;try{m=JSON.parse(data);}catch{this.disconnect('Resposta inválida da central.');return;}
          if(m.type==='auth_required'){socket.send(JSON.stringify({type:'auth',access_token:token}));token='';}
          else if(m.type==='auth_ok'){clearTimeout(this.authTimer);this.authReject=null;this.statusTo('syncing','Carregando entidades…');resolve();}
          else if(m.type==='auth_invalid'){token='';this.disconnect('Token recusado. Confira o usuário e o token no Home Assistant.');}
          else this.receive(m);
        };
      });
      // Eventos durante a leitura inicial são reaplicados depois do snapshot.
      this.buffer=[];const subscription=this.request({type:'subscribe_events',event_type:'state_changed'});this.subscriptionId=this.nextId;await subscription;
      const [states,services,config]=await Promise.all([this.request({type:'get_states'}),this.request({type:'get_services'}),this.request({type:'get_config'})]);
      if(socket!==this.socket||!Array.isArray(states))throw Error('Não foi possível ler as entidades da central.');
      this.states=new Map(states.filter(s=>s&&typeof s.entity_id==='string').map(s=>[s.entity_id,s]));for(const ev of this.buffer??[])this.applyEvent(ev);this.buffer=null;this.services=services??{};this.config=config??{};
      this.statusTo('connected','Central conectada. Estados recebidos do Home Assistant.');
      this.pingTimer=setInterval(()=>this.request({type:'ping'}).catch(()=>this.disconnect('Central sem resposta. Comandos bloqueados.')),this.heartbeat);return this.states;
    }catch(e){token='';if(this.generation===generation)this.disconnect(e.message);throw e;}
  }
  receive(m){
    if((m.type==='result'||m.type==='pong')&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);clearTimeout(p.timer);if(m.type==='pong'||m.success===true)p.resolve(m.result);else p.reject(Error(`Central recusou a ação (${String(m.error?.code??'erro').slice(0,50)}).`));}
    else if(m.type==='event'&&m.id===this.subscriptionId&&m.event?.event_type==='state_changed'){if(this.buffer)this.buffer.push(m.event.data);else this.applyEvent(m.event.data);}
  }
  applyEvent(data){if(!data||typeof data.entity_id!=='string')return;if(data.new_state)this.states.set(data.entity_id,data.new_state);else this.states.delete(data.entity_id);this.onState(data.entity_id,data.new_state??null);}
  request(body){
    if(!this.socket||this.socket.readyState!==1||!['connected','syncing'].includes(this.status))return Promise.reject(Error('Central desconectada. Nenhum comando enviado.'));
    const id=++this.nextId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Tempo de resposta excedido. Resultado desconhecido; verifique a central antes de repetir.'));},this.timeout);this.pending.set(id,{resolve,reject,timer});try{this.socket.send(JSON.stringify({...body,id}));}catch{this.pending.delete(id);clearTimeout(timer);reject(Error('Não foi possível enviar o comando.'));}});
  }
  async refresh(){if(this.refreshing)return this.refreshing;const socket=this.socket;this.buffer=[];this.refreshing=(async()=>{try{const states=await this.request({type:'get_states'});if(socket!==this.socket||!Array.isArray(states))throw Error('Leitura de estados inválida.');this.states=new Map(states.map(s=>[s.entity_id,s]));for(const ev of this.buffer??[])this.applyEvent(ev);return this.states;}finally{this.buffer=null;this.refreshing=null;}})();return this.refreshing;}
  call(command){return this.request({type:'call_service',...command});}
}
