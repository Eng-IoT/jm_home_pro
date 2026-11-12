export const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
export const helpText='Envie uma ação e o nome exato: ligar luz da sala, desligar luz da sala, status luz da sala, ajustar luz da sala em 50%, abrir/fechar/parar cortina da sala ou temperatura ar da sala em 23 graus. Use dispositivos para consultar os nomes.';
export function parseMessage(text,devices=[]){
 const fail=message=>({error:message});
 if(typeof text!=='string'||text.length>180||/[\n\r;]/.test(text))return fail('Comando não executado. Envie uma ação por mensagem, com até 180 caracteres.');
 const s=normalize(text);if(/\b(nao|nunca|exceto|menos|depois|se|talvez)\b/.test(s))return fail('Comando não executado. Negações e condições não são aceitas.');
 if(['ajuda','menu','comandos'].includes(s))return{action:'help'};
 if(['dispositivos','listar dispositivos'].includes(s))return{action:'list'};
 let m,action,name,value;
 if((m=s.match(/^(ligar|ligue|acender|acenda|desligar|desligue|apagar|apague|abrir|abra|fechar|feche|parar|pare|status|estado)\s+(.+)$/))){action=({ligar:'on',ligue:'on',acender:'on',acenda:'on',desligar:'off',desligue:'off',apagar:'off',apague:'off',abrir:'open',abra:'open',fechar:'close',feche:'close',parar:'stop',pare:'stop',status:'status',estado:'status'})[m[1]];name=m[2];}
 else if((m=s.match(/^ajustar\s+(.+)\s+(?:em|para)\s+(\d+(?:[.,]\d+)?)\s*%$/))){action='level';name=m[1];value=Number(m[2].replace(',','.'));if(value<0||value>100)return fail('Ajuste permitido: 0 a 100%.');}
 else if((m=s.match(/^temperatura\s+(?:(?:de|da|do)\s+)?(.+)\s+(?:em|para)\s+(\d+(?:[.,]\d+)?)\s*(?:graus|°c|c)$/))){action='temp';name=m[1];value=Number(m[2].replace(',','.'));if(value<16||value>30)return fail('Temperatura permitida: 16 a 30 °C, respeitando o dispositivo.');}
 else return fail('Comando não reconhecido. Envie ajuda para consultar a sintaxe.');
 const names=[name,name.replace(/^(?:a|o)\s+/,'')];const found=devices.filter(d=>[d.name,...(d.aliases??[])].some(n=>names.includes(normalize(n))));
 if(found.length!==1)return fail('Nome desconhecido ou ambíguo. Use dispositivos e envie um nome exato.');
 if(action!=='status'&&!found[0].actions?.[action])return fail('Esta ação não está liberada para o dispositivo.');
 return{device:found[0].id,action,...(value===undefined?{}:{value})};
}
