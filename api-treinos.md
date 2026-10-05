# MÓDULO DE TREINOS — EXERCISEDB API v1.0.0 + TREINOS PRONTOS + CRIAÇÃO PERSONALIZADA + KITS

A plataforma deve possuir um sistema completo de treinos, exercícios, séries, repetições, vídeos/demonstrações e kits de treino.

Utilizar como fonte de exercícios a:

**ExerciseDB API v1.0.0**
**OpenAPI 3.1.0**
**Versão gratuita**

A integração deve respeitar exatamente a documentação/OpenAPI da versão utilizada.

NÃO inventar endpoints, parâmetros ou campos que não existam na versão da API utilizada.

Criar uma camada de integração isolada:

ExerciseDBService

para que a aplicação não fique diretamente dependente da implementação da API.

---

# 1. CONCEITO DA ARQUITETURA

Separar claramente:

1. Exercícios
2. Treinos
3. Kits de Treino
4. Atribuição do Kit ao aluno
5. Execução do treino pelo aluno
6. Histórico de execução

A estrutura deve funcionar desta maneira:

EXERCÍCIO
↓
TREINO
↓
KIT DE TREINO
↓
ALUNO
↓
EXECUÇÃO
↓
HISTÓRICO / DESEMPENHO

---

# 2. EXERCÍCIOS

A plataforma terá uma biblioteca de exercícios.

Os exercícios poderão vir da ExerciseDB API ou ser cadastrados manualmente pelo administrador.

Exemplos:

* Supino reto
* Agachamento
* Leg press
* Desenvolvimento
* Elevação lateral
* Rosca direta
* Tríceps pulley
* Puxada frontal

A ExerciseDB será utilizada principalmente para:

* catálogo de exercícios
* demonstração do exercício
* imagens
* vídeos/animações quando disponibilizados pela API
* informações técnicas disponibilizadas pela API

Não depender exclusivamente da API para o funcionamento da plataforma.

---

# 3. IMPORTAÇÃO / CACHE DOS EXERCÍCIOS

Sempre que possível, utilizar os dados da ExerciseDB para alimentar uma biblioteca própria da plataforma.

Criar uma tabela local:

exercises

Campos sugeridos:

* id
* external_id
* source
* name_pt
* name_en
* description_pt
* description_en
* instructions_pt
* instructions_en
* body_part
* target
* equipment
* gif_url
* image_url
* video_url
* source_metadata
* is_active
* created_at
* updated_at

Onde:

source poderá ser:

* exercisedb
* custom

O campo external_id deve armazenar o identificador do exercício na ExerciseDB quando aplicável.

Isso permite que o sistema continue funcionando mesmo quando a API externa estiver temporariamente indisponível.

---

# 4. NÃO FAZER REQUEST DA EXERCISEDB A CADA VEZ QUE O ALUNO ABRIR UM TREINO

Evitar chamadas desnecessárias à API externa.

A plataforma deve utilizar:

* cache
* banco de dados local
* sincronização controlada
* atualização de dados quando necessário

O aluno deve conseguir abrir um treino utilizando os dados armazenados na plataforma.

A ExerciseDB não pode se tornar um ponto único de falha.

---

# 5. SINCRONIZAÇÃO

Criar mecanismo administrativo para:

"Sincronizar exercícios"

O sistema consulta a ExerciseDB conforme os endpoints disponíveis na documentação da API v1.0.0.

Processar:

* novos exercícios
* alterações
* exercícios removidos/inativos
* imagens
* animações
* equipamentos
* músculos/grupos musculares
* demais informações disponíveis

Registrar:

* data da sincronização
* quantidade encontrada
* quantidade criada
* quantidade atualizada
* erros

---

# 6. TRADUÇÃO PT/EN

A plataforma é bilíngue.

Quando o exercício da ExerciseDB não possuir tradução em português, a aplicação deve manter o dado original e permitir que o administrador defina:

name_pt
name_en

description_pt
description_en

instructions_pt
instructions_en

