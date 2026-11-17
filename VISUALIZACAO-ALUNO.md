# Visualizar como aluno

Administradores ativos podem abrir a ficha de um aluno e clicar em **Visualizar como aluno**. O painel usa a identidade do aluno e respeita suas permissões, assinatura e manutenção. **Voltar ao administrador** encerra a visualização sem encerrar a sessão administrativa.

A visualização é somente leitura, dura até 15 minutos e registra a entrada na auditoria. Alterações, pagamentos, mensagens, uploads e Server Actions ficam bloqueados. Treinadores não recebem esse acesso. Se a auditoria não puder registrar a entrada, o acesso não é iniciado.

A autenticação temporária é criada no servidor sem enviar e-mail. Seu token fica criptografado em cookie HttpOnly, vinculado ao administrador autenticado; não é entregue ao JavaScript do navegador. O contexto é revalidado a cada consulta. A sessão original permanece intacta. Não há senha compartilhada nem migração nova.

Durante a visualização, o cliente Supabase do navegador fica anônimo e não registra push. Atualizações dependentes de realtime ou Server Actions podem exigir recarregar a página. Use a ficha administrativa para fazer alterações.

Testes cobrem criptografia, adulteração, prazo, autorização, CSRF na entrada, auditoria obrigatória, bloqueio de alterações, proteção dos headers e preservação da sessão administrativa. O fluxo com contas reais precisa ser homologado no ambiente de destino.
