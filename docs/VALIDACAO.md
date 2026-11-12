# Validação — R04

Data: 11/11/2026 (Rio Branco). Entrega em ZIP; R04 não publicada no site nesta etapa.

## Executado

- Node.js 24.22.1; verificação sintática dos módulos JavaScript.
- 49 testes automatizados aprovados, zero falhas: 10 de modelo, 17 de Home Assistant e 22 de JM CONNECT/Tuya/WhatsApp.
- Assinatura Tuya comparada ao vetor público oficial.
- Fluxo completo em processo: webhook assinado → remetente autorizado → comando Tuya simulado → retorno de estado → resposta WhatsApp simulada.
- Bloqueios de autenticação, origem, offline, ações não autorizadas, valor fora da faixa, nome ambíguo e negação.
- Duplicatas, ID conflitante, resposta WhatsApp com falha e reinício com operação interrompida.
- Reconexão ignora respostas antigas e limpa credencial; vínculos Tuya/Home Assistant independentes.

Nenhum teste enviou comandos a equipamentos ou mensagens a pessoas. O código de serviços externos foi substituído por respostas locais controladas.

## Pendente

- Credenciais, autorizações, cotas e disponibilidade de APIs Tuya/Meta reais.
- Hospedagem contínua, HTTPS e webhook Meta acessível.
- Identificação dos dispositivos/canais e validação física de cada saída.
- Recebimento e entrega real de mensagens WhatsApp.
- Tablet físico: modelo, navegador, toque e orientações.
- Configuração Vercel fornecida, sem implantação executada nesta entrega.

Retorno confirmado pela nuvem não é medição independente nem função de segurança. Siga o roteiro de comissionamento em TUYA_WHATSAPP.md. O histórico da revisão anterior está em VALIDACAO_R03_HISTORICO.md.
