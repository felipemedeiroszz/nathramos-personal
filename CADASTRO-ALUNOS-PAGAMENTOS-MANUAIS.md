# Cadastro de alunos e recebimentos manuais

Acesso exclusivo do administrador. Coaches continuam limitados à carteira de atendimento.

## Uso

1. Em **Alunos → Novo aluno**, informe nome, e-mail, telefone opcional e senha inicial. O cadastro não envia e-mail nem cria cobrança.
2. Abra a ficha pelo link exibido após salvar.
3. Em **Plano e pagamentos manuais**, escolha:
   - **Plano + pagamento recebido** para liberar acesso e lançar um recebimento juntos.
   - **Somente plano e acesso** para liberar um período sem registrar receita.
   - **Somente pagamento recebido** para registrar um valor sem alterar o prazo de acesso.
4. Para acesso, selecione o plano e a última data permitida. O período começa agora e inclui o dia escolhido inteiro, no horário de São Paulo. Não há renovação automática nem dias de tolerância.
5. Para recebimentos, informe valor, moeda, data, forma (dinheiro, PIX, transferência ou cartão presencial) e observação opcional. Apenas valores já recebidos devem ser lançados. Não use separador de milhares no valor.

Os recebimentos usam provedor **manual**, status **pago** e taxa zero, sem chamadas a Stripe/Asaas. Aparecem na ficha, em Pagamentos, no histórico do aluno e no financeiro. Planos manuais não geram previsão de receita recorrente. A liberação sem pagamento não gera receita.

Na ficha, o atalho **Histórico financeiro** abre **Histórico de mensalidades e pagamentos**. A consulta reúne todos os lançamentos do aluno, online e manuais, em páginas de 20 registros. Permite filtrar situação, origem, tipo e período pela data de lançamento, pagamento ou vencimento da cobrança. Exibe valor/moeda, plano vinculado, forma, datas, estornos, referência e observação manual. Lançamentos sem plano aparecem como avulsos; podem ser separados pelo filtro. O histórico é exclusivo do administrador e falhas de consulta não são convertidas em listas vazias.

Uma nova liberação manual substitui o período manual anterior; os pagamentos históricos preservam o vínculo com o período original. Assinaturas que ainda podem cobrar no gateway e checkouts pendentes impedem uma liberação manual sobreposta. Um PIX avulso já vencido pode ser renovado manualmente. Recebimentos isolados não cancelam nem conciliam cobranças do gateway.

## Banco e publicação

Aplicar após as migrações existentes, nesta ordem:

1. `supabase/migrations/000044_manual_payment_types.sql`: acrescenta os valores `manual` e `cash` aos enums. Esta migração precisa ser confirmada antes da próxima.
2. `supabase/migrations/000045_manual_student_billing.sql`: operação transacional, auditoria, deduplicação, permissões e vencimento do acesso manual.

Publicar o código somente com essas dependências disponíveis. O diagnóstico administrativo e `supabase/diagnostics/admin-readiness.sql` incluem a nova dependência. Nenhuma migração remota foi aplicada durante a implementação.

## Verificação

`student-creation.test.mjs` cobre autorização, validação, papel fixo, e-mail duplicado e compensação do cadastro incompleto. Auth é substituído; não cria contas reais.

`manual-student-billing.test.mjs` aplica as migrações em PostgreSQL PGlite isolado. Cobre dinheiro no relatório financeiro, vencimento sem tolerância, reenvio idempotente, renovação, recebimento separado do acesso, isolamento de equipe, conflitos com gateways e rollback completo quando a auditoria falha. Não cria cobranças reais.
