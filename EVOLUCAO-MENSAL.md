# Minha evolução mensal

Aplicar `000063_monthly_progress.sql` após as migrações anteriores antes de disponibilizar o módulo. Nenhuma migração é aplicada automaticamente no Supabase remoto pelo código local.

## Funcionamento

O mês segue o fuso horário do perfil, com fallback America/Sao_Paulo. O registro fica disponível no dia 1 e pode ser concluído em qualquer dia daquele mês. Há um único registro por aluno/mês, com peso de 20 a 500 kg (até duas casas decimais) e quatro fotos obrigatórias: frente, costas, lado esquerdo e lado direito.

Só o mês corrente pode ser criado ou corrigido pelo aluno. Registros anteriores ficam preservados. O número de versão evita que uma aba sobrescreva alterações recentes de outra. O peso também atualiza o histórico diário e o perfil existentes; essa integração acontece na mesma transação.

O aluno escolhe dois meses e o ângulo. A comparação mostra fotos lado a lado, peso de cada mês e variação numérica. Não atribui julgamento à mudança de peso. Com apenas um registro, informa que a comparação será possível após o próximo mês.

## Privacidade e uploads

Fotos ficam no bucket privado `monthly-progress`, disponíveis apenas ao próprio aluno autenticado com acesso vigente. Não são publicadas na comunidade. Coaches e administradores não ganham acesso às imagens por este módulo.

Cada upload aceita JPG/PNG/WebP de até 4 MB, valida bytes reais, remove EXIF e normaliza orientação/tamanho no servidor. Cada arquivo tem reserva vinculada ao aluno, mês e ângulo. Só uploads concluídos podem ser salvos. O limite é de 20 tentativas por hora por aluno. O conjunto só é registrado depois das quatro fotos prontas; envios parciais não criam um registro mensal.

O cron existente nas tarefas uploads/all limpa arquivos abandonados ou substituídos após 24 horas. Fotos referenciadas no histórico são preservadas. A marcação e a transação protegem arquivos durante salvamentos simultâneos.

## Dia 1

Nas tarefas reminders/all, o cron gera um lembrete por aluno/mês no dia 1 após 8h no fuso do perfil. Exclui contas suspensas, sem acesso e alunos que já concluíram o mês. A central e o dispatcher existentes fazem a entrega, incluindo push quando configurado e permitido pelas preferências do usuário. O módulo não solicita permissão de push automaticamente.

A execução e a frequência do cron precisam estar configuradas na hospedagem. Sem cron, o aviso de pendência continua aparecendo em Minha evolução, mas a notificação automática não é gerada. Os lembretes são limitados a 500 elegíveis por execução e idempotentes.

## Validação

`tests/monthly-progress.test.mjs` verifica transações, quatro ângulos, autoria, versão, histórico de peso, privacidade, limpeza, período e lembretes. `tests/preview-monthly-progress.mjs` exercita React real e PGlite com Auth/Storage locais, incluindo envio, correção, comparação, PT/EN e 390/1440 px. Capturas em artifacts/monthly-progress-ui são fixtures visuais; não são fotos reais de alunos.

Homologar a migração, o bucket e o cron no ambiente conectado antes de produção.

## Comparação deslizante

A visualização padrão sobrepõe os dois meses do mesmo ângulo em uma área fixa, preservando proporções. O aluno arrasta a divisória com dedo ou mouse para revelar cada foto. O controle também aceita setas, Home/End e centralização. A opção Lado a lado continua disponível. Trocar mês ou ângulo reinicia a divisória no centro. A rolagem vertical no celular continua habilitada. Não requer migração adicional.
