# Auditoria de pagamentos e financeiro — 28/10/2026

## Resultado e limite da validação

Foram encontradas e corrigidas falhas reais no código dos fluxos ativos de Stripe, Asaas/PIX, assinaturas, compras de e-books e financeiro administrativo. A aplicação usa agora confirmação transacional no banco: pagamento, estorno, acesso e evento processado são gravados juntos.

**Não há homologação de produção ou sandbox neste ambiente.** Existe somente `.env.example`; não estão disponíveis as credenciais de Stripe, Asaas nem Supabase remoto. Não foram realizadas cobranças externas, aplicadas migrações remotas ou alteradas configurações dos provedores. Testes locais não certificam operação 100% em produção.

## Falhas corrigidas

| Área | Problema encontrado | Correção |
|---|---|---|
| Receita Stripe | Checkout registrava PaymentIntent e webhook registrava a mesma cobrança como fatura | Um lançamento canônico por fatura, com aliases de PaymentIntent, charge e sessão. Conciliação identifica e exclui duplicatas dos relatórios, preservando os registros históricos. |
| Liberação de acesso | Checkout concluído era tratado como pagamento aprovado; cartão podia mostrar sucesso ainda incompleto | Consulta ao estado atual do provedor, verificação do SetupIntent, cliente, plano e cartão; confirmação adicional no servidor após autenticação 3DS. |
| Preços Stripe | ID do preço podia divergir do valor e periodicidade anunciados | Validação de preço ativo, moeda, valor e intervalo antes de criar nova assinatura. |
| Tentativas repetidas | Requisições podiam criar cobranças duplicadas | Reserva persistente e bloqueio transacional por aluno, reutilização da operação e chave de idempotência no Stripe. Asaas busca pela referência antes de tentar recuperar uma operação interrompida. |
| Webhooks | Falhas eram marcadas como processadas; eventos atrasados podiam sobrescrever estado recente | Falhas ficam pendentes e retornam HTTP 500; confirmação ocorre na transação. Consulta atual ao provedor e proteção contra snapshots antigos. |
| PIX | Resposta devolvia UUID local, mas consulta esperava ID externo | Retorno do ID Asaas; consulta também aceita UUID local antigo, verificando proprietário. |
| Assinaturas PIX | Nova cobrança pendente sobrescrevia assinatura paga; CONFIRMED/RECEIVED renovavam novamente | Vínculo separado por operação. Ativação do período uma única vez por pagamento. |
| Cliente Asaas | Cliente podia ser criado duas vezes e CPF/telefone enviados eram ignorados | Cliente criado e persistido antes da cobrança, com referência ao usuário e dados recebidos. PIX limitado a BRL. |
| Estornos | Novo lançamento confundia estorno com receita; disputa era tratada como dinheiro devolvido | Livro separado de estornos, com valor efetivo e estado. Parcial mantém acesso ao e-book; integral revoga compra e encerra acesso PIX. Disputa bloqueia assinatura sem inventar estorno concluído. |
| Segurança e-books | Aluno podia inserir uma compra paga via cliente Supabase | Removidas permissões de escrita do cliente; mutações financeiras somente pelo servidor. |
| Cancelamento | Rotas ignoravam ID escolhido e podiam alterar apenas estado local | ID e proprietário obrigatórios. Stripe é alterado primeiro e depois reconciliado. PIX avulso gerencia seu período de acesso, sem fingir cancelamento de recorrência inexistente. |
| Financeiro | Indicadores podiam somar várias assinaturas do mesmo aluno | Assinatura selecionada por aluno; duplicatas excluídas de listagens, exportação e relatórios. PIX avulso não entra como recorrência no MRR. |
| Receita e taxas | Estorno apagava receita histórica e taxa desconhecida parecia zero confirmado | Receita bruta preservada; estornos confirmados separados pela data informada pelo provedor; indicador após estornos e antes de taxas. Detalhes não mostram taxa/líquido como conhecidos quando não foram confirmados. |
| Retornos | Caminhos indefinidos e retorno arbitrário no portal | Destinos internos validados e caminhos padrão localizados. |

O período de teste do Stripe passa a ser concedido apenas sem histórico anterior de teste ou pagamento. Nova contratação é impedida enquanto já houver assinatura vigente, contratação pendente ou assinatura Stripe aberta que exija gerenciamento no provedor. Essa regra evita assinaturas paralelas e testes gratuitos repetidos; troca de plano com pró-rata não foi introduzida.

## Financeiro administrativo

O painel financeiro apresenta receita bruta, estornos confirmados no mês e valor após estornos, antes de taxas. Este último pode ser negativo quando o estorno se refere a receita de outro mês; não é saldo bancário disponível nem inclui conciliação de repasses, antecipações ou tarifas externas.

Em **Admin → Pagamentos → detalhes → Conciliar com provedor**, o administrador pode consultar e aplicar o estado atual de um pagamento. A operação exige administrador, registra auditoria e utiliza a mesma transação dos webhooks. Registros antigos só são classificados como duplicados quando os identificadores são comprovados pela consulta ao provedor; a migração não tenta adivinhar equivalência por valor/data.

