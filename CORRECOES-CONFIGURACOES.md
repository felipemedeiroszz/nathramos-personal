# Configurações: correções e validação

Os campos de marca (PT/EN), slogan, e-mail, WhatsApp e horário de suporte agora alimentam o cabeçalho e o rodapé públicos. As páginas de retorno do pagamento usam os mesmos valores. Contatos vazios ficam ocultos; apagar o slogan também é preservado.

O formulário administrativo não exibe valores padrão quando a leitura falha. Uma configuração ausente ou inválida interrompe a leitura com erro, evitando que o administrador sobrescreva valores desconhecidos. O cadastro público permanece fechado quando não é possível consultar sua disponibilidade. Falhas na consulta de manutenção continuam bloqueando a operação protegida.

## Gravação e manutenção

- A versão carregada é conferida antes de gravar. Um formulário antigo não sobrescreve alterações feitas em outra sessão.
- Configurações e auditoria são gravadas na mesma transação. Falha em qualquer etapa desfaz a operação.
- O botão de salvar e os campos ficam bloqueados durante toda a requisição. Erros de rede geram uma mensagem e liberam nova tentativa.
- O formulário usa o snapshot retornado pelo banco, incluindo o prazo de manutenção, e preserva rascunhos durante atualizações externas.
- Salvar um contato não prolonga uma manutenção ativa nem reinicia uma manutenção vencida.
- Para reiniciar uma manutenção vencida, use **Iniciar nova janela de manutenção** e salve. Ativar o modo ou alterar sua duração também calcula uma nova janela.
- Uma manutenção antiga sem prazo é preservada; o reinício explícito permite definir uma janela com duração.
- Prazos são exibidos no horário de São Paulo, e o indicador acompanha o vencimento enquanto a tela está aberta.
- WhatsApp aceita somente números internacionais sintaticamente válidos, com código do país, e é armazenado sem formatação. A validação não verifica existência ou titularidade do número.

## Ativação no banco real

Aplicar `supabase/migrations/000047_platform_settings_integrity.sql` após as migrações anteriores. O arquivo cria a função `admin_save_platform_settings`, restrita ao service role e com conferência de administrador ativo. Não muda os valores atuais das configurações.

Sem essa função, o novo salvamento retorna erro e preserva o banco. Não existe fallback para a gravação antiga. A inspeção SQL `supabase/diagnostics/admin-readiness.sql` também confere a presença e a permissão da função.

A implementação não aplicou migrações nem salvou configurações reais no Supabase.

## Testes

`tests/platform-settings.test.mjs` executa serviços e ações reais contra PostgreSQL PGlite isolado. Cobre os campos, localização, autorização, indisponibilidade, cadastro fechado, manutenção em horas/dias, vencimento, reinício explícito, conflitos de versão, rollback da auditoria e validação de contatos. Cabeçalho e rodapé reais são renderizados com valores de teste.

`node tests/prepare-settings-preview.mjs` prepara a interface real com uma ação inteiramente simulada em `artifacts/settings-qa/`. O `server.mjs` gerado permite inspeção em `http://localhost:3100/`, se iniciado separadamente. Nenhum pedido desse servidor alcança o banco real. A revisão no navegador conferiu mensagens de erro, botão pendente, retorno do prazo, rascunho preservado, recarga, atualização dos contatos e textos longos em 390 px, inclusive em inglês.
