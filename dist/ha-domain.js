export const DOMAINS={light:['light','switch'],outlet:['switch'],tv:['media_player','switch'],fan:['fan','switch'],curtain:['cover'],ac:['climate']};
export const compatible=(d,e)=>!!e&&(DOMAINS[d.type]??[]).includes(e.entity_id?.split('.')[0]);
export const available=e=>!!e&&!['unavailable','unknown'].includes(e.state);
export function adjustable(d,e){if(!compatible(d,e)||!available(e))return false;const a=e.attributes??{},domain=e.entity_id.split('.')[0];if(d.type==='light')return domain==='light'&&(a.supported_color_modes??[]).some(m=>!['onoff','unknown'].includes(m));if(d.type==='curtain')return !!(Number(a.supported_features)&4);if(d.type==='fan')return domain==='fan'&&!!(Number(a.supported_features)&1);if(d.type==='ac')return !!(Number(a.supported_features)&1);return false;}
export function projectState(d,e){
 if(!compatible(d,e)||!available(e))return {...d,online:false,on:false};const a=e.attributes??{},domain=e.entity_id.split('.')[0];const p={online:true,on:!['off','closed','standby'].includes(e.state)};
 if(domain==='light'&&Number.isFinite(a.brightness))p.level=Math.round(a.brightness/255*100);
 if(domain==='cover')p.level=Number.isFinite(a.current_position)?a.current_position:e.state==='closed'?0:e.state==='open'?100:0;
 if(domain==='fan'&&Number.isFinite(a.percentage))p.level=a.percentage;
 if(domain==='climate'&&Number.isFinite(a.temperature))p.temp=a.temperature;
 return {...d,...p};
}
export function serviceFor(d,e,p,services={},config={}){
 if(!compatible(d,e))throw Error('Dispositivo sem vínculo compatível. Configure em Conexões reais.');if(!available(e))throw Error('Entidade indisponível. Nenhum comando enviado.');
 const domain=e.entity_id.split('.')[0],a=e.attributes??{},v=p.level,t=p.temp;
 if(v!==undefined&&(!Number.isFinite(v)||v<0||v>100))throw Error('Ajuste fora do intervalo de 0 a 100%.');if(t!==undefined&&(!Number.isFinite(t)||t<16||t>30))throw Error('Temperatura fora do intervalo de 16 a 30 °C.');
 const c={domain,service:'',target:{entity_id:e.entity_id},service_data:{}};
 if(domain==='cover'){
   if(p.stop){if(!(Number(a.supported_features)&8))throw Error('Esta cortina não informa suporte a parar.');c.service='stop_cover';}
   else if(v!==undefined){if(!adjustable(d,e))throw Error('Cortina sem posição ajustável. Use abrir/fechar.');c.service='set_cover_position';c.service_data.position=v;}
   else {if(!(Number(a.supported_features)&(p.on?1:2)))throw Error('Ação não suportada pela cortina.');c.service=p.on?'open_cover':'close_cover';}
 }else if(domain==='climate'){
   if(t!==undefined){if(config.unit_system?.temperature!=='°C')throw Error('Configure a central para utilizar °C.');if(!adjustable(d,e)||t<(a.min_temp??16)||t>(a.max_temp??30))throw Error('Temperatura não suportada pelo equipamento.');c.service='set_temperature';c.service_data.temperature=t;if(p.on===true){if(!(a.hvac_modes??[]).includes('cool'))throw Error('Modo de refrigeração não disponível.');c.service_data.hvac_mode='cool';}if(p.on===false){if(!(a.hvac_modes??[]).includes('off'))throw Error('Modo desligado não disponível.');c.service_data.hvac_mode='off';}}
   else {const mode=p.on?'cool':'off';if(!(a.hvac_modes??[]).includes(mode))throw Error('Modo cool/off não disponível neste equipamento.');c.service='set_hvac_mode';c.service_data.hvac_mode=mode;}
 }else if(v!==undefined&&p.on!==false){
   if(!adjustable(d,e))throw Error('Este dispositivo oferece apenas ligar/desligar.');
   if(domain==='light'){c.service=v===0?'turn_off':'turn_on';if(v>0)c.service_data.brightness_pct=v;}
   else if(domain==='fan'){c.service='set_percentage';c.service_data.percentage=v;}else throw Error('Ajuste não suportado.');
 }else {if(typeof p.on!=='boolean')throw Error('Ação inválida.');c.service=p.on?'turn_on':'turn_off';}
 if(!services[domain]?.[c.service])throw Error('A ação não está disponível na central.');return c;
}
export function matchesDesired(d,e,p){
 if(!available(e))return false;const v=projectState(d,e),a=e.attributes??{},domain=e.entity_id.split('.')[0];
 if(p.stop)return !['opening','closing'].includes(e.state);
 if(p.temp!==undefined)return Number.isFinite(a.temperature)&&Math.abs(a.temperature-p.temp)<.6&&(p.on===undefined||v.on===p.on);
 if(p.level!==undefined&&p.on!==false){const value=domain==='cover'?a.current_position:domain==='fan'?a.percentage:domain==='light'&&Number.isFinite(a.brightness)?a.brightness/255*100:undefined;if(p.level===0&&domain!=='cover')return !v.on;return Number.isFinite(value)&&Math.abs(value-p.level)<3&&(domain==='cover'||v.on);}
 if(domain==='cover')return p.on?e.state==='open':e.state==='closed';return typeof p.on==='boolean'&&v.on===p.on;
}
export function cleanConnection(raw,devices){const bindings={},used=new Set();for(const d of devices){const e=raw?.bindings?.[d.id];if(typeof e==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(e)&&e.length<=180&&(DOMAINS[d.type]??[]).includes(e.split('.')[0])&&!used.has(e)){bindings[d.id]=e;used.add(e);}}
 let address='';try{const u=new URL(raw?.address);if(['http:','https:','ws:','wss:'].includes(u.protocol)&&!u.username&&!u.password&&!u.search&&!u.hash&&u.href.length<300)address=u.href;}catch{}return{version:1,address,bindings};}