Não sobrescrever automaticamente uma tradução manual feita pelo administrador durante uma sincronização.

---

# 7. EXERCÍCIOS PERSONALIZADOS

O administrador também poderá criar exercícios próprios.

Exemplo:

Nome PT:
"Elevação lateral unilateral no cabo"

Nome EN:
"Single-arm cable lateral raise"

Campos:

* nome PT
* nome EN
* descrição PT
* descrição EN
* instruções PT
* instruções EN
* grupo muscular
* músculo alvo
* equipamento
* imagem
* vídeo
* observações
* ativo/inativo

Esses exercícios terão:

source = custom

e funcionarão exatamente como os exercícios provenientes da ExerciseDB.

---

# 8. TREINOS PRONTOS

A plataforma já deverá possuir treinos prontos.

Exemplos:

* Treino A — Peito e Tríceps
* Treino B — Costas e Bíceps
* Treino C — Pernas
* Treino D — Ombros
* Treino E — Full Body

Esses treinos podem ser preparados previamente pelo administrador.

O administrador poderá editar, duplicar, arquivar e reutilizar os treinos.

---

# 9. CRIAÇÃO DE TREINOS

O administrador poderá criar novos treinos.

Campos:

* nome PT
* nome EN
* descrição PT
* descrição EN
* categoria
* nível
* objetivo
* duração estimada
* ordem
* status
* exercícios

Exemplo:

Treino A — Peito e Tríceps

1. Supino reto
   4 séries
   10 repetições

2. Supino inclinado
   3 séries
   10 repetições

3. Crucifixo
   3 séries
   12 repetições

4. Tríceps pulley
   4 séries
   12 repetições

---

# 10. ESTRUTURA DE CADA EXERCÍCIO NO TREINO

Cada exercício dentro de um treino deve possuir configuração própria.

Campos:

* exercise_id
* ordem
* séries
* repetições
* descanso
* carga sugerida
* tempo
* distância, quando aplicável
* observação PT
* observação EN
* obrigatório/opcional

Não armazenar apenas uma lista simples de exercícios.

Criar uma entidade intermediária, por exemplo:

workout_exercises

para permitir configurações diferentes do mesmo exercício em diferentes treinos.

---

# 11. SÉRIES

Cada exercício poderá possuir várias séries.

Exemplo:

Supino reto

Série 1:
10 repetições

Série 2:
10 repetições

Série 3:
8 repetições

Série 4:
8 repetições

O aluno deverá poder registrar:

* carga utilizada
* repetições realizadas
* concluído
* observação

---

# 12. EXECUÇÃO DO TREINO

Quando o aluno iniciar o treino:

/treino/[id]

Mostrar:

Nome do treino

Progresso:

2 / 6 exercícios concluídos

Exercício atual:

SUPINO RETO

Demonstração visual

Séries:

Série 1
10 reps
Carga: [____] kg
[Concluir]

Série 2
10 reps
Carga: [____] kg
[Concluir]

etc.

---

# 13. VÍDEOS / DEMONSTRAÇÕES

Quando o exercício possuir mídia fornecida pela ExerciseDB, utilizar essa informação conforme permitido pela API.

A interface deve possuir:

* demonstração visual
* imagem/GIF quando disponível
* vídeo quando disponível
* botão para visualizar
* carregamento otimizado

Caso o exercício personalizado possua vídeo próprio, utilizar o vídeo cadastrado pelo administrador.

Não criar mídia falsa.

---

# 14. KITS DE TREINO

Criar um módulo específico:

**Kit de Treinos**

O administrador poderá montar um conjunto de treinos.

Exemplo:

KIT — HIPERTROFIA INICIANTE

Treinos:

* Treino A — Peito + Tríceps
* Treino B — Costas + Bíceps
* Treino C — Pernas
* Treino D — Ombros

Outro:

KIT — HIPERTROFIA AVANÇADA

* Treino A
* Treino B
* Treino C
* Treino D
* Treino E
* Treino F

---

# 15. CRIAÇÃO DO KIT

Tela:

