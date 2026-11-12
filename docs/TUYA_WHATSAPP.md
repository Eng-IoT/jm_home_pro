# JM CONNECT R04 · Tuya e WhatsApp

Guia de instalação e comissionamento — 11/11/2026

## O que foi implementado

Você envia um comando de texto ao número do bot. O servidor confere o remetente, identifica o canal cadastrado, consulta as funções Tuya, envia a ação e verifica o estado retornado antes de responder. O painel e a casa 3D utilizam os mesmos canais quando habilitados em modo real.

**Contas e equipamentos reais ainda não foram conectados.** Os testes automatizados utilizam substitutos locais. As credenciais ficam no servidor, sem serem incluídas no navegador ou neste ZIP.

## 1. Requisitos

- Node.js 24.22.1 ou atualização compatível da série 24, internet e disco persistente.
- Um único processo do JM CONNECT. Não usar múltiplas réplicas ou funções temporárias com este SQLite.
- Projeto Tuya Cloud autorizado a consultar e controlar os dispositivos da conta vinculada.
- Aplicativo e número habilitados na WhatsApp Cloud API da Meta.
- Endereço HTTPS válido do servidor, acessível pela Meta para receber o webhook.

Ter apenas o app Tuya no tablet ou um número comum de WhatsApp não fornece automaticamente as credenciais de desenvolvedor. Não foi contratada ou provisionada infraestrutura nesta entrega.

## 2. Preparação local

Extraia o ZIP e entre na pasta JM_HOME_PRO_R04. Copie os exemplos, sem sobrescrever configurações existentes:

```sh
cp gateway/.env.example gateway/.env
cp gateway/devices.example.json gateway/devices.json
```

No Windows, use Copy-Item ou o gerenciador de arquivos. Não é necessário npm install. Gere a chave administrativa no seu computador:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Salve o resultado como JM_ADMIN_TOKEN em gateway/.env. Gere outro valor independente para WA_VERIFY_TOKEN. Não envie essas chaves no chat, no GitHub ou na pasta dist.

## 3. Projeto Tuya

Abra o projeto na Tuya Developer Platform. Confira o data center, os serviços de API e sua validade. Em Devices → Link Tuya App Account → Add App Account, vincule a conta Tuya Smart/Smart Life e verifique os dispositivos disponíveis. Os rótulos podem variar conforme a plataforma.

Autorize os serviços necessários para token, informações do equipamento, especificação, status e comandos. Confira cotas e eventuais cobranças na própria conta. Não deduza o data center apenas pelo país.

| Variável | Valor |
| --- | --- |
| TUYA_CLIENT_ID | Access ID / Client ID do projeto |
| TUYA_CLIENT_SECRET | Access Secret / Client Secret do projeto |
| TUYA_REGION | Chave do data center abaixo |

| Chave | Endpoint |
| --- | --- |
| us | https://openapi.tuyaus.com |
| us_east | https://openapi-ueaz.tuyaus.com |
| eu | https://openapi.tuyaeu.com |
| eu_west | https://openapi-weaz.tuyaeu.com |
| cn | https://openapi.tuyacn.com |
| in | https://openapi.tuyain.com |
| sg | https://openapi-sg.iotbing.com |

Mantenha JM_CONTROL_ENABLED=false e WA_CONTROL_ENABLED=false durante o cadastro. Execute npm run gateway e abra http://localhost:8787 no mesmo computador. O servidor também fornece o painel.

Em Conexões reais → Tuya direto, informe a origem do JM CONNECT e a chave JM_ADMIN_TOKEN. A conexão começa em leitura, sem acionamentos.

## 4. Canais e mapeamentos

Na aba Tuya / Smart Life, consulte o ID real do dispositivo. Para saída liga/desliga, selecione as funções booleanas de comando e retorno do mesmo canal, dê um nome único e salve. Em módulo multirrelés, cadastre cada saída separadamente, com mesmo ID físico e códigos distintos. Depois vincule aos cartões em Conexões reais.

A alternativa por terminal também consulta sem acionar:

```sh
node --env-file=gateway/.env gateway/inspect.mjs ID_REAL_DO_DISPOSITIVO
```

Os dados ficam em gateway/devices.json. A interface acrescenta canais somente com ambos os controles pausados. Para alterar/remover, pare o processo, faça backup e edite o JSON. Reinicie após alterações. O nome para WhatsApp é o do servidor; pode ser diferente do cartão.

O arquivo mapping-illustrative.json é didático e não é carregado automaticamente. Seus códigos não foram identificados na sua instalação. Cada cadastro exige id, name, type, tuyaDeviceId, state e actions. Aliases são nomes alternativos únicos. whatsapp:true libera o canal para mensagens.

| Tipo | Ações | Verificação necessária |
| --- | --- | --- |
| light | on, off, level | Alimentação e escala do dimmer |
| outlet, tv | on, off | Comando e retorno da saída |
| fan | on, off, level | Alimentação e velocidade |
| curtain | open, close, stop, level | Movimento, limites e posição |
| ac | on, off, temp | Refrigeração, setpoint e °C |

state.code identifica a propriedade de retorno; state.values mapeia valores para on/off, open/closed, cool ou outros estados permitidos. Ação discreta contém code, value e expect:{code,value}. Comando e retorno devem corresponder ao mesmo canal físico.

Para level, declare code, statusCode, rawMin e rawMax: 0–100% é convertido para faixa bruta crescente. Luz/ventilador também exigem on/off; 0% envia somente desligar. Escalas invertidas não são suportadas. Para temp, acrescente min, max e unit:"°C", com faixa dentro de 16–30 °C; confira o fator de escala. Temperatura e modo são ações separadas. Não há aquecimento/Fahrenheit.

Não use retorno do comando como prova de fim de curso ou medição física. Valide cada equipamento em condições apropriadas.

## 5. HTTPS e execução contínua

Configure um proxy HTTPS para o Node em 127.0.0.1:8787. gateway/Caddyfile.example é apenas um exemplo; substitua o domínio e configure DNS, certificado e portas conforme a hospedagem. O proxy deve preservar o corpo original do webhook.

JM_ALLOWED_ORIGINS aceita origens exatas, separadas por vírgulas, sem caminho ou barra final. Inclua a origem onde você publicar o painel e, se usar localmente, http://localhost:8787. A API exige chave bearer inclusive no mesmo domínio.

Configure inicialização e reinício automáticos na hospedagem escolhida. Preserve gateway/data/ e seus backups. O ZIP não instala um serviço de sistema. O endereço do webhook deve ser público para a Meta; o painel pode continuar privado. Nunca publique gateway/.env ou o SQLite como arquivos estáticos.

## 6. WhatsApp Cloud API

Configure no servidor os parâmetros do aplicativo Meta:

| Variável | Conteúdo |
| --- | --- |
| WA_GRAPH_VERSION | Versão suportada na conta, no formato vNN.0 |
| WA_PHONE_NUMBER_ID | ID do número Cloud API, não o telefone visível |
| WA_ACCESS_TOKEN | Token válido autorizado para o número |
| WA_APP_SECRET | Segredo para verificar assinatura dos eventos |
| WA_VERIFY_TOKEN | Valor aleatório escolhido para verificar o webhook |
| WA_ALLOWED_SENDERS | Remetentes autorizados, com país e DDD, só dígitos, separados por vírgula |
| WA_BOT_NUMBER | Número do bot no mesmo formato, para o link de conversa |
| WA_CONTROL_ENABLED | Iniciar false, habilitar após comissionamento |

O remetente precisa ser diferente do bot. Confira validade/permissões do token e versão Graph no aplicativo. Não há versão "mais recente" fixada pelo projeto.

Após reiniciar o servidor, cadastre na Meta a URL HTTPS do JM CONNECT seguida de /webhooks/whatsapp. Use o mesmo verify token e assine os eventos messages. O servidor atende a validação GET e verifica X-Hub-Signature-256 no POST. Nunca coloque a chave administrativa na URL.

Libere os canais desejados com whatsapp:true. Com os controles pausados, teste ajuda, dispositivos e status NOME. Após validar uma carga de teste, habilite JM_CONTROL_ENABLED=true e WA_CONTROL_ENABLED=true e reinicie. Reconecte o painel para atualizar a configuração exibida.

## 7. Mensagens

Use o nome exato ou alias cadastrado; a interpretação ignora maiúsculas e acentos. Exemplos abaixo são fictícios.

| Mensagem | Ação |
| --- | --- |
| ajuda | Sintaxe disponível |
| dispositivos | Canais liberados |
| status luz da sala | Estado informado pelo Tuya |
| ligar luz da sala | Ligar saída |
| desligar luz da sala | Desligar saída |
| ajustar luz da sala em 50% | Ajustar escala cadastrada |
| abrir cortina da sala | Abrir |
| fechar cortina da sala | Fechar |
| parar cortina da sala | Parada operacional cadastrada |
| temperatura ar da sala em 23 graus | Setpoint |

Uma ação por mensagem, até 180 caracteres. Negações, condições e ambiguidades são recusadas. Áudio, anexos, cenas, grupos, agendamentos e alertas proativos não foram implementados.

Aceita mensagens com até cinco minutos de idade, até dez por remetente/minuto. Respostas são imediatas ao remetente; não há envio espontâneo. Aceite Meta e entrega são separados; confirmação de entrega depende do evento do provedor.

## 8. Operação e manutenção

- Consulta periódica do painel a cada 60 s e após comandos; cache de leitura de 10 s. Cada equipamento físico requer informação e status. Observe cotas.
- Aceite Tuya sem retorno esperado gera incerteza. Confira a carga antes de repetir. Não há prazo garantido de comunicação.
- Mensagem duplicada com mesmo ID não repete a ação. Queda durante operação deixa registro incerto, sem retomada automática. Nova mensagem é nova solicitação.
- SQLite mantém registros por sete dias. Texto recebido é removido após processamento; telefone, resposta, IDs e resultados ficam durante a retenção. Proteja banco/backups e evite registrar corpos/tokens no proxy.
- Desconectar painel não desliga cargas nem pausa WhatsApp. Para pausar bot, WA_CONTROL_ENABLED=false e reinício; para bloquear também painel Tuya, JM_CONTROL_ENABLED=false.
- Chaves Tuya/Meta ficam no servidor. A chave administrativa fica somente na memória da aba; reabrir exige informá-la novamente.

## 9. Comissionamento pendente

1. Registrar modelo, canal, funções, valores, retorno, data center e versões, sem segredos.
2. Em leitura, comparar estados no Tuya e painel sem acionamento automático.
3. Testar uma carga e comparar painel, nuvem e equipamento físico.
4. Testar remetente autorizado e outro não autorizado; o segundo não deve acionar nem receber informações.
5. Conferir negação, nome desconhecido, offline, duplicata, queda de internet e reinício.
6. Verificar resposta no telefone. Aceite HTTP não comprova entrega.
7. Validar tablet físico em retrato/paisagem, menu, toque e casa 3D; conferir cada ajuste utilizado.

Proteções elétricas, permissivos e funções de segurança pertencem à instalação; não são substituídos pelo software.

## Referências oficiais consultadas

- [Tuya — assinatura](https://developer.tuya.com/en/docs/iot/new-singnature?id=Kbw0q34cs2e5g), 05/01/2026.
- [Tuya — token](https://developer.tuya.com/en/docs/cloud/6c1636a9bd?id=Ka7kjumkoa53v), 22/05/2026.
- [Tuya — vincular dispositivos](https://developer.tuya.com/en/docs/iot/link-devices?id=Ka471nu1sfmkl).
- [Tuya — especificação](https://developer.tuya.com/en/docs/cloud/68c2e82f73?id=Kag2ybtxwlb9w).
- [Tuya — comandos](https://developer.tuya.com/en/docs/cloud/e2512fb901?id=Kag2yag3tiqn5).
- [Tuya — data centers](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4).
- [WhatsApp oficial — recebimento](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK/blob/main/website/docs/receivingMessages.md) e [webhook](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/). Referências de protocolo; não usamos esse SDK como dependência.
- [Meta — Cloud API](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started). Parte da documentação exigiu login; versão e permissões precisam ser conferidas na conta.
- [Node.js — SQLite](https://nodejs.org/download/release/v24.22.1/docs/api/sqlite.html).
- [Caddy — HTTPS](https://caddyserver.com/docs/quick-starts/https).