Relatórios e exportações passam a usar os mesmos lançamentos canônicos. PDF e Excel incluem o valor confirmado dos estornos; a tela mostra também o valor após estornos. O CSV de pagamentos inclui valor estornado, data e identificador externo.

## Natureza do PIX existente

O fluxo Asaas implementado cria **cobrança PIX avulsa por período de acesso**, não PIX Automático nem assinatura recorrente no Asaas. O aluno precisa de novo pagamento para outro período. **Ao vencer o período PIX, o acesso fica bloqueado imediatamente, sem os dias de tolerância do plano.** A renovação pode ser feita por novo PIX confirmado ou pela contratação recorrente no cartão; cobrança pendente e cartão recusado não liberam o painel. A tela aberta também acompanha o vencimento e troca para o bloqueio; as operações continuam protegidas pela verificação no servidor. Cancelar esse acesso não solicita estorno automaticamente. Vínculos legados de recorrência Asaas que não correspondam a esse fluxo continuam exigindo intervenção no provedor; a aplicação não informa sucesso fictício.

A recuperação de criação interrompida aguarda 15 minutos antes de reutilizar a reserva, para reduzir risco de cobranças paralelas em falhas de rede. Reservas prontas são reutilizadas até a expiração do provedor.

## Banco e instalação

As migrações novas são `000041_payment_integrity.sql`, `000042_financial_canonical_reporting.sql` e `000043_pix_prepaid_access.sql`. A 000043 aplica o bloqueio do PIX avulso no vencimento, inclusive para vínculos antigos identificados por `pay_`. Devem ser aplicadas em sequência depois das migrações anteriores do projeto, junto da publicação do novo código. Criam operações de checkout, aliases de pagamento, livro de estornos e funções transacionais; também corrigem a leitura financeira e as permissões de compras.

Não executar o código novo contra esquema antigo: as funções e colunas novas são obrigatórias. Eventos antigos com erro deixam de aparecer como concluídos; precisam de reenvio pelo provedor ou conciliação apropriada. A publicação deve prever janela coordenada e backup do banco.

## Verificação local

- `npm test`: **91 testes aprovados**, incluindo testes novos de banco e handlers.
- `npm run typecheck`, `npm run lint` e `npm run build`: aprovados.
- Migrações aplicadas em banco PostgreSQL PGlite isolado, sem dados reais.
- Cobertura nova: idempotência PIX, não extensão repetida de acesso, rollback em vínculo/valor incorreto, snapshots atrasados, estornos parcial/integral, aliases Stripe, RLS, valores financeiros, assinaturas de webhook, token Asaas e resposta de falha para reentrega.
- Interface dos relatórios verificada com fixtures em português/inglês, desktop/celular, gráficos e controles de download/impressão. Isso não equivale a checkout bancário real.

## Homologação externa ainda necessária

1. Configurar as variáveis de `.env.example` no ambiente correto, com chaves correspondentes ao mesmo ambiente de sandbox ou produção. Não enviar segredos por chat.
2. Aplicar o histórico completo de migrações e publicar o código correspondente.
3. Configurar Stripe no endpoint `/api/webhooks/stripe`, com payload snapshot compatível com a API fixada `2025-02-24.acacia`. Assinar eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, eventos de assinatura e fatura usados pelo fluxo, `charge.refunded`, eventos de estorno e disputa.
4. Configurar Asaas no endpoint `/api/webhooks/asaas`, com `asaas-access-token` igual a `ASAAS_WEBHOOK_TOKEN`. Token em query string não é aceito. Habilitar os eventos de pagamento, estorno e disputa relevantes.
5. Homologar cartão aprovado, recusado, 3DS, período de teste, renovação, inadimplência, cancelamento e reativação. Conferir preço/moeda/período, um lançamento por fatura e acesso do aluno.
6. Homologar PIX criado, pagamento confirmado/recebido, expiração e reenvio do mesmo evento. Comparar QR, identificação da cobrança, período de acesso e financeiro.
7. Homologar compras de e-book, estorno parcial/integral e disputa; comparar valores e permissões de download.
8. Conciliar registros históricos, comparar receita e estornos com os extratos dos provedores e testar exportações autenticadas com os dados reais.

Os estornos Asaas usam a data disponibilizada no objeto de estorno; se o provedor informar somente a data de criação da solicitação, ela não comprova o instante de liquidação bancária. As taxas só são apresentadas como conhecidas quando retornadas em moeda compatível.

## Referências oficiais consultadas

- [Stripe: recebimento, assinatura, duplicidade e entrega de webhooks](https://docs.stripe.com/webhooks).
- [Stripe: confirmação de checkout e fulfillment](https://docs.stripe.com/checkout/fulfillment).
- [Asaas: eventos de pagamento, estorno e disputa](https://docs.asaas.com/docs/payment-events).
- [Asaas: identificador único do evento e reentregas](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint).
- [Asaas: estornos](https://docs.asaas.com/docs/estornos).
