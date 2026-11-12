# Publicação — JM HOME PRO R02

## 1. GitHub
1. Entre em https://github.com/new e crie um repositório privado chamado `jm-home-pro` (sem README automático).
2. Extraia este ZIP em uma pasta no computador.
3. No GitHub, abra o repositório e use **Add file > Upload files**. Envie o conteúdo da pasta extraída, preservando `dist/`, `docs/`, `tests/`, `package.json`, `vercel.json` e `README.md`. O GitHub pode ocultar pastas iniciadas por ponto; `.openai` não é necessária para a Vercel.
4. Confirme o commit na branch `main`.

## 2. Vercel
1. Entre em https://vercel.com/new e escolha **Import Git Repository**.
2. Selecione `jm-home-pro` e autorize a integração GitHub, se solicitado.
3. Configure **Framework Preset: Other**, **Root Directory: ./**, **Build Command: vazio**, **Output Directory: dist**.
4. Clique em **Deploy**. A Vercel apresentará a URL quando a implantação terminar.

## 3. Validação
- Teste navegação, casa 3D, cadastro e controles simulados, cenas, rotinas e importação/exportação.
- O site publicado NÃO controla dispositivos Tuya reais nem recebe comandos WhatsApp. Não inserir credenciais Tuya/WhatsApp no frontend.
- Para controle real, será necessário backend autenticado e integração com APIs oficiais.

## 4. Desenvolvimento
- Alterações na branch principal do GitHub podem disparar novos deploys na Vercel.
- Testes locais: `npm run check` e `npm test` (Node.js moderno).
