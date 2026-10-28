# Central de pagamentos do aluno

Implementação de 28/10/2026. A central está em `/pt-BR/assinatura` e `/en-US/assinatura`, fora do grupo de páginas bloqueadas por inadimplência. O aluno autenticado continua podendo pagar e consultar os próprios registros quando o acesso ao conteúdo expira.

## Fluxos disponíveis

- Resumo do acesso, plano, vencimento, tipo de cobrança e renovação desativada.
- Renovação PIX avulsa ou contratação recorrente no cartão após o vencimento.
- Histórico paginado de pagamentos de assinatura e compras avulsas, filtros de situação, detalhes, confirmação, identificação e estornos.
- Retomada da operação pendente existente: PIX reutilizado, Checkout Stripe existente ou fatura Stripe hospedada. Não cria outra assinatura para concluir autenticação do banco.
- Encerramento explícito e confirmado de tentativa não paga no provedor para escolher outro meio. Pagamento já confirmado é sincronizado e não é excluído para trocar de meio; falha externa não gera encerramento local fictício.
- Gerenciamento de cartão/faturas no portal Stripe, cancelamento da renovação ao fim do período e reativação quando o provedor permitir.
- Exportação de histórico próprio em CSV e Excel `.xlsx`, com filtros. Excel suporta até 5.000 registros; volumes maiores usam CSV.
- Impressão/salvamento em PDF pelo navegador, com apresentação clara. A impressão reflete a página atual do histórico, não todo o histórico paginado; não emite nota fiscal.

## Explicações exibidas ao aluno

PIX é avulso, cobra o valor integral e não inclui teste gratuito. Ao vencer o período, o conteúdo fica bloqueado, sem tolerância. Novo acesso depende de confirmação. Cartão é recorrente conforme o ciclo contratado, pode exigir autenticação e pode ser recusado. Cancelar renovação não solicita estorno do período pago.

A central explica como resolver acesso ainda bloqueado após pagar, retomar tentativa, mudar de meio e interpretar estornos. Datas são exibidas no horário de São Paulo. Exportações apresentam valores na unidade da moeda indicada, com datas de São Paulo e cabeçalhos legíveis.

## PIX

A escolha da aba não cria cobrança automaticamente: o aluno escolhe **Gerar PIX**. Um PIX pendente existente é reutilizado. O formulário oferece CPF do pagador, exigindo-o quando necessário para cadastrar o cliente. O documento é validado antes de reservar/criar cobrança e enviado ao Asaas; não é colocado em URLs, histórico ou exportações.

O código vencido deixa de ser apresentado como utilizável. Há cópia com retorno de sucesso/erro, validade com data e hora, consulta automática e botão **Já paguei · Verificar pagamento**. Essa verificação consulta o pagamento existente em vez de gerar outro PIX.

## Cartão e valores

O resumo distingue o total PIX do total do cartão em eventual teste elegível. A interface informa recorrência, autenticação bancária, revisão de tentativas pendentes e onde cancelar. Erros de rede na confirmação do cartão encerram o estado de carregamento e permitem recuperação pela central.

## Segurança e dados

As consultas usam o usuário autenticado no servidor, excluem pagamentos duplicados e não aceitam outro usuário por parâmetro. Cancelar/retomar exige operação própria. A central não depende de assinatura ativa para permitir regularização. Contas removidas são recusadas. Metadados internos, chaves de idempotência, documentos e identificadores de cliente do provedor não são enviados no histórico exportado. O serviço remoto continua confirmando o estado; a tela não aprova pagamento por conta própria.

Operações de cancelamento no provedor seguem as regras oficiais de [exclusão de cobrança Asaas](https://docs.asaas.com/reference/excluir-cobranca): remoção de cobrança não significa estorno. O cadastro de CPF utiliza os endpoints oficiais de [criação](https://docs.asaas.com/reference/criar-novo-cliente) e [atualização de cliente](https://docs.asaas.com/reference/atualizar-cliente-existente).

## Validação e publicação

- `npm test`: 91 testes aprovados, incluindo isolamento do histórico, acesso bloqueado com consulta disponível, filtros, falhas de banco, encerramento de operação própria, proteção de pagamento confirmado, retomada por fatura existente, exportação Excel/CSV e validação de CPF antes da reserva.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `node tests/preview-student-billing-ui.mjs`: componentes reais com fixtures, cenários PIX/cartão, português/inglês, 390/1280 px, detalhes, confirmação de encerramento e PIX com CPF e confirmação simulada. As capturas ficam em `artifacts/student-billing-ui/`.

Não foram realizados pagamentos externos, configurados portais/webhooks nem publicadas alterações no banco remoto: as credenciais não estão disponíveis neste ambiente. São pré-requisitos as migrações anteriores, incluindo 000041–000043, e a homologação descrita em `AUDITORIA-PAGAMENTOS.md`. Esta etapa não adiciona migração.

O portal Stripe precisa estar habilitado na conta do provedor para gerenciar cartões e faturas. As chaves de sandbox/produção e os webhooks devem corresponder ao mesmo ambiente. Pagamentos reais, autenticação 3DS, baixa PIX e estornos precisam ser homologados externamente antes de afirmar operação integral em produção.
