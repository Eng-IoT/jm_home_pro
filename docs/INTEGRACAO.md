# JM HOME PRO R03 — conexão real por Home Assistant

Implementação: cliente WebSocket no navegador. O painel conecta-se diretamente à central informada. Não há backend, assinatura de API ou servidor de IA exigido pelo painel. Home Assistant e os dispositivos precisam estar instalados e configurados pelo usuário. O teste físico continua pendente.

## Preparação no tablet

1. Abra o Home Assistant no navegador do tablet e confirme que ele consegue controlar uma luz de teste. Se isso não funciona, primeiro resolva a integração do equipamento na central.
2. Abra JM HOME PRO → **Conexões reais**. Informe o endereço completo da central.
3. No perfil do Home Assistant, em Segurança, crie um token de acesso de longa duração para uso pessoal neste painel. Mantenha-o privado e copie-o diretamente no campo de conexão. Não envie tokens pelo chat, WhatsApp ou e-mail. Prefira um usuário sem privilégios administrativos para operação; permissões efetivas dependem da central.
4. Selecione **Conectar e ler entidades**. Nenhuma carga é acionada nesta etapa.
5. Associe um dispositivo do painel à entidade correspondente. A lista filtra domínios compatíveis e impede duplicar uma entidade.
6. Selecione **Habilitar controle real**. Apenas os dispositivos vinculados ficam disponíveis na casa 3D e nos cartões.
7. Ligue/desligue uma carga de teste, confira o retorno da central e observe o equipamento. A mensagem de confirmação significa que o Home Assistant informou o estado esperado; integrações com estado presumido não comprovam fisicamente a atuação.
8. Desconecte e confirme o bloqueio dos controles. Voltar à demonstração restaura os estados simulados; não desliga equipamentos reais.

## Caminhos de rede

| Painel | Central | Condição |
|---|---|---|
| Link publicado HTTPS | HTTPS/WSS | Certificado válido, central alcançável pelo tablet e proxy que suporte WebSocket |
| Painel servido por HTTP na rede local | HTTP/WS na rede local | Rede privada confiável; tráfego não cifrado; não usar em Wi-Fi público |
| Link publicado HTTPS | HTTP/WS local | Bloqueado pelo painel para evitar conteúdo misto |

O IP 127.0.0.1 no tablet aponta para o próprio tablet. Para um painel hospedado em computador da rede, use o IP real desse computador. Não exponha portas diretamente à internet como atalho de configuração. Não ignore alertas de certificado. Permissões de rede local, resolução de nomes e políticas do navegador podem interferir no acesso.

## Executar o pacote em uma rede local

Com Python 3 já instalado e autorizado, na pasta do projeto:

```sh
python3 -m http.server 8080 --bind 0.0.0.0 --directory dist
```

No Windows, quando o lançador `py` estiver disponível:

```bat
py -m http.server 8080 --bind 0.0.0.0 --directory dist
```

No tablet conectado à mesma rede, abra `http://IP_DO_COMPUTADOR:8080`. O computador precisa permanecer ligado. O servidor de exemplo é destinado a teste em rede privada, não a publicação na internet. Interrompa com Ctrl+C. Em uma instituição, siga a política de instalação e de rede local.

## Equipamentos e ações

| Tipo no painel | Domínio Home Assistant | Ações implementadas |
|---|---|---|
| Iluminação | light ou switch | Ligar/desligar; intensidade somente quando declarada pelo equipamento |
| Tomada | switch | Ligar/desligar |
| TV | media_player ou switch | Ligar/desligar conforme serviço e dispositivo |
| Ventilador | fan ou switch | Ligar/desligar; percentual se suportado |
| Cortina | cover | Abrir/fechar/parar; posição se suportada |
| Climatização | climate | Cool/off quando disponíveis; setpoint de 16 a 30 °C limitado ao intervalo do equipamento |

ESP32: integrar primeiro via ESPHome ou MQTT na central. Não foi gerado firmware de aplicação porque placa, módulos, polaridade, pinos, cargas e proteções ainda não foram confirmados. Tuya/Smart Life: conectar primeiro pela integração Tuya do Home Assistant; funções dependem do modelo e do que a integração expõe. Não há conexão direta do painel a Tuya, MQTT ou pinos de ESP32.

## Regras de operação

- Toda abertura/reabertura começa em demonstração. O token não é salvo. Conectar começa em leitura. Habilitar modo real exige ação explícita.
- Estados da central permanecem em memória e não sobrescrevem a configuração de demonstração.
- Endereço e vínculos são salvos separadamente neste navegador. A exportação JSON R02 preservada contém o projeto de demonstração; vínculos são locais e devem ser refeitos em outro navegador. Importar ou restaurar o projeto limpa os vínculos para evitar associações indevidas.
- As cenas verificam todos os vínculos e ações antes de começar. São executadas sequencialmente e param na primeira falha. Não há transação nem reversão das ações já executadas.
- Comando aceito não é tratado como estado confirmado. O painel consulta o estado e aguarda atualização. Timeout informa resultado desconhecido; não há reenvio automático.
- Rotinas por horário/sensor e assistente permanecem somente na demonstração. Para automação contínua, configure-a na central.
- A perda da conexão bloqueia novos comandos. Não constitui parada de segurança, não garante estado físico e não desliga cargas.
- O heartbeat verifica a central a cada 20 s, com timeout de 10 s. Abas em segundo plano podem sofrer suspensão; reabra e verifique o estado antes de operar.
- Energia e sensores da demonstração continuam estimados/simulados. O painel não é medidor, sistema de segurança, intertravamento ou supervisão industrial.

## Fontes primárias consultadas em 10/11/2026

- WebSocket: https://developers.home-assistant.io/docs/api/websocket/
- Autenticação: https://developers.home-assistant.io/docs/auth_api/
- Climatização: https://www.home-assistant.io/integrations/climate/
- Setpoint e modo: https://www.home-assistant.io/actions/climate.set_temperature/
- Cortinas: https://www.home-assistant.io/integrations/cover/
- ESPHome: https://www.home-assistant.io/integrations/esphome/
- Tuya: https://www.home-assistant.io/integrations/tuya/

## Pendências da instalação de Joelson

Endereço/protocolo da central, existência do Home Assistant, modelos dos dispositivos e do tablet, inventário de entidades e teste físico. Não registrar tokens neste documento.
