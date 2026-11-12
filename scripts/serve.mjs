import http from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost'),p=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)),type=types[extname(p)];if(!['GET','HEAD'].includes(req.method)||!p.startsWith(root+'/')||!type||!statSync(p,{throwIfNoEntry:false})?.isFile()){res.writeHead(404);res.end('Não encontrado.');return;}res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?'':readFileSync(p));}catch{res.writeHead(400);res.end('Requisição inválida.');}}).listen(8788,'127.0.0.1',()=>console.log('JM HOME PRO R04: http://localhost:8788 — demonstração. Ctrl+C encerra.'));
