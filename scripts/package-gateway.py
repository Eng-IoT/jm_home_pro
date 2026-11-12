#!/usr/bin/env python3
"""Gera guias HTML e ZIP portável usando apenas a biblioteca padrão Python."""
from pathlib import Path
import html, re, json, hashlib, zipfile
ROOT = Path(__file__).resolve().parents[1]
CSS = '''*{box-sizing:border-box}body{margin:0;background:#eff3fb;color:#233049;font:16px/1.7 system-ui,-apple-system,Segoe UI,sans-serif}header{padding:48px max(24px,calc((100% - 980px)/2));background:linear-gradient(125deg,#152844,#43316c);color:white}header small{color:#9ee6d6;letter-spacing:2px}header h1{margin:10px 0;font-size:clamp(26px,4vw,42px);line-height:1.2}header p{max-width:760px;margin-bottom:0;color:#d3dcec}main{max-width:980px;margin:32px auto 70px;padding:34px;background:white;border-radius:18px;box-shadow:0 12px 45px #21345b0d}h1,h2,h3{line-height:1.3;color:#1c3462}h2{margin-top:44px;border-top:1px solid #dfe6f2;padding-top:28px}h3{margin-top:28px}p{margin:14px 0}a{color:#365bc1;text-underline-offset:3px}pre{overflow:auto;border-radius:10px;background:#162338;color:#d7f5e9;padding:18px;font-size:13px}code{font:13px/1.6 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}p code,td code,li code{background:#eef2fa;padding:2px 5px;border-radius:4px}.table-wrap{overflow:auto;margin:20px 0}table{width:100%;border-collapse:collapse;font-size:14px;text-align:left}th{background:#edf2fb;color:#233e75}th,td{border-bottom:1px solid #e2e8f2;padding:12px;vertical-align:top}li{margin:9px 0}.notice{background:#edf8f4;border-left:4px solid #219678;padding:18px;border-radius:6px}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a{background:#304bb5;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600}footer{text-align:center;color:#62728a;font-size:12px;padding:20px}@media(max-width:650px){main{margin:18px 12px;padding:20px}header{padding:30px 22px}td,th{padding:9px;font-size:12px}}@media print{body{background:white}main{box-shadow:none;margin:0}header{background:white;color:#152844;padding:15px}header p,header small{color:#334}a{color:inherit}pre{white-space:pre-wrap}h2{break-after:avoid}.actions{display:none}}'''
def inline(s):
    s=html.escape(s)
    s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+|[^\s)]+\.md)\)',r'<a href="\2">\1</a>',s)
    return s

