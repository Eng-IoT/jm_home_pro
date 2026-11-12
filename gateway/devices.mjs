import {normalize} from '../dist/wa-commands.js';
import {validId} from './tuya.mjs';
const TYPES={light:'light',outlet:'switch',tv:'switch',fan:'fan',curtain:'cover',ac:'climate'};
const allowed={light:['on','off','level'],outlet:['on','off'],tv:['on','off'],fan:['on','off','level'],curtain:['open','close','stop','level'],ac:['on','off','temp']};
const code=v=>typeof v==='string'&&/^[a-zA-Z0-9_]{1,80}$/.test(v);
const primitive=v=>typeof v==='boolean'||typeof v==='string'&&v.length<=80||Number.isFinite(v);
export function validateConfig(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.devices)||raw.devices.length>100)throw Error('devices.json deve ter version:1 e até 100 dispositivos.');
 const ids=new Set(),names=new Map(),channels=new Set();
 return raw.devices.map(d=>{
  if(!d||typeof d.id!=='string'||!/^[a-z0-9_]{1,60}$/.test(d.id)||ids.has(d.id)||!TYPES[d.type]||!validId(d.tuyaDeviceId)||typeof d.name!=='string'||!d.name.trim()||d.name.length>60||/[\n\r;]/.test(d.name))throw Error('ID, tipo, nome ou dispositivo Tuya inválido/repetido.');
  if(d.aliases!==undefined&&(!Array.isArray(d.aliases)||d.aliases.some(n=>typeof n!=='string'||/[\n\r;]/.test(n))))throw Error('Aliases devem ser nomes em uma única linha.');
  ids.add(d.id);const aliases=[...new Set([d.name,...(d.aliases??[])].map(normalize))];
  if(aliases.length>6||aliases.some(n=>!n||n.length>70))throw Error('Alias inválido.');
  for(const n of aliases){if(names.has(n)&&names.get(n)!==d.id)throw Error('Nomes e aliases devem ser únicos.');names.set(n,d.id);}
  if(!d.state||!code(d.state.code)||!d.state.values||Object.entries(d.state.values).some(([k,v])=>!['on','off','open','closed','opening','closing','cool','idle'].includes(k)||!primitive(v)))throw Error('Declare state.code e state.values com estados verificáveis.');
  const stateValues=Object.values(d.state.values);if(!stateValues.length||new Set(stateValues.map(v=>JSON.stringify(v))).size!==stateValues.length)throw Error('Mapa de estados vazio ou ambíguo.');
  const actions={};for(const[key,a]of Object.entries(d.actions??{})){
   if(!a||!allowed[d.type].includes(key)||!code(a.code))throw Error('Ação ou função Tuya inválida.');
   const channel=d.tuyaDeviceId+':'+a.code;if(channels.has(channel)&&!Object.values(actions).some(v=>v.code===a.code))throw Error('Não cadastre o mesmo canal em dois dispositivos.');channels.add(channel);
   if(['level','temp'].includes(key)){
    if(!code(a.statusCode)||![a.rawMin,a.rawMax].every(Number.isFinite)||a.rawMax<=a.rawMin)throw Error('Ajuste exige statusCode e faixa bruta crescente.');
    if(key==='temp'&&(a.unit!=='°C'||!Number.isFinite(a.min)||!Number.isFinite(a.max)||a.min<16||a.max>30||a.max<=a.min))throw Error('Climatização exige °C e limites entre 16 e 30.');
    actions[key]={code:a.code,statusCode:a.statusCode,rawMin:a.rawMin,rawMax:a.rawMax,...(key==='temp'?{min:a.min,max:a.max,unit:'°C'}:{})};
   }else{
    if(!primitive(a.value)||!a.expect||!code(a.expect.code)||!primitive(a.expect.value))throw Error('Ação exige valor e retorno esperado explícitos.');
    actions[key]={code:a.code,value:a.value,expect:{code:a.expect.code,value:a.expect.value}};
   }
  }
  if(!Object.keys(actions).length)throw Error('Cadastre ao menos uma ação.');
  return{id:d.id,name:d.name.trim(),type:d.type,tuyaDeviceId:d.tuyaDeviceId,aliases,whatsapp:d.whatsapp===true,state:{code:d.state.code,values:{...d.state.values}},actions,entity_id:`${TYPES[d.type]}.${d.id}`};
 });
}
const values=p=>{try{return typeof p.values==='string'?JSON.parse(p.values):p.values??{};}catch{return{};}};
export function validateValue(property,value){
 if(!property)throw Error('Função ou retorno não encontrado na especificação Tuya.');
 const r=values(property),type=String(property.type).toLowerCase();
 if(type==='boolean'&&typeof value==='boolean')return;
 if(type==='enum'&&typeof value==='string'&&r.range?.includes(value))return;
 if(type==='integer'&&Number.isInteger(value)&&Number.isFinite(r.min)&&Number.isFinite(r.max)&&value>=r.min&&value<=r.max&&(value-r.min)%(r.step??1)===0)return;
 throw Error('Valor incompatível com tipo, faixa ou passo da especificação Tuya.');
}
export function buildCommand(device,action,input,spec){
 const a=device.actions[action];if(!a)throw Error('Ação não liberada para este dispositivo.');
 const property=spec.functions?.find(f=>f.code===a.code);let value=a.value,expect=a.expect;
 if(action==='level'||action==='temp'){
  const min=action==='level'?0:a.min,max=action==='level'?100:a.max;
  if(!Number.isFinite(input)||input<min||input>max)throw Error('Ajuste fora dos limites cadastrados.');
  const r=values(property??{});validateValue(property,a.rawMin);validateValue(property,a.rawMax);
  const raw=a.rawMin+(input-min)/(max-min)*(a.rawMax-a.rawMin),step=r.step??1;
  value=(r.min??0)+Math.round((raw-(r.min??0))/step)*step;expect={code:a.statusCode,value};
 }
 validateValue(property,value);validateValue(spec.status?.find(f=>f.code===expect.code),expect.value);
 return{commands:[{code:a.code,value}],expect};
}
export const statusMap=rows=>new Map((Array.isArray(rows)?rows:[]).map(r=>[r.code,r.value]));
export function toEntity(device,reading){
 const status=statusMap(reading.status),raw=status.get(device.state.code),state=Object.entries(device.state.values).find(([,v])=>v===raw)?.[0]??'unknown';
 const a={friendly_name:device.name,aliases:device.aliases,supported_features:0},axis=device.actions.level??device.actions.temp;
 if(axis){const val=status.get(axis.statusCode);if(Number.isFinite(val)&&val>=axis.rawMin&&val<=axis.rawMax){const low=device.actions.temp?axis.min:0,high=device.actions.temp?axis.max:100,v=low+(val-axis.rawMin)/(axis.rawMax-axis.rawMin)*(high-low);if(device.type==='light')a.brightness=Math.round(v/100*255);if(device.type==='fan')a.percentage=v;if(device.type==='curtain')a.current_position=v;if(device.type==='ac')a.temperature=Math.round(v*10)/10;}}
 if(device.type==='light')a.supported_color_modes=device.actions.level?['brightness']:['onoff'];
 if(device.type==='fan')a.supported_features=device.actions.level?1:0;
 if(device.type==='curtain')a.supported_features=(device.actions.open?1:0)|(device.actions.close?2:0)|(device.actions.level?4:0)|(device.actions.stop?8:0);
 if(device.type==='ac'){a.supported_features=device.actions.temp?1:0;a.hvac_modes=[...(device.actions.on?['cool']:[]),...(device.actions.off?['off']:[])];a.min_temp=device.actions.temp?.min??16;a.max_temp=device.actions.temp?.max??30;}
 return{entity_id:device.entity_id,state:reading.online?state:'unavailable',attributes:a};
}
export function actionFromService(device,command){
 if(command.domain!==device.entity_id.split('.')[0])throw Error('Domínio incompatível.');
 const p=command.service_data??{},s=command.service;
 if(s==='turn_on'&&p.brightness_pct!==undefined)return{action:'level',value:p.brightness_pct};
 if(s==='turn_on')return{action:'on'};if(s==='turn_off')return{action:'off'};
 if(s==='set_percentage')return{action:'level',value:p.percentage};
 if(s==='set_cover_position')return{action:'level',value:p.position};
 if(['open_cover','close_cover','stop_cover'].includes(s))return{action:({open_cover:'open',close_cover:'close',stop_cover:'stop'})[s]};
 if(s==='set_hvac_mode'&&['cool','off'].includes(p.hvac_mode))return{action:p.hvac_mode==='cool'?'on':'off'};
 if(s==='set_temperature'){if(p.hvac_mode!==undefined)throw Error('No Tuya, ajuste temperatura e modo em ações separadas.');return{action:'temp',value:p.temperature};}
 throw Error('Serviço não permitido pelo adaptador Tuya.');
}
export const services={light:{turn_on:{},turn_off:{}},switch:{turn_on:{},turn_off:{}},fan:{turn_on:{},turn_off:{},set_percentage:{}},cover:{open_cover:{},close_cover:{},stop_cover:{},set_cover_position:{}},climate:{set_hvac_mode:{},set_temperature:{}}};
