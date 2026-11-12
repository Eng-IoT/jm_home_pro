export const ROOMS = [
 {id:'sala',name:'Sala de estar',icon:'sofa',color:'#ac7bff',x:-3,z:1.5,w:6,d:4.8},
 {id:'cozinha',name:'Cozinha',icon:'coffee',color:'#63d9bb',x:2.7,z:1.5,w:5.4,d:4.8},
 {id:'suite',name:'Suíte',icon:'bed',color:'#c395ee',x:-3.8,z:-2.8,w:4.4,d:3.8},
 {id:'escritorio',name:'Escritório',icon:'monitor',color:'#6abce8',x:.1,z:-2.8,w:3.4,d:3.8},
 {id:'banheiro',name:'Banheiro',icon:'drop',color:'#7ba7c6',x:3.6,z:-2.8,w:3.6,d:3.8},
 {id:'varanda',name:'Varanda',icon:'leaf',color:'#92ba91',x:0,z:4.8,w:11.4,d:1.7}
];
export const TYPES={light:{name:'Iluminação',icon:'bulb',watts:12},ac:{name:'Climatização',icon:'snow',watts:1050},curtain:{name:'Cortina',icon:'curtain',watts:0},tv:{name:'Televisão',icon:'monitor',watts:120},outlet:{name:'Tomada',icon:'plug',watts:60},fan:{name:'Ventilador',icon:'fan',watts:60}};
export const uid=()=>globalThis.crypto?.randomUUID?.()??`id-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
export const roomName=id=>ROOMS.find(r=>r.id===id)?.name??'Ambiente';
export const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const clamp=(n,min,max,def=min)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):def;
const txt=(s,n=80)=>typeof s==='string'?s.trim().slice(0,n):'';
export function initialState(){
 const specs=[['luz-sala','Luz principal','sala','light',true,24,6],['led-sala','Fita de LED','sala','light',true,18,5],['ar-sala','Ar-condicionado','sala','ac',true,1050,8],['tv-sala','Smart TV','sala','tv',false,120,4],['cortina-sala','Cortina','sala','curtain',true,0,0],['luz-cozinha','Pendentes','cozinha','light',true,24,5],['tomada-cozinha','Tomada da bancada','cozinha','outlet',false,100,1],['luz-suite','Luz da suíte','suite','light',false,18,4],['abajur','Abajur','suite','light',true,7,3],['ar-suite','Ar da suíte','suite','ac',false,900,8],['luz-escritorio','Luz do escritório','escritorio','light',true,18,8],['tomada-pc','Estação de trabalho','escritorio','outlet',false,220,6],['luz-banheiro','Luz do banheiro','banheiro','light',false,12,2],['luz-varanda','Balizadores','varanda','light',true,16,10]];
 return {schema:2,settings:{home:'Minha casa',owner:'Joelson',tariff:.95,budget:250,voice:false},devices:specs.map(([id,name,room,type,on,watts,hours])=>({id,name,room,type,on,online:true,watts,hours,level:type==='curtain'?65:80,temp:23})),scenes:[
 {id:'bom-dia',name:'Bom dia',icon:'sun',color:'amber',description:'Luz, cortinas abertas e um novo começo.',actions:[{device:'luz-sala',on:true,level:85},{device:'cortina-sala',on:true,level:100},{device:'luz-cozinha',on:true,level:100}]},
 {id:'cinema',name:'Cinema',icon:'film',color:'purple',description:'Luz suave. Seu filme favorito.',actions:[{device:'luz-sala',on:false},{device:'led-sala',on:true,level:20},{device:'cortina-sala',on:false,level:0},{device:'tv-sala',on:true},{device:'ar-sala',on:true,temp:23}]},
 {id:'boa-noite',name:'Boa noite',icon:'moon',color:'blue',description:'A casa desacelera com você.',actions:specs.filter(x=>x[3]==='light'||x[3]==='tv').map(x=>({device:x[0],on:x[0]==='abajur',...(x[0]==='abajur'?{level:15}:{})}))},
 {id:'sair',name:'Vou sair',icon:'exit',color:'green',description:'Todos os dispositivos desligados.',actions:specs.map(x=>({device:x[0],on:false,...(x[3]==='curtain'?{level:0}:{})}))}
 ],rules:[{id:'r-noite',name:'Uma noite mais tranquila',kind:'time',time:'22:00',sensor:'temperature',operator:'gt',threshold:28,scene:'boa-noite',enabled:false,lastRun:'',latched:false}],sensors:{temperature:26,humidity:62,illuminance:420},history:[],messages:[],activeScene:null};
}
export function power(d){if(!d.online||!d.on||d.type==='curtain')return 0;return d.watts*(d.type==='light'?d.level/100:1);}
export function energy(s){const devices=s.devices.filter(d=>d.type!=='curtain').map(d=>({id:d.id,name:d.name,room:d.room,kwh:d.watts*d.hours*30/1000}));const kwh=devices.reduce((n,d)=>n+d.kwh,0);return {devices,kwh,cost:kwh*s.settings.tariff,watts:s.devices.reduce((n,d)=>n+power(d),0)};}
export function log(s,message,source='Painel',status='ok'){s.history.unshift({id:uid(),at:new Date().toISOString(),message:txt(message,240),source:txt(source,40),status});s.history=s.history.slice(0,100);}
export function setDevice(s,id,patch,source='Painel',silent=false){
 const d=s.devices.find(d=>d.id===id);if(!d)return{ok:false,message:'Dispositivo não encontrado.'};if(!d.online)return{ok:false,message:`${d.name} está desconectado. Nenhum comando enviado.`};
 if(patch.temp!==undefined&&(!Number.isFinite(Number(patch.temp))||Number(patch.temp)<16||Number(patch.temp)>30))return{ok:false,message:'Escolha uma temperatura entre 16 e 30 °C.'};
 if(patch.level!==undefined&&(!Number.isFinite(Number(patch.level))||Number(patch.level)<0||Number(patch.level)>100))return{ok:false,message:'O ajuste deve ficar entre 0 e 100%.'};
 if(patch.on!==undefined)d.on=!!patch.on;
 if(patch.level!==undefined&&['light','curtain','fan'].includes(d.type)){d.level=Number(patch.level);d.on=d.level>0;}
 else if(patch.on===true&&d.level===0)d.level=d.type==='curtain'?100:80;
 else if(patch.on===false&&d.type==='curtain')d.level=0;
 if(patch.temp!==undefined&&d.type==='ac'){d.temp=Number(patch.temp);d.on=true;}
 if(patch.on===false){d.on=false;if(d.type==='curtain')d.level=0;}
 s.activeScene=null;
 const value=d.on?(d.type==='ac'?`${d.temp} °C`:['light','curtain','fan'].includes(d.type)?`${d.level}%`:'ligado'):'desligado';
 const message=`${d.name}: ${value}.`;if(!silent)log(s,message,source);return{ok:true,message};
}
export function runScene(s,id,source='Cena'){
 const scene=s.scenes.find(c=>c.id===id);if(!scene)return{ok:false,message:'Cena não encontrada.'};let changed=0,skipped=0;
 for(const a of scene.actions){const r=setDevice(s,a.device,a,source,true);r.ok?changed++:skipped++;}
 s.activeScene=id;const message=`${scene.name}: ${changed} dispositivo(s) ajustado(s).${skipped?` ${skipped} indisponível(is).`:''}`;log(s,message,source,skipped?'warning':'ok');return{ok:true,message,changed,skipped};
}
export function executeCommand(s,input){
 const q=norm(input);if(!q)return{ok:false,message:'Digite um comando.'};
 if(/\b(nao|nunca|exceto|menos|se|quando)\b/.test(q))return{ok:false,message:'Negação, exceções e condições precisam ser configuradas no painel. Nenhum dispositivo foi alterado.'};
 const sceneName=q.replace(/^(?:ativar|ative)\s+(?:o\s+)?(?:modo\s+|cena\s+)?/,'').replace(/^cena\s+/,'');
 const scene=s.scenes.find(c=>sceneName===norm(c.name));
 if(scene)return runScene(s,scene.id,'Assistente');
 if(/^(ajuda|o que voce faz|comandos)/.test(q))return{ok:true,message:'Posso ligar ou desligar luzes por ambiente, ajustar a intensidade, definir o ar entre 16 e 30 °C e ativar cenas. Experimente “Ligar luzes da sala”, “Ar da sala em 23 graus”, “Cinema” ou “Desligar tudo”.'};
 if(/(consumo|energia|potencia)/.test(q)){const e=energy(s);return{ok:true,message:`Potência estimada agora: ${e.watts.toFixed(0)} W. Projeção mensal pelos horários cadastrados: ${e.kwh.toFixed(1)} kWh. São estimativas, não leituras de um medidor.`};}
 if(/^(status|resumo|estado)/.test(q))return{ok:true,message:`${s.devices.filter(d=>d.on&&d.online).length} de ${s.devices.length} dispositivos em uso; ${s.devices.filter(d=>!d.online).length} desconectado(s). Todos os dados são simulados.`};
 const off=/\b(deslig|desligue|desligar|apague|apagar|feche|fechar)/.test(q),on=/\b(ligue|ligar|acenda|acender|abra|abrir)/.test(q);
 const percent=q.match(/(\d+)\s*%/),temp=q.match(/(\d+)\s*(?:°|grau)/);
 if((off&&on)||(off&&(temp||(percent&&Number(percent[1])>0))))return{ok:false,message:'Esse comando combina ações conflitantes. Envie uma ação por vez; nada foi alterado.'};
 if(!off&&!on&&!percent&&!temp)return{ok:false,message:'Não reconheci esse comando. Use um exemplo abaixo ou digite “ajuda”. Nenhum dispositivo foi alterado.'};
 if((temp&&(Number(temp[1])<16||Number(temp[1])>30))||(percent&&Number(percent[1])>100))return{ok:false,message:'Valor fora do intervalo: intensidade de 0 a 100%, temperatura de 16 a 30 °C.'};
 const room=ROOMS.find(r=>q.includes(norm(r.name))||q.includes(norm(r.id))||(r.id==='sala'&&q.includes('sala')));
 const type=/(luz|luzes|lampad|ilumin)/.test(q)?'light':/\b(ar|clima)/.test(q)?'ac':/cortina/.test(q)?'curtain':/\b(tv|televis)/.test(q)?'tv':/ventilador/.test(q)?'fan':/tomada/.test(q)?'outlet':null;
 const all=/\b(tudo|todos|todas)\b/.test(q);const named=s.devices.filter(d=>q.includes(norm(d.name)));
 let targets=named.length?named:s.devices.filter(d=>(!room||room.id===d.room)&&(!type||type===d.type));
 if(!all&&!type&&!named.length)return{ok:false,message:'Informe o dispositivo ou tipo, por exemplo “Ligar luzes da sala”. Nenhuma alteração feita.'};
 if(temp)targets=targets.filter(d=>d.type==='ac');if(percent)targets=targets.filter(d=>['light','curtain','fan'].includes(d.type));
 if(!targets.length)return{ok:false,message:'Não encontrei um dispositivo compatível nesse ambiente.'};
 let changed=0,skipped=0;for(const d of targets){const p={...(off?{on:false}:on?{on:true}:{}),...(temp?{temp:Number(temp[1])}:{}),...(percent?{level:Number(percent[1])}:{})};setDevice(s,d.id,p,'Assistente',true).ok?changed++:skipped++;}
 const message=`${changed} dispositivo(s) atualizado(s)${room?` em ${room.name}`:''}.${skipped?` ${skipped} desconectado(s), sem alteração.`:''}`;log(s,message,'Assistente',skipped?'warning':'ok');return{ok:changed>0,message};
}
export function evaluateRules(s,now=new Date()){
 const local=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;const results=[];
 for(const r of s.rules){if(!r.enabled)continue;let fire=false;
 if(r.kind==='time'){fire=r.time===local.slice(local.indexOf('T')+1)&&r.lastRun!==local;}
 else{const value=s.sensors[r.sensor];const met=r.operator==='gt'?value>r.threshold:value<r.threshold;fire=met&&!r.latched;r.latched=met;}
 if(fire){r.lastRun=local;results.push(runScene(s,r.scene,`Rotina: ${r.name}`));}}
 return results;
}
export function cleanState(raw){
 if(!raw||raw.schema!==2||!Array.isArray(raw.devices)||raw.devices.length>100||!Array.isArray(raw.scenes)||raw.scenes.length>30||!Array.isArray(raw.rules)||raw.rules.length>50)throw Error('Arquivo incompatível. Use uma configuração JM HOME PRO R02 (até 100 dispositivos, 30 cenas e 50 rotinas).');
 const def=initialState();const ids=new Set();const devices=raw.devices.map(d=>{if(!d||!TYPES[d.type]||!ROOMS.some(r=>r.id===d.room)||!txt(d.id)||d.id!==txt(d.id)||ids.has(d.id)||!txt(d.name))throw Error('Dispositivo inválido ou identificador duplicado.');ids.add(d.id);return{id:txt(d.id),name:txt(d.name),room:d.room,type:d.type,on:!!d.on,online:d.online!==false,watts:clamp(d.watts,0,30000,12),hours:clamp(d.hours,0,24,4),level:clamp(d.level,0,100,80),temp:clamp(d.temp,16,30,23)};});
 const sceneIds=new Set();const scenes=raw.scenes.map(c=>{if(!c||!txt(c.id)||sceneIds.has(c.id)||!txt(c.name)||!Array.isArray(c.actions)||c.actions.length>100)throw Error('Cena inválida.');sceneIds.add(c.id);return{id:txt(c.id),name:txt(c.name),description:txt(c.description,150),icon:['sun','film','moon','exit','spark'].includes(c.icon)?c.icon:'spark',color:['amber','purple','blue','green'].includes(c.color)?c.color:'purple',actions:c.actions.filter(a=>ids.has(a.device)).map(a=>({device:a.device,on:!!a.on,...(a.level!==undefined?{level:clamp(a.level,0,100)}:{}),...(a.temp!==undefined?{temp:clamp(a.temp,16,30,23)}:{})}))};});
 const ruleIds=new Set();const rules=raw.rules.map(r=>{if(!r||!txt(r.id)||ruleIds.has(r.id)||!sceneIds.has(r.scene))throw Error('Rotina inválida ou cena ausente.');ruleIds.add(r.id);return{id:txt(r.id),name:txt(r.name)||'Rotina',kind:r.kind==='sensor'?'sensor':'time',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)?r.time:'22:00',sensor:['temperature','humidity','illuminance'].includes(r.sensor)?r.sensor:'temperature',operator:r.operator==='lt'?'lt':'gt',threshold:clamp(r.threshold,-50,100000),scene:r.scene,enabled:!!r.enabled,lastRun:txt(r.lastRun,30),latched:!!r.latched};});
 return{schema:2,settings:{home:txt(raw.settings?.home,40)||def.settings.home,owner:txt(raw.settings?.owner,40)||def.settings.owner,tariff:clamp(raw.settings?.tariff,0,10,.95),budget:clamp(raw.settings?.budget,0,100000,250),voice:!!raw.settings?.voice},devices,scenes,rules,sensors:{temperature:clamp(raw.sensors?.temperature,-10,60,26),humidity:clamp(raw.sensors?.humidity,0,100,62),illuminance:clamp(raw.sensors?.illuminance,0,2000,420)},history:(Array.isArray(raw.history)?raw.history:[]).slice(0,100).filter(h=>h&&Number.isFinite(Date.parse(h.at))).map(h=>({id:uid(),at:h.at,message:txt(h.message,240),source:txt(h.source,40),status:h.status==='warning'?'warning':'ok'})),messages:(Array.isArray(raw.messages)?raw.messages:[]).slice(-30).filter(m=>m&&typeof m.text==='string').map(m=>({role:m.role==='user'?'user':'assistant',text:txt(m.text,1000)})),activeScene:sceneIds.has(raw.activeScene)?raw.activeScene:null};
}
