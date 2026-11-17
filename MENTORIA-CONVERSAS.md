# Gestão de conversas da mentoria

Aplique no SQL Editor do Supabase a migração `supabase/migrations/000064_mentorship_conversation_management.sql` para habilitar as ações. O código não executa migrações automaticamente no banco remoto.

No painel de mentoria:

- **Conversas / Arquivadas:** alterna entre atendimentos abertos e arquivados.
- **Arquivar conversa:** preserva mensagens e pausa o envio para os dois participantes.
- **Reabrir conversa:** retoma o atendimento com o histórico preservado.
- **Excluir conversa:** exige confirmação e é exclusivo do administrador. Remove o histórico da interface dos dois participantes, zera contadores e arquiva o atendimento. Reabrir inicia uma conversa vazia. Não há desfazer pelo app. Os registros são marcados como excluídos no banco, sem apagar fisicamente os dados.

Treinadoras só podem arquivar ou reabrir conversas da própria carteira. Alunos não recebem essas ações. A autorização é validada novamente no servidor e no banco. Atualização e auditoria são atômicas: se a auditoria falhar, a alteração também é desfeita. O banco rejeita novas mensagens em conversas arquivadas.

Validação: testes PostgreSQL local de permissões, arquivamento, reabertura, exclusão lógica, contadores, auditoria e rollback; testes de interface com dados simulados em celular e desktop, em português e inglês. Nenhuma conversa real foi alterada durante os testes.
