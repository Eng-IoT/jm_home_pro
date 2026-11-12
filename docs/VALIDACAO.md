# Validação — R02

## Evidências

| Item | Situação |
| --- | --- |
| Tema escuro, roxo e menu lateral | Confirmado visualmente na imagem fornecida |
| Tela interna completa do mapa de referência | Não observada; acesso anterior redirecionou à página inicial |
| Implementação própria | HTML, CSS, JS e geometria procedural neste repositório |
| Visual do painel desktop e casa 3D | Inspecionado no navegador; corrigida a ordem de desenho dos pisos e móveis |
| Sintaxe JavaScript | Verificada por Node |
| Modelo de domínio | Dez testes automatizados, cobrindo os casos abaixo |
| Fluxos interativos completos no navegador | Não concluídos: a política do navegador bloqueou a continuação das interações após a inspeção visual |
| Celular físico e recursos de voz | Não executados; estilos responsivos implementados, validação prática pendente |
| Equipamentos reais | Não conectados nem testados |

## Testes automatizados

1. Comandos limitados ao dispositivo/tipo e ambiente solicitado.
2. Comandos desconhecidos, ambíguos e valores fora dos limites sem alteração.
3. Negação, exceções e ações conflitantes rejeitadas.
4. Cena Cinema com ajuste de luz/TV/cortina e preservação de dispositivos indisponíveis.
5. Ligar uma luz após intensidade zero restaura um valor utilizável.
6. Estado desligado explícito prevalece sobre ajustes importados.
7. Projeção em kWh e R$ consistente com potência × horas × 30 dias.
8. Rotina por horário dispara uma vez por minuto, inclusive após restauração do estado.
9. Rotina por sensor exige transição de condição para repetir.
10. Importação rejeita estrutura inválida, IDs duplicados e campos não permitidos.

## Roteiro manual de aceitação

Use os exemplos iniciais e exporte uma cópia antes de alterar configurações próprias.

| Procedimento | Resultado esperado |
| --- | --- |
| Ativar Cinema e abrir Dispositivos → Sala | Luz principal apagada, LED em 20%, cortina fechada, TV e ar ligados |
| Desconectar TV em Configurar, ativar Cinema novamente | TV não muda; resultado informa um dispositivo indisponível |
| Cadastrar uma tomada e recarregar a página | Cadastro preservado neste navegador |
| Criar cena com um único dispositivo e ativar | Apenas o dispositivo selecionado muda |
| Criar rotina de temperatura > 28 °C e alterar sensor de 26 para 30 | Cena executa uma vez; manter 30 não repete; baixar e ultrapassar novamente dispara |
| Criar rotina para o próximo minuto e deixar página ativa | Execução uma vez no minuto configurado |
| Digitar “Não desligue tudo” | Nenhuma alteração; resposta explica a limitação |
| Definir uma carga em 1.000 W e 8 h/dia | Linha correspondente mostra 240 kWh/mês |
| Exportar JSON, restaurar exemplo e reimportar | Configuração recuperada após confirmação |
| Importar JSON inválido ou acima de 1 MB | Erro visível, estado atual preservado |
| Em celular, abrir menu e escolher Casa 3D | Menu fecha, página fica acessível; controles de dispositivo substituem gestos do mapa |
| Negar permissão do microfone | Mensagem de indisponibilidade e entrada por texto utilizável |

Não tratar resultados esperados do roteiro manual como testes aprovados.
