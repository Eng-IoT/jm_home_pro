import {createHash,createHmac,randomUUID} from 'node:crypto';
export const REGIONS=Object.freeze({us:'https://openapi.tuyaus.com',us_east:'https://openapi-ueaz.tuyaus.com',eu:'https://openapi.tuyaeu.com',eu_west:'https://openapi-weaz.tuyaeu.com',cn:'https://openapi.tuyacn.com',in:'https://openapi.tuyain.com',sg:'https://openapi-sg.iotbing.com'});
export const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
export function signRequest({clientId,secret,token='',timestamp,nonce='',method,path,body='',headers=''}){
 const hash=createHash('sha256').update(body).digest('hex');
 const text=`${method.toUpperCase()}\n${hash}\n${headers}\n${path}`;
 return createHmac('sha256',secret).update(clientId+token+timestamp+nonce+text).digest('hex').toUpperCase();
}
export class Tuya{
 constructor({clientId='',secret='',region='',fetchImpl=fetch,now=Date.now,timeout=10000}){Object.assign(this,{clientId,secret,region,fetchImpl,now,timeout});this.token='';this.expires=0;}
 get configured(){return !!(this.clientId&&this.secret&&REGIONS[this.region]);}
 async request(method,path,body,withToken=true){
  if(!this.configured)throw Error('Configure TUYA_CLIENT_ID, TUYA_CLIENT_SECRET e TUYA_REGION no servidor.');
  if(withToken)await this.ensureToken();
  const raw=body===undefined?'':JSON.stringify(body),timestamp=String(this.now()),nonce=randomUUID();
  const headers={client_id:this.clientId,t:timestamp,nonce,sign_method:'HMAC-SHA256','Content-Type':'application/json',sign:signRequest({clientId:this.clientId,secret:this.secret,token:withToken?this.token:'',timestamp,nonce,method,path,body:raw})};
  if(withToken)headers.access_token=this.token;
  let response,json;try{response=await this.fetchImpl(REGIONS[this.region]+path,{method,headers,...(raw?{body:raw}:{}),redirect:'error',signal:AbortSignal.timeout(this.timeout)});json=await response.json();}catch{throw Error('Tuya sem resposta. Resultado desconhecido; não houve reenvio automático.');}
  if(!response.ok||json.success!==true){if(['1010','1011'].includes(String(json.code))){this.token='';this.expires=0;}throw Error(`Tuya recusou a solicitação (código ${String(json.code??response.status).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)}). Confira autorização, região e serviços do projeto.`);}
  return json.result;
 }
 async ensureToken(){
  if(this.token&&this.now()<this.expires)return;
  if(!this.tokenJob)this.tokenJob=(async()=>{try{const r=await this.request('GET','/v1.0/token?grant_type=1',undefined,false);if(!r?.access_token||!Number.isFinite(r.expire_time))throw Error('Token Tuya inválido.');this.token=r.access_token;this.expires=this.now()+Math.max(0,r.expire_time-60)*1000;}finally{this.tokenJob=null;}})();
  return this.tokenJob;
 }
 path(id,suffix=''){if(!validId(id))throw Error('Identificador Tuya inválido.');return `/v1.0/iot-03/devices/${encodeURIComponent(id)}${suffix}`;}
 async inspect(id){const[info,spec,status]=await Promise.all([this.request('GET',this.path(id)),this.request('GET',this.path(id,'/specification')),this.request('GET',this.path(id,'/status'))]);return{info:{id:info.id??id,name:info.name??id,online:info.online===true,category:info.category??spec.category},spec,status};}
 async read(id){const[info,status]=await Promise.all([this.request('GET',this.path(id)),this.request('GET',this.path(id,'/status'))]);return{online:info.online===true,status};}
 spec(id){return this.request('GET',this.path(id,'/specification'));}
 command(id,commands){return this.request('POST',this.path(id,'/commands'),{commands});}
}
