"""Fixture de protocolo para QA. Não é Home Assistant nem controla equipamentos.
Requer Python + pacote websockets; escuta somente loopback; token fictício: test-only.
"""
import asyncio,json
from websockets.asyncio.server import serve
states={
 'light.bancada':{'entity_id':'light.bancada','state':'off','attributes':{'friendly_name':'Luz de bancada (TESTE)','supported_color_modes':['brightness'],'brightness':200}},
 'switch.rele':{'entity_id':'switch.rele','state':'off','attributes':{'friendly_name':'Relé (TESTE)'}},
 'cover.cortina':{'entity_id':'cover.cortina','state':'closed','attributes':{'friendly_name':'Cortina (TESTE)','current_position':0,'supported_features':15}},
 'climate.ar':{'entity_id':'climate.ar','state':'off','attributes':{'friendly_name':'Clima (TESTE)','temperature':24,'supported_features':1,'min_temp':16,'max_temp':30,'hvac_modes':['off','cool']}}
}
services={d:{s:{} for s in names} for d,names in {'light':['turn_on','turn_off'],'switch':['turn_on','turn_off'],'cover':['open_cover','close_cover','stop_cover','set_cover_position'],'climate':['set_temperature','set_hvac_mode']}.items()}
async def handler(ws):
 await ws.send(json.dumps({'type':'auth_required'}));authenticated=False;subscription=None
 async for raw in ws:
  m=json.loads(raw);typ=m.get('type');ident=m.get('id')
  if typ=='auth':
   authenticated=m.get('access_token')=='test-only';await ws.send(json.dumps({'type':'auth_ok' if authenticated else 'auth_invalid'}))
   if not authenticated:await ws.close();break
   continue
  if not authenticated:await ws.close();break
  result=None
  if typ=='subscribe_events':subscription=ident
  elif typ=='get_states':result=list(states.values())
  elif typ=='get_services':result=services
  elif typ=='get_config':result={'unit_system':{'temperature':'°C'},'location_name':'CENTRAL DE TESTE'}
  elif typ=='ping':await ws.send(json.dumps({'type':'pong','id':ident}));continue
  elif typ=='call_service':
   e=states[m['target']['entity_id']];s=m['service'];v=m.get('service_data',{})
   if s in ['turn_on','turn_off']:e['state']='on' if s=='turn_on' else 'off'
   if 'brightness_pct' in v:e['attributes']['brightness']=round(v['brightness_pct']*2.55)
   if s in ['open_cover','close_cover','set_cover_position']:e['attributes']['current_position']=v.get('position',100 if s=='open_cover' else 0);e['state']='open' if e['attributes']['current_position'] else 'closed'
   if s=='set_hvac_mode':e['state']=v['hvac_mode']
   if s=='set_temperature':e['attributes']['temperature']=v['temperature'];e['state']=v.get('hvac_mode',e['state'])
   print('TEST SERVICE',m['domain'],s,m['target']['entity_id'],flush=True)
   if subscription:await ws.send(json.dumps({'type':'event','id':subscription,'event':{'event_type':'state_changed','data':{'entity_id':e['entity_id'],'new_state':e}}}))
  await ws.send(json.dumps({'type':'result','id':ident,'success':True,'result':result}))
async def main():
 async with serve(handler,'127.0.0.1',8765):
  print('Fixture Home Assistant (somente testes): http://127.0.0.1:8765',flush=True);await asyncio.Future()
if __name__=='__main__':asyncio.run(main())
