# JM HOME PRO — R04

Pacote completo do código disponível em 11/11/2026, preparado para Joelson Mendes. Abra primeiro **LEIA_PRIMEIRO.html**.

Inclui painel com casa 3D, controles, cenas, rotinas demonstrativas, assistente local, projeção energética, integração Home Assistant e módulo JM CONNECT para Tuya e comandos por WhatsApp.

**Programação pronta para configuração e comissionamento. A instalação física, a conta Tuya e o número WhatsApp do usuário não foram conectados nem validados.** Não há senhas ou tokens reais neste pacote.

## Abrir a demonstração

Instale Node.js 24.22.1 ou atualização compatível da série 24. Na pasta do projeto, execute:

```sh
npm run demo
```

Abra `http://localhost:8788`. No Windows, também pode executar `INICIAR_DEMONSTRACAO.cmd`. Não abra `dist/index.html` com duplo clique: módulos JavaScript precisam de HTTP. A demonstração não aciona equipamentos.

## Ativar o servidor Tuya/WhatsApp

```sh
cp gateway/.env.example gateway/.env
cp gateway/devices.example.json gateway/devices.json
# Preencha gateway/.env localmente conforme o guia.
npm run gateway
```

No Windows, use `Copy-Item` em vez de `cp` ou copie no gerenciador de arquivos. Nunca sobrescreva uma configuração existente sem backup. Não é necessário `npm install`: o projeto não usa dependências npm externas.

Siga **docs/TUYA_WHATSAPP.md** ou **dist/guia-tuya-whatsapp.html** para projeto Tuya, códigos dos dispositivos, número Meta, HTTPS e webhook. O painel já integra Tuya direto ao mesmo modo real usado pela casa 3D; Home Assistant permanece disponível, com vínculos separados.

## Verificação

```sh
npm run check
npm test
```

49 testes aprovados, com serviços simulados. Consulte **docs/VALIDACAO.md** para escopo e limites. Aceite de comando não é tratado como confirmação de estado; mesmo um retorno confirmado pela nuvem não comprova operação física.

## Arquivos principais

| Pasta/arquivo | Conteúdo |
| --- | --- |
| `dist/` | Painel estático completo e guias |
| `gateway/` | Servidor Tuya/WhatsApp e exemplos sem credenciais |
| `tests/` | Testes automatizados de modelo e integrações |
| `scripts/` | Servidor demonstrativo, verificação e empacotamento |
| `docs/TUYA_WHATSAPP.md` | Instalação e comissionamento R04 |
| `docs/INTEGRACAO.md` | Guia Home Assistant preservado |
| `docs/VALIDACAO.md` | Evidências e pendências |
| `INICIAR_DEMONSTRACAO.cmd` | Inicializador Windows da demonstração |
| `vercel.json` | Configuração para publicar somente o painel estático |

## Publicação e limites

Este ZIP é uma entrega local. A revisão R04 não foi publicada no site durante o empacotamento. Para GitHub, extraia e envie os arquivos do projeto, mantendo `.gitignore`; não envie `.env`, cadastro real de dispositivos nem banco de dados.

Na Vercel, o `vercel.json` aponta para `dist/`. **Isso publica apenas o painel.** O JM CONNECT precisa de processo Node permanente e disco persistente, em uma única instância, com HTTPS. Não implante o servidor SQLite como função temporária. O endereço privado do painel não é a URL do webhook Meta.

Rotinas e assistente local permanecem demonstrativos. WhatsApp recebe instruções de texto, consultas e responde ao remetente; não há áudio, agendamento, alertas proativos, cenas ou comandos em grupo. Energia continua estimativa por potência × horas. A casa 3D é ilustrativa, sem escala arquitetônica.

Tablet físico, dispositivos, permissões de API, serviços contratados, limites de uso, certificados e disponibilidade dependem de validação na instalação. Este software não executa funções de segurança, intertravamentos industriais ou parada de emergência.