/admin/kits/treinos/novo

Campos:

Nome PT
Nome EN

Descrição PT
Descrição EN

Categoria

Nível

Objetivo

Status

Depois:

"Adicionar treinos"

Abrir biblioteca de treinos.

O administrador poderá selecionar vários treinos.

Exemplo:

[x] Treino A
[x] Treino B
[x] Treino C
[ ] Treino D
[x] Treino E

Salvar Kit.

---

# 16. ORDEM DOS TREINOS NO KIT

O administrador poderá definir a ordem.

Exemplo:

Dia 1 → Treino A
Dia 2 → Treino B
Dia 3 → Treino C
Dia 4 → descanso
Dia 5 → Treino D

A ordem deve ser armazenada.

Não depender do ID ou da ordem de criação.

---

# 17. ATRIBUIÇÃO DO KIT AO ALUNO

No cadastro/perfil do aluno:

"Kit de Treino"

O administrador poderá selecionar um kit existente.

Exemplo:

Aluno:
João Silva

Kit:
HIPERTROFIA INICIANTE

Data de início:
01/10/2026

O sistema cria a relação entre aluno e kit.

---

# 18. ATÉ 6 TIPOS DE TREINO ATIVOS

Manter o requisito de até **6 tipos de treino ativos por aluno**.

O aluno poderá receber:

* Treino A
* Treino B
* Treino C
* Treino D
* Treino E
* Treino F

O administrador não poderá ultrapassar o limite sem uma regra explícita de alteração do sistema.

---

# 19. PERSONALIZAÇÃO POR ALUNO

O kit pode ser padrão, mas o administrador deve conseguir personalizar o treino de um aluno.

Exemplo:

Kit original:

Treino A:
Supino 4x10

Aluno específico:

Supino 3x10

Essa alteração deve ser feita sem alterar o treino original utilizado por outros alunos.

Utilizar uma estrutura de atribuição/versionamento adequada.

---

# 20. HISTÓRICO

Registrar cada execução.

Exemplo:

Aluno:
João

Data:
29/09/2026

Treino:
Treino A — Peito e Tríceps

Exercício:
Supino reto

Série 1:
80 kg × 10

Série 2:
80 kg × 10

Série 3:
82 kg × 8

Série 4:
82 kg × 8

Status:
Concluído

Isso será utilizado posteriormente no módulo:

"Meu Desempenho".

---

# 21. PROGRESSÃO

O sistema deve armazenar histórico suficiente para futuramente mostrar:

* evolução de carga
* evolução de repetições
* frequência de treino
* exercícios mais executados
* volume
* histórico mensal
* evolução por exercício

Não implementar métricas incorretas apenas para preencher gráficos.

---

# 22. DISPONIBILIDADE DO PRÓXIMO TREINO

Manter a regra definida para o produto:

Após concluir o treino do dia, o próximo treino ficará disponível no próximo dia de acordo com a rotina configurada.

A regra deve considerar a conclusão do treino e o calendário do usuário.

Não utilizar simplesmente um timer de 24 horas se a regra de negócio for baseada em dia do calendário.

---

# 23. DESCANSO ENTRE SÉRIES

Opcionalmente, cada exercício poderá possuir tempo de descanso.

Exemplo:

Descanso:
60 segundos

Ao concluir uma série:

"Descanso"

01:00

O cronômetro deverá funcionar no frontend sem depender de servidor.

A conclusão da série, entretanto, deve ser persistida no backend.

---

# 24. ADMIN — BIBLIOTECA DE EXERCÍCIOS

Criar:

/admin/exercicios

Recursos:

* pesquisar
* filtrar
* ordenar
* visualizar
* editar
* ativar/desativar
* criar exercício
* sincronizar ExerciseDB
* identificar origem

Filtros:

* origem
* grupo muscular
* equipamento
* músculo alvo
* status

Exibir claramente:

ExerciseDB

ou

Personalizado

---

# 25. ADMIN — TREINOS

Criar:

/admin/treinos

Permitir:

* listar
* criar
* editar
* duplicar
* arquivar
* excluir quando permitido
* visualizar
* pesquisar
* filtrar por categoria
* filtrar por nível
* filtrar por objetivo

---

# 26. ADMIN — KITS

Criar:

/admin/kits/treinos

Permitir:

* criar kit
* editar
* duplicar
* arquivar
* adicionar/remover treinos
* reorganizar treinos
* visualizar alunos associados
* atribuir a alunos

---

# 27. BANCO DE DADOS

Criar entidades semelhantes a:

exercises

workouts

workout_exercises

workout_kits

workout_kit_items

student_workout_kits

student_workout_overrides

workout_sessions

workout_set_logs

A estrutura final deve ser normalizada e preparada para crescimento.

---

# 28. INTEGRAÇÃO COM NOTIFICAÇÕES

O módulo de treinos deve utilizar o NotificationService central.

Eventos que podem gerar notificações:

* novo treino atribuído
* treino disponível
* horário do treino
* treino não concluído
* alteração no treino
* novo kit atribuído
* treino concluído

Exemplo:

"Hora do treino"

"Seu treino de hoje está pronto."

Ao clicar:

/dashboard/treino

---

# 29. INTEGRAÇÃO COM O DASHBOARD DO ALUNO

No Dashboard:

TREINO DE HOJE

Treino A
Peito + Tríceps

6 exercícios

Progressão:
0%

Botão:

"INICIAR TREINO"

Após concluir:

"Treino concluído"

Mostrar resumo:

* duração
* exercícios
* séries
* carga total registrada, quando calculável
* progresso

---

# 30. REGRA DE FALLBACK

Se a ExerciseDB estiver indisponível:

O aluno deve continuar conseguindo acessar e executar os treinos já salvos no banco local.

Não bloquear:

* login
* dashboard
* treino
* histórico
* execução

A integração externa é uma fonte de dados, não o núcleo da aplicação.

---

# 31. LICENÇA E USO DA API

Respeitar os termos de uso e limites da versão gratuita da ExerciseDB.

Não assumir que imagens, GIFs, vídeos ou demais conteúdos externos podem ser redistribuídos sem verificar as condições aplicáveis.

Manter metadados de origem quando necessário.

Não copiar conteúdo externo para armazenamento permanente se isso contrariar os termos da API.

---

# 32. REGRA FINAL DO MÓDULO

A experiência deve ser:

EXERCISEDB
↓
Biblioteca de exercícios

*

Exercícios personalizados do administrador
↓
Biblioteca própria

Biblioteca de exercícios
↓
Administrador cria ou utiliza TREINOS PRONTOS
↓
Treinos
↓
Administrador monta KITS DE TREINO
↓
Kit atribuído ao aluno
↓
Aluno executa treino
↓
Registra séries/repetições/carga
↓
Histórico
↓
Meu Desempenho

O administrador NÃO deve precisar criar cada exercício manualmente se o exercício já existir na ExerciseDB.

O administrador deve conseguir selecionar exercícios existentes para montar treinos.

O administrador deve conseguir selecionar treinos existentes para montar Kits de Treino.

O administrador deve conseguir atribuir Kits de Treino aos alunos.

Essa arquitetura deve ser implementada de forma real, persistente, segura, bilíngue, responsiva e integrada ao restante da plataforma.
Fluxo que fica definido

ExerciseDB → Exercícios → Treinos → Kits → Aluno

Por exemplo:

ExerciseDB
Supino reto, Supino inclinado, Crucifixo, Tríceps pulley

↓

Treino A — Peito e Tríceps

Supino reto — 4×10
Supino inclinado — 3×10
Crucifixo — 3×12
Tríceps pulley — 4×12

↓

Kit Hipertrofia Iniciante

Treino A
Treino B
Treino C
Treino D

↓

João Silva recebe o Kit

E o João passa a enxergar o treino correspondente no dia, com demonstração do exercício, séries, repetições, registro de carga e conclusão, enquanto tudo fica salvo para o módulo Meu Desempenho.