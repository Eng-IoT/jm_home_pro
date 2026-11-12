# Validação — R03

Revisão verificada em 10/11/2026 (horário de Rio Branco; 11/11 em UTC).

## Evidências e limites

| Item | Evidência / resultado |
| --- | --- |
| Implementação | Cliente WebSocket Home Assistant, vínculos e operação real explícita implementados em código próprio |
| Sintaxe | `npm run check`: seis módulos JavaScript sem erros |
| Testes automatizados | `npm test`: 27 aprovados, zero falhas; 10 de modelo e 17 de integração com protocolo simulado |
| Navegador desktop | Tela Conexões reais renderizada; campos, bloqueios antes da conexão e mensagem de falha observados |
| Demonstração | Interruptor da Luz principal mudou de ligado para desligado; estado persistiu após recarregar |
| Token no formulário | Campo limpo após a tentativa; teste automatizado confirma ausência em configuração persistida |
| Central de teste no navegador | Tentativa com fixture loopback falhou; autenticação e comandos ponta a ponta no navegador não validados neste ambiente |
| Tablet/celular físico | Não testados. Estilos responsivos implementados; compatibilidade prática depende do dispositivo/navegador |
| Equipamentos reais | Não conectados nem testados |
| HTTPS/WSS da instalação | Certificado, rede, proxy e central do usuário ainda não informados |
| Voz, Tuya/ESPHome/MQTT, energia medida | Não testados com serviços/equipamentos; energia permanece estimativa |

Não interpretar testes com protocolo simulado como validação em uma instalação Home Assistant real.

## Cobertura automatizada

Os dez testes do modelo preservado verificam comandos por ambiente/tipo, rejeição de comandos ambíguos/negados/inválidos, limites de ajuste, cenas e indisponibilidade, retorno de intensidade zero, importação, cálculo energético e disparos de rotinas.

Os dezessete testes de integração verificam: endereço e transporte; autenticação e leitura sem acionamentos; rejeição de token; timeout; remoção de entidade; perda de conexão; diferença entre aceite de serviço e estado confirmado; comando recusado sem repetição; vínculos/mode explícitos; entidade duplicada; validação integral da cena antes do início; execução sequencial; restrições de dimmer; limites e domínios; temperatura em Celsius/modos; cortina e parada; exclusão de segredos na configuração.

A fixture opcional `tests/fake_ha.py` é exclusivamente para QA e não controla equipamentos. Não foi conectada com sucesso pelo navegador neste ambiente. Sua existência não é evidência de integração física.

## Aceitação na instalação — ainda pendente

1. Registrar modelo/versão do tablet e navegador, versão da central, modelos dos dispositivos e inventário de entidades. Não registrar tokens.
2. Verificar primeiro, no Home Assistant aberto no tablet, o controle de uma carga de teste.
3. Abrir o painel, autenticar, vincular a carga e confirmar que conectar/ler não a aciona.
4. Habilitar modo real e testar ligar/desligar. Comparar cartão, central e estado físico. Entidades com estado presumido precisam de verificação independente.
5. Testar intensidade/posição/setpoint somente se suportados; conferir unidades e limites.
6. Alterar o estado pela central e verificar atualização do painel, incluindo a casa 3D.
7. Testar entidade indisponível, token recusado e perda de Wi-Fi. Resultado esperado: mensagens claras, bloqueio de comandos após detectar a queda e nenhum reenvio automático.
8. Reconectar manualmente e conferir os estados antes de operar. Desconectar não deve ser interpretado como desligar cargas.
9. Voltar à demonstração e confirmar restauração dos dados simulados. Reabrir começa em demonstração e exige token novamente.
10. Verificar orientação retrato/paisagem, menu, alvos de toque, legibilidade e ausência de rolagem horizontal no tablet.
11. Testar uma cena com carga de teste; qualquer falha deve interromper as ações seguintes, sem prometer reversão das já realizadas.

Critério de liberação: todos os caminhos usados na instalação conferidos no tablet e nos equipamentos, com comportamento de falha aceito e limitações compreendidas. O painel não executa funções de segurança.
