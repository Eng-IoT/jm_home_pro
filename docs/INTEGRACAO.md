# Evolução para equipamentos reais — proposta, não implementada

## Informações ainda necessárias

Inventário dos equipamentos e revisões, protocolos disponíveis, rede, servidor desejado, usuários/perfis, requisitos de operação offline e disponibilidade. Não inferir compatibilidade por marca ou aparência.

## Arquitetura proposta

Interface → backend autenticado → adaptador (Home Assistant, MQTT/ESP32 ou API oficial) → equipamento.

O backend precisa manter um estado confirmado separado do comando desejado. Cada comando deve ter identificador, usuário, horário, validade, resposta e eventual timeout. O dispositivo desconectado deve aparecer como indisponível; último estado conhecido não equivale a confirmação atual.

## Modelo proposto de comando

```json
{
  "commandId": "identificador-unico",
  "deviceId": "dispositivo-cadastrado-no-servidor",
  "operation": "set",
  "desired": {"on": true, "level": 60},
  "expiresInMs": 5000
}
```

O backend deve validar `deviceId`, tipo, limites, autorização e idempotência. A resposta imediata pode informar `accepted`; apenas retorno confirmado do equipamento deve produzir `confirmed`. Estados possíveis adicionais: `rejected`, `timeout` e `offline`.

## Critérios para selecionar a integração

| Caminho | Dependências a verificar | Uso pretendido |
| --- | --- | --- |
| Home Assistant | Instância, entidades, métodos autorizados e acesso seguro | Concentrar dispositivos de diferentes fabricantes |
| MQTT / ESP32 | Firmware, broker com TLS, credenciais por dispositivo, tópicos e disponibilidade | Hardware próprio, maquetes e laboratórios |
| Tuya / Smart Life | API oficial vigente, região, permissões, custos e modelos compatíveis | Equipamentos existentes no ecossistema |
| Medidor de energia | Modelo, precisão, unidades, protocolo e intervalo de amostragem | Trocar projeções por séries medidas |

Esses caminhos são opções de projeto. Endpoints, custos e compatibilidade não foram verificados nesta entrega; devem ser confirmados na documentação oficial dos modelos escolhidos antes da implementação.

## Controles antes da operação

- Segredos apenas no servidor; transporte cifrado; credenciais com escopo mínimo e revogação.
- Separação entre demonstração e produção; nenhuma rotina migra ativada automaticamente.
- Autenticação, autorização por ambiente, registro de ações e limites de frequência.
- Confirmar estados, detectar perda de comunicação e definir comportamento após retorno de energia.
- Agendador no servidor para funcionar sem navegador e evitar execução duplicada.
- Medições com timestamps, unidade, qualidade e tratamento de lacunas.
- Comissionar um dispositivo de cada vez em bancada antes da expansão.
- O painel não implementa funções de segurança elétrica ou operacional. Projeto, proteções, cargas e intervenções físicas exigem validação própria do sistema real.

## Critério de aceite da primeira integração

Selecionar um dispositivo, obter seu estado real, enviar um comando autorizado, confirmar a atuação, desconectar a comunicação e verificar que o painel informa indisponibilidade sem alegar execução. Repetir com comando expirado e usuário sem permissão. Só então ativar cenas e rotinas reais.
