# JM HOME PRO — R02

Painel próprio de automação residencial, inspirado no visual escuro e roxo da referência apresentada. A fotografia confirma a aparência do menu; não revela código, regras internas, protocolos, banco de dados ou o funcionamento completo do produto de referência. Esta implementação não reutiliza a marca, código, modelos ou credenciais de terceiros.

## O que está implementado

- Painel de visão geral com estados derivados dos dispositivos de demonstração.
- Maquete 3D procedural de seis ambientes, com móveis, rotação por arraste/teclado, zoom, vista superior, seleção de cômodos e marcadores de iluminação.
- Cadastro, edição e exclusão de até 100 dispositivos, com tipos iluminação, climatização, cortina, TV, tomada e ventilador. Filtros por cômodo/tipo e pesquisa.
- Controle de intensidade, posição da cortina e temperatura entre 16 e 30 °C. Simulação de indisponibilidade para testar falhas.
- Quatro cenas iniciais; criação e edição de até 30 cenas com ações por dispositivo.
- Até 50 rotinas por horário diário ou limiar de sensor. Sensores de temperatura, umidade e luminosidade ajustáveis para teste.
- Assistente de comandos locais predefinidos. Não é um modelo de IA generativa. Ditado opcional com revisão do texto antes de executar; síntese de voz opcional.
- Planejamento energético: potência, horas de uso, tarifa, meta mensal, cálculo por carga e exportação CSV.
- Histórico local, preferências, exportação/importação JSON com validação e restauração da demonstração.
- Interface responsiva, controles com rótulos acessíveis, navegação por teclado e respeito a movimento reduzido.

## Executar localmente

Não há dependências de execução nem processo de build. É necessário servir os arquivos por HTTP; abrir `index.html` com `file://` não carrega os módulos JavaScript corretamente.

Com Python 3 instalado, na raiz do projeto:

```sh
python3 -m http.server 8080 --directory dist
```

Abra `http://localhost:8080` no navegador. Para testes de código, use Node.js moderno (validação realizada com Node 24):

```sh
npm run check
npm test
```

Não é necessário executar `npm install`. Na hospedagem estática, publique o conteúdo de `dist/`. A configuração específica de Sites está em `.openai/hosting.json` e deve preservar a identidade do projeto original.

## Uso rápido

1. Abra **Casa 3D**, arraste para girar e use os marcadores para alternar as luzes. As setas do teclado também orientam a câmera; `+`, `-` e `0` ajustam/restauram a vista. A lista de dispositivos oferece controles equivalentes.
2. Em **Dispositivos**, escolha um ambiente, ajuste os controles ou cadastre um novo dispositivo. A maquete possui seis cômodos fixos: adicionar um dispositivo não altera a arquitetura.
3. Em **Cenas e rotinas**, experimente Cinema. Para personalizar, crie uma cena, selecione dispositivos e defina os estados desejados.
4. Crie uma rotina com uma cena e um horário, ou selecione um sensor e um limite. Ative a rotina e use o laboratório de sensores para testar.
5. No assistente, tente `Ligar luzes da sala`, `Luzes da sala em 30%`, `Ar da sala em 23 graus`, `Ativar modo cinema`, `Desligar tudo` ou `Consumo de energia`.
6. Em **Energia**, preencha potências e horas reais do seu cenário. Informe a tarifa da sua fatura para obter uma projeção de custo.
7. Em **Configurações**, exporte JSON antes de trocar de navegador ou restaurar os exemplos. A importação substitui os dados atuais após confirmação.

## Limitações operacionais

- Todos os dispositivos e sensores são simulados. Não há backend, MQTT, Tuya, Home Assistant ou medidor conectado. Os cartões de integrações descrevem requisitos futuros; não efetuam conexão.
- Os dados ficam no `localStorage` deste navegador (`jm-home-pro-r02`). Não há sincronização entre aparelhos, controle de usuários no aplicativo, banco remoto ou backup automático. O acesso privado da hospedagem é distinto desses recursos.
- Rotinas só executam com a página aberta e ativa. O fuso é o do navegador; não existe recuperação de horários perdidos. Uma condição de sensor dispara ao entrar no estado verdadeiro e precisa voltar ao falso antes de novo disparo. Ao habilitar uma rotina com condição já verdadeira, ela pode disparar no próximo ciclo.
- Para testar horários, mantenha uma única aba ativa. Esta demonstração não é um agendador robusto para múltiplas instâncias.
- A potência instantânea exibida é uma estimativa a partir do estado simulado. Dispositivos indisponíveis são excluídos desse somatório; isso não comprova consumo zero em um equipamento real.
- A projeção mensal usa `W × h/dia × 30 ÷ 1000`, independentemente de estar ligado naquele instante. Não considera ciclo do compressor, standby, fator de carga, geração fotovoltaica ou impostos adicionais. Cortinas ficam fora da estimativa por ausência de tempo de acionamento.
- O ditado depende de suporte e permissão do navegador. O serviço do navegador pode processar áudio externamente. Sem suporte, o campo de texto continua disponível. Voz não foi validada nesta execução.
- A casa é um modelo ilustrativo, sem escala técnica, importação de planta ou editor arquitetônico.

## Organização

```text
dist/
  index.html        Entrada e metadados
  styles.css        Tema e responsividade
  app.js            Páginas, formulários, persistência e eventos
  model.js          Estado, comandos, cenas, rotinas e energia
  house.js          Geometria e renderização Canvas da casa 3D
  icons.js          Ícones vetoriais próprios
  assets/icon.svg   Marca própria
tests/model.test.js Testes do modelo de domínio
docs/VALIDACAO.md   Evidências e roteiro de aceitação
docs/INTEGRACAO.md  Contrato proposto para evolução real
```

## Privacidade e manutenção

Nenhuma senha ou chave foi incluída no projeto. O aplicativo não chama APIs externas para controlar dispositivos. Nomes e mensagens são escapados antes da exibição. A importação usa campos permitidos e limites de quantidade/tamanho; JSON arbitrário não é executado. A exportação inclui o histórico e as mensagens locais, portanto compartilhe o arquivo apenas com quem deve receber esses dados.

Para integração real, mantenha segredos no servidor, implemente permissões e confirmação do estado antes de sinalizar sucesso. Consulte `docs/INTEGRACAO.md`.