def render(md):
    lines=md.splitlines();out=[];i=0
    while i<len(lines):
        line=lines[i]
        if not line.strip():i+=1;continue
        if line.startswith('```'):
            code=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
            out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');i+=1;continue
        if line.startswith('#'):
            m=re.match(r'^(#{1,6})\s+(.*)',line)
            if m:out.append(f'<h{len(m[1])}>{inline(m[2])}</h{len(m[1])}>');i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?',c.replace(' ','')) for c in cells):rows.append(cells)
                i+=1
            out.append('<div class="table-wrap"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>')
            out.extend('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows[1:]);out.append('</tbody></table></div>');continue
        if re.match(r'^(?:- |\d+\. )',line):
            ordered=bool(re.match(r'^\d+\.',line));tag='ol' if ordered else 'ul';out.append('<'+tag+'>')
            while i<len(lines) and re.match(r'^(?:- |\d+\. )',lines[i]):out.append('<li>'+inline(re.sub(r'^(?:- |\d+\. )','',lines[i]))+'</li>');i+=1
            out.append('</'+tag+'>');continue
        paragraph=[line];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(?:#|\||```|- |\d+\. )',lines[i]):paragraph.append(lines[i]);i+=1
        out.append('<p>'+inline(' '.join(paragraph))+'</p>')
    return '\n'.join(out)

def page(title,subtitle,body):
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+CSS+'</style></head><body><header><small>JM HOME PRO · R04</small><h1>'+html.escape(title)+'</h1><p>'+html.escape(subtitle)+'</p></header><main>'+body+'</main><footer>Joelson Mendes · Código, configuração e comissionamento · 11/11/2026</footer></body></html>'

(ROOT/'dist/guia-tuya-whatsapp.html').write_text(page('Tuya + WhatsApp','Da configuração do servidor à validação dos equipamentos.',render((ROOT/'docs/TUYA_WHATSAPP.md').read_text())),encoding='utf-8')
start='''<p class="notice"><strong>O que você recebeu:</strong> painel com casa 3D e todo o código disponível do JM CONNECT. As integrações precisam ser configuradas e validadas com suas contas e equipamentos.</p><h2>1. Abra a demonstração</h2><p>Instale Node.js 24.22.1 ou atualização compatível da série 24. No Windows, execute <strong>INICIAR_DEMONSTRACAO.cmd</strong>. Ou abra um terminal nesta pasta:</p><pre><code>npm run demo</code></pre><p>Acesse <strong>http://localhost:8788</strong>. Mantenha o terminal aberto. Não abra dist/index.html por duplo clique.</p><h2>2. Prepare Tuya e WhatsApp</h2><p>As abas Tuya / Smart Life e WhatsApp já estão no painel. O servidor utiliza credenciais configuradas localmente e cadastro explícito de cada canal. O guia explica como instalar, autorizar remetentes e validar o primeiro equipamento.</p><div class="actions"><a href="dist/guia-tuya-whatsapp.html">Guia Tuya + WhatsApp</a><a href="dist/guia-conexao.html">Guia Home Assistant</a></div><h2>3. Confira o pacote</h2><p><strong>dist/</strong>: painel completo. <strong>gateway/</strong>: servidor e exemplos. <strong>tests/</strong>: testes automatizados. <strong>docs/</strong>: documentação e pendências. <strong>README.md</strong>: instruções gerais.</p><pre><code>npm run check\nnpm test</code></pre><p>49 testes automatizados aprovados com serviços simulados. A operação física e o tablet real ainda não foram testados.</p><h2>4. Publicar</h2><p>O painel estático pode ser publicado a partir de dist/. Há um vercel.json de referência. O servidor JM CONNECT precisa permanecer em execução com disco persistente e HTTPS; não é uma função temporária. Esta entrega em ZIP não atualizou o site publicado.</p><p>Nenhuma senha real está incluída. Preencha gateway/.env somente no seu servidor. Conectar e consultar começam em leitura. Não habilite cargas antes de conferir seus canais e retornos.</p>'''
(ROOT/'LEIA_PRIMEIRO.html').write_text(page('Seu projeto, completo em arquivos','Comece pela demonstração. Depois configure a conexão real.',start),encoding='utf-8')
allowed_root={'README.md','package.json','.gitignore','vercel.json','LEIA_PRIMEIRO.html','INICIAR_DEMONSTRACAO.cmd'}
files=[]
for p in ROOT.rglob('*'):
    if not p.is_file() or p.is_symlink():continue
    r=p.relative_to(ROOT);parts=r.parts
    if len(parts)==1 and p.name in allowed_root:files.append(p);continue
    if parts[0] not in {'dist','gateway','tests','scripts','docs'}:continue
    if any(x in {'.git','.openai','data','__pycache__','node_modules','downloads'} for x in parts):continue
    if p.name=='.env.example' or p.suffix in {'.js','.mjs','.py','.html','.css','.svg','.png','.md','.example'} or p.name in {'devices.example.json','mapping-illustrative.json'}:files.append(p)
files=sorted(files,key=lambda p:p.relative_to(ROOT).as_posix())
manifest={'project':'JM HOME PRO','revision':'R04','date':'2026-11-11','live_hardware_tested':False,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
output=ROOT.parent/'JM_HOME_PRO_R04_COMPLETO.zip'
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,'JM_HOME_PRO_R04/'+p.relative_to(ROOT).as_posix())
    z.writestr('JM_HOME_PRO_R04/INVENTARIO.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(output) as z:
    if z.testzip() is not None:raise SystemExit('ZIP inválido')
print(json.dumps({'zip':str(output),'files':len(files)+1,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
