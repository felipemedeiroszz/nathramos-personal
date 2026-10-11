# PROMPT MESTRE — AUDITORIA, CORREÇÃO E REESTRUTURAÇÃO DO PAINEL ADMINISTRATIVO FITNESS SaaS

## 1. CONTEXTO

O painel administrativo da minha plataforma fitness SaaS já foi criado, porém a implementação atual está incorreta, desorganizada e não corresponde à arquitetura, ao design e às funcionalidades esperadas.

**Sua missão é corrigir e refatorar o painel administrativo existente, aproveitando o que estiver correto e reconstruindo somente o que estiver errado.**

Não comece um projeto novo.

Não crie um segundo painel paralelo.

Não substitua toda a aplicação por uma implementação genérica.

Trabalhe diretamente no código existente, analisando arquivos, componentes, rotas, banco de dados, integrações e estilos antes de tomar decisões.

O objetivo é transformar o painel atual em um sistema administrativo profissional, consistente, funcional e preparado para produção.

## 2. REGRA FUNDAMENTAL: AUDITAR ANTES DE ALTERAR

Antes de escrever ou modificar código:

1. Inspecione a estrutura completa do projeto.
2. Identifique a stack realmente utilizada.
3. Analise as rotas administrativas existentes.
4. Analise os layouts, componentes e estilos.
5. Identifique componentes duplicados.
6. Verifique erros de navegação e responsividade.
7. Verifique a integração com Supabase.
8. Verifique a autenticação e as permissões.
9. Analise as tabelas e migrations existentes.
10. Identifique funcionalidades reais, incompletas, quebradas ou meramente visuais.
11. Verifique se existem integrações de pagamento já implementadas.
12. Identifique inconsistências entre o código e os requisitos deste prompt.

Não presuma que o projeto utiliza determinada estrutura de arquivos sem verificar.

Não presuma que uma funcionalidade está funcionando apenas porque existe uma página com o nome correspondente.

Diferencie claramente:
- Funcionalidade implementada e funcional.
- Funcionalidade parcialmente implementada.
- Funcionalidade visual sem integração.
- Funcionalidade quebrada.
- Funcionalidade inexistente.

Após a auditoria, apresente um diagnóstico objetivo dos problemas encontrados e um plano de correção priorizado.

Em seguida, comece a corrigir os problemas diretamente no projeto.

Não pare apenas na apresentação do diagnóstico.

## 3. PRESERVAÇÃO DO PROJETO

A correção deverá seguir estas regras:

- Não apagar funcionalidades que já funcionam.
- Não apagar migrations antigas.
- Não recriar tabelas existentes sem necessidade.
- Não modificar o schema de maneira destrutiva.
- Não substituir integrações reais por dados simulados.
- Não remover autenticação ou políticas RLS.
- Não quebrar integrações de pagamento existentes.
- Não duplicar rotas, layouts ou componentes.
- Não alterar arquivos sem compreender suas dependências.
- Não criar dados fictícios para mascarar funcionalidades incompletas.

Antes de uma mudança estrutural, identifique os impactos e faça as alterações de forma controlada.

Se precisar modificar o banco, crie migrations incrementais e não destrutivas.

Se encontrar uma implementação correta, preserve-a.

Se encontrar uma implementação errada, corrija-a.

Se uma funcionalidade depender de credenciais que ainda não existem, mantenha a arquitetura correta e documente o que falta para concluir a integração.

## 4. IDENTIDADE VISUAL OBRIGATÓRIA

Padronize o painel administrativo com a seguinte identidade:

**Premium + Fitness + Tecnologia + Performance.**

### Paleta
- Preto predominante.
- Amarelo como cor principal de destaque.
- Branco para textos principais.
- Cinza para textos secundários.
- Tons escuros para cards, superfícies e áreas de navegação.

Implementar somente Dark Mode nesta etapa.

Criar ou corrigir os tokens centralizados de cores, tipografia, espaçamento, bordas, sombras e estados dos componentes.

Não espalhar valores hexadecimais diretamente pelos componentes.

### Direção visual
- Interface limpa e profissional.
- Hierarquia visual consistente.
- Sidebar bem organizada.
- Header alinhado.
- Cards com proporções coerentes.
- Tabelas legíveis.
- Formulários padronizados.
- Botões com estados consistentes.
- Modais bem dimensionados.
- Espaçamentos uniformes.
- Gráficos visualmente integrados ao sistema.
- Animações discretas.
- Sem elementos decorativos desnecessários.

Não quero um dashboard genérico, excessivamente colorido ou com aparência de template inacabado.

**É proibido utilizar emojis como ícones.** Utilize Lucide React ou outra biblioteca de ícones SVG já existente no projeto, evitando adicionar dependências desnecessárias.

## 5. CORRIGIR O LAYOUT GLOBAL

Audite e corrija o layout compartilhado de todas as páginas administrativas.

### Sidebar
Deve conter:

**Principal**
- Dashboard
- Alunos

**Conteúdo fitness**
- Treinos
- Categorias
- Exercícios
- Dietas
- Alimentos
- Suplementos
- Exames
- E-books

**Kits**
- Kits de treinos
- Kits de dietas
- Kits de suplementos

**Relacionamento**
- Mentoria
- Reuniões
- Notificações
- Redes sociais

**Financeiro**
- Planos
- Assinaturas
- Pagamentos
- Financeiro

**Sistema**
- Configurações
- Auditoria

Ajuste a organização conforme as rotas e funcionalidades que realmente existem, sem criar links para páginas inexistentes.

A sidebar deverá:
- Ter agrupamentos claros.
- Permitir recolhimento quando apropriado.
- Exibir corretamente o item ativo.
- Utilizar ícones SVG consistentes.
- Funcionar no desktop, tablet e mobile.
- Não apresentar itens duplicados.
- Não possuir links quebrados.

### Header
Corrigir:
- Alinhamento.
- Altura.
- Breadcrumbs.
- Título da página.
- Seletor de idioma.
- Notificações.
- Avatar e menu de perfil.
- Espaçamento.
- Comportamento responsivo.

### Área de conteúdo
Corrigir:
- Largura útil.
- Margens.
- Espaçamento entre seções.
- Alinhamento dos títulos.
- Consistência dos cards.
- Overflow horizontal.
- Sobreposição de elementos.
- Comportamento em diferentes resoluções.

## 6. CORRIGIR O DASHBOARD ADMINISTRATIVO

O dashboard deverá apresentar informações reais do banco de dados.

Indicadores esperados:
- Total de alunos.
- Alunos ativos.
- Alunos pendentes.
- Alunos inadimplentes.
- Alunos bloqueados.
- Assinaturas ativas.
- Receita recebida no mês.
- Pagamentos pendentes.
- Cancelamentos.

Gráficos esperados:
- Evolução da receita.
- Crescimento da base de alunos.
- Distribuição dos status das assinaturas.
- Distribuição de pagamentos por gateway.

Atividades recentes:
- Cadastro de aluno.
- Pagamento confirmado.
- Alteração de assinatura.
- Atribuição de treino.
- Atualização de dieta.
- Envio de exame.
- Nova mensagem.

Corrija consultas, cálculos, estados de carregamento e estados vazios.

Não apresente números estáticos como se fossem dados reais.

Não misture BRL e USD sem uma conversão cambial explícita e documentada.

Caso algum indicador não possa ser implementado por falta de dados ou estrutura, documente a dependência e não invente resultados.

## 7. CORRIGIR O GERENCIAMENTO DE ALUNOS

Revise a listagem existente.

A tabela deverá apresentar, quando os dados estiverem disponíveis:
- Avatar.
- Nome.
- E-mail.
- Telefone.
- País.
- Plano.
- Status da assinatura.
- Gateway.
- Vencimento.
- Data de cadastro.
- Ações.

Corrija:
- Busca.
- Filtros.
- Ordenação.
- Paginação.
- Formatação de datas.
- Formatação monetária.
- Estados vazios.
- Loading.
- Tratamento de erros.
- Ações da tabela.

As consultas devem ser feitas de maneira eficiente, preferencialmente com paginação no servidor.

Revise a página de detalhes do aluno e suas abas existentes.

Preserve os históricos de treinos, pagamentos e outras informações importantes.

Não exponha dados sensíveis desnecessariamente.

## 8. CORRIGIR OS MÓDULOS EXISTENTES

Audite individualmente cada módulo presente no projeto.

### Treinos e exercícios
Verifique:
- Criação e edição.
- Categorias.
- Exercícios.
- Séries e repetições.
- Descanso.
- Imagens e vídeos.
- Ordenação.
- Publicação.
- Arquivamento.
- Atribuição ao aluno.
- Limite de seis treinos ativos por aluno.

### Dietas e alimentos
Verifique:
- Criação e edição.
- Refeições.
- Alimentos.
- Quantidades.
- Unidades.
- Valores nutricionais.
- Traduções.
- Atribuição.
- Kits.

### Suplementos e kits
Verifique:
- Cadastro.
- Quantidades.
- Unidades.
- Frequências.
- Descrições.
- Organização dos kits.
- Atribuição aos alunos.

### Exames
Verifique:
- Upload.
- Permissões.
- Visualização.
- Comentários.
- Limite de cinco arquivos por aluno por mês.
- Proteção dos arquivos privados.

### E-books
Verifique:
- Capa.
- PDF.
- Título e descrição.
- Publicação.
- Armazenamento.
- Permissões de acesso.

### Mentoria e reuniões
Verifique:
- Conversas.
- Envio de mensagens.
- Atualizações em tempo real.
- Mensagens não lidas.
- Anexos.
- Agendamento.
- Timezone.
- Notificações.

Não recrie esses módulos automaticamente. Corrija os que existem e implemente apenas as partes que realmente estiverem faltando e forem necessárias.

## 9. CORRIGIR FINANCEIRO E ASSINATURAS

Audite cuidadosamente as integrações financeiras já existentes.

Verifique:
- Planos.
- Valores e moedas.
- Assinaturas.
- Pagamentos.
- Estados das cobranças.
- Stripe.
- ASAAS.
- Webhooks.
- Idempotência.
- Histórico financeiro.
- Cancelamentos.
- Inadimplência.

Os status de pagamento nunca devem ser determinados exclusivamente pelo frontend.

Confirme se os webhooks validam a autenticidade dos eventos e se os eventos duplicados são tratados corretamente.

Verifique a regra de tolerância de três dias e o desbloqueio automático após confirmação de pagamento.

Não implemente gateways falsos nem simule pagamentos aprovados.

Se a integração já estiver funcional, não a substitua. Corrija apenas os problemas identificados e teste os fluxos afetados.

## 10. INTERNACIONALIZAÇÃO

A plataforma deve suportar:
- Português do Brasil: `pt-BR`.
- Inglês dos Estados Unidos: `en-US`.

Corrija a internacionalização de toda a interface administrativa.

Verifique:
- Textos.
- Menus.
- Botões.
- Formulários.
- Validações.
- Mensagens de erro.
- Estados vazios.
- Datas.
- Horários.
- Moedas.
- Notificações.

Não deixar textos traduzidos parcialmente ou misturar idiomas indevidamente.

O idioma escolhido deve respeitar a implementação existente de persistência da preferência.

Os formulários de conteúdo destinado aos alunos deverão manter os campos PT-BR e EN-US, quando aplicável.

## 11. CORRIGIR COMPONENTES DUPLICADOS E INCONSISTENTES

Identifique componentes repetidos ou visualmente diferentes sem motivo.

Padronize e reutilize:
- Botões.
- Inputs.
- Selects.
- Cards.
- Modais.
- Tabelas.
- Badges.
- Dropdowns.
- Toasts.
- Uploads.
- Paginação.
- Filtros.
- Skeletons.
- Estados vazios.
- Mensagens de erro.

Não crie um novo componente se já existir um componente equivalente que possa ser corrigido.

Preserve APIs de componentes existentes quando possível.

Se uma mudança de API for inevitável, atualize os pontos de uso e execute os testes correspondentes.

## 12. RESPONSIVIDADE

Teste e corrija o painel nas seguintes larguras:

- 390 px.
- 412 px.
- 430 px.
- 768 px.
- 1024 px.
- 1280 px.
- 1440 px.

Corrigir:
- Sidebar.
- Header.
- Cards.
- Gráficos.
- Tabelas.
- Filtros.
- Formulários.
- Modais.
- Menus.
- Botões.
- Overflow horizontal.

No mobile, tabelas extensas devem utilizar uma solução adequada, como colunas prioritárias, rolagem controlada ou cards responsivos.

Não basta reduzir o tamanho da interface desktop. A experiência deverá ser realmente adaptada para dispositivos móveis.

## 13. SEGURANÇA

Aproveite e fortaleça a implementação existente.

Verifique:
- Proteção server-side das rotas administrativas.
- Supabase Auth.
- Autorização baseada em roles e permissões.
- RLS.
- Validação server-side com Zod.
- Proteção de operações administrativas.
- Validação de uploads.
- URLs assinadas para arquivos privados.
- Rate limiting.
- Proteção de webhooks.
- Segredos em variáveis de ambiente.
- Auditoria.
- Acesso a informações sensíveis.

Teste especificamente:
- Aluno tentando acessar `/admin`.
- Usuário sem permissão tentando executar uma ação administrativa.
- Usuário tentando acessar dados de outro aluno.
- Tentativa de acessar exames privados de terceiros.
- Tentativa de modificar o próprio papel para obter privilégios.

Todos esses acessos devem ser negados quando não autorizados.

Não remova políticas RLS para facilitar a implementação.

Não coloque a chave de serviço do Supabase no navegador.

## 14. PROCESSO DE CORREÇÃO

Trabalhe nesta ordem:

**Etapa 1 — Auditoria**
- Inspecionar o código.
- Mapear as rotas.
- Identificar problemas.
- Apresentar um diagnóstico objetivo.

**Etapa 2 — Estrutura e layout**
- Corrigir o layout global.
- Corrigir sidebar e header.
- Padronizar o Design System.
- Corrigir responsividade.

**Etapa 3 — Navegação**
- Corrigir rotas.
- Corrigir links.
- Corrigir estados ativos.
- Remover duplicações desnecessárias.

**Etapa 4 — Páginas e módulos**
- Corrigir dashboard.
- Corrigir alunos.
- Corrigir conteúdo fitness.
- Corrigir relacionamento.
- Corrigir financeiro.
- Corrigir configurações.

**Etapa 5 — Integrações**
- Verificar consultas.
- Corrigir operações no backend.
- Corrigir validações.
- Corrigir integrações existentes.

**Etapa 6 — Segurança**
- Revisar autenticação.
- Revisar permissões.
- Revisar RLS.
- Revisar Storage.
- Testar acessos indevidos.

**Etapa 7 — Validação**
- Executar lint.
- Executar typecheck.
- Executar testes existentes.
- Criar testes para os fluxos críticos afetados.
- Corrigir erros.
- Testar responsividade.
- Testar os dois idiomas.

Não considere uma página corrigida apenas porque ela abre no navegador.

## 15. REGRAS DE EXECUÇÃO

- Modifique os arquivos reais do projeto.
- Não entregue apenas instruções ou exemplos de código.
- Não crie uma demonstração isolada.
- Não substitua dados reais por mocks.
- Não declare testes aprovados sem executá-los.
- Não declare integrações funcionais sem verificá-las.
- Não ignore erros de TypeScript.
- Não esconda erros com `any`, `@ts-ignore` ou desativação de regras do lint sem justificativa.
- Não faça uma reescrita total quando uma correção localizada resolver o problema.
- Não faça alterações destrutivas no banco.
- Não avance sobre integrações críticas sem validar seus impactos.

Quando não for possível testar uma integração por falta de credenciais ou ambiente, informe exatamente o que ficou pendente.

## 16. CRITÉRIOS DE ACEITAÇÃO

O trabalho estará concluído quando:

- O layout administrativo estiver consistente.
- A identidade visual premium estiver aplicada.
- A navegação funcionar corretamente.
- As páginas existentes estiverem corrigidas.
- Não houver links quebrados conhecidos.
- Os componentes estiverem padronizados.
- A responsividade estiver validada.
- PT-BR e EN-US estiverem funcionando.
- Os dados reais forem apresentados corretamente.
- A autenticação e as permissões estiverem preservadas.
- As políticas RLS continuarem aplicadas.
- Os arquivos privados permanecerem protegidos.
- As integrações existentes não tiverem sido quebradas.
- Os testes críticos estiverem passando.
- Os erros conhecidos estiverem documentados.

## 17. PRIMEIRA AÇÃO

Comece agora inspecionando o projeto existente.

Primeiro, descubra exatamente o que está errado.

Depois, apresente um resumo curto dos problemas encontrados e a ordem de correção.

Em seguida, implemente as correções diretamente no código, começando pelo layout global e pelos problemas de maior impacto.

**Não recrie o painel do zero. Não faça somente uma análise. Corrija o painel existente, preservando tudo o que estiver correto e garantindo que cada alteração seja validada antes de prosseguir.**



Plano de Correção Priorizado
Prioridade 1 - Crítico (Funcionalidade Básica)
Corrigir Dashboard: Substituir dados estáticos por consultas reais ao banco (profiles, subscriptions, payments).
Implementar Header Admin: Criar componente com breadcrumbs, notificações, avatar, seletor de idioma.
Implementar Página de Alunos: Listagem real com dados do banco, busca, filtros, paginação.
Implementar Página Financeiro: Listagem de planos, assinaturas, pagamentos com dados reais.
Prioridade 2 - Alto (Navegação e UX)
Corrigir Sidebar: Adicionar seções e itens faltantes (Exercícios, Alimentos, Notificações, Reuniões, Assinaturas, Pagamentos, Auditoria).
Implementar Responsividade Mobile: Sidebar colapsável/drawer para dispositivos móveis.
Corrigir Layout Global: Validar e ajustar espaçamentos, margens, overflow em todas as páginas.
Prioridade 3 - Médio (Conteúdo e Módulos)

### Treinos e Exercícios
- Refinar módulo de Treinos: corrigir internacionalização (PT-BR/EN-US) de todos os textos, labels, validações e estados vazios.
- Validar criação e edição de treinos: categorias, exercícios, séries, repetições, descanso, imagens e vídeos.
- Implementar ordenação de exercícios dentro do treino (drag-and-drop ou botões de subir/descer).
- Implementar publicação e arquivamento de treinos com estados visuais consistentes.
- Implementar atribuição de treino ao aluno respeitando o limite de seis treinos ativos por aluno.
- Corrigir página de Categorias: listagem, criação, edição e exclusão de categorias de treino com dados reais.
- Corrigir página de Exercícios: listagem, criação, edição e exclusão com campos bilíngues (nome, descrição, instruções).

### Dietas e Alimentos
- Implementar página de Dietas: listagem real com dados do banco, busca, filtros por categoria/aluno e paginação.
- Implementar criação e edição de dietas: refeições, alimentos, quantidades, unidades e valores nutricionais.
- Manter campos bilíngues (PT-BR/EN-US) para nome e descrição dos alimentos e refeições.
- Implementar cálculo automático de valores nutricionais totais (calorias, proteínas, carboidratos, gorduras) por refeição e por dieta.
- Implementar atribuição de dietas aos alunos com validação de limites.
- Corrigir página de Alimentos: listagem, criação, edição e exclusão com valores nutricionais e traduções.

### Suplementos e Kits
- Implementar página de Suplementos: listagem real com dados do banco, busca, filtros e paginação.
- Implementar cadastro de suplementos: nome, descrição, quantidade, unidade, frequência de uso e campos bilíngues.
- Implementar organização dos Kits de Suplementos: agrupar suplementos, definir quantidades e atribuir aos alunos.
- Implementar Kits de Treinos: agrupar múltiplos treinos em um kit reutilizável.
- Implementar Kits de Dietas: agrupar múltiplas dietas em um kit reutilizável.
- Corrigir a exibição e atribuição de kits nas páginas de alunos.

### Exames
- Implementar página de Exames: listagem real com dados do banco, filtros por aluno, período e status.
- Implementar upload de arquivos de exame com validação de tipo e tamanho.
- Implementar limite de cinco arquivos por aluno por mês com feedback visual claro.
- Implementar visualização de exames com URLs assinadas para proteção dos arquivos privados.
- Implementar sistema de comentários nos exames entre admin e aluno.
- Garantir que apenas o aluno dono do exame e administradores tenham acesso.

### E-books
- Implementar página de E-books: listagem real com dados do banco, busca, filtros e paginação.
- Implementar cadastro de e-books: capa (imagem), arquivo PDF, título, descrição e campos bilíngues.
- Implementar publicação e arquivamento de e-books.
- Implementar armazenamento seguro no Supabase Storage com URLs assinadas.
- Implementar permissões de acesso: definir quais alunos ou planos têm acesso a cada e-book.
Prioridade 4 - Baixo (Refinamento)

### Internacionalização Completa
- Mover todos os textos hardcoded restantes para arquivos de tradução (PT-BR e EN-US).
- Padronizar formatação de datas, horários e moedas conforme o idioma ativo.
- Garantir que validações de formulário e mensagens de erro sejam traduzidas.
- Verificar estados vazios, loadings e toasts em todos os módulos.
- Respeitar a implementação existente de persistência da preferência de idioma.

### Mentoria
- Implementar página de Mentoria: listagem de conversas entre admin e alunos.
- Implementar envio de mensagens com atualização em tempo real (Supabase Realtime).
- Implementar indicador de mensagens não lidas por conversa.
- Implementar envio de anexos (imagens e documentos) com validação de tipo e tamanho.
- Implementar busca de alunos para iniciar nova conversa.

### Reuniões
- Implementar página de Reuniões: calendário/listagem de reuniões agendadas.
- Implementar agendamento com seleção de aluno, data, hora e fuso horário (timezone).
- Implementar status da reunião (agendada, confirmada, cancelada, concluída).
- Implementar integração com link de videoconferência (Google Meet, Zoom ou similar) quando houver credenciais; manter arquitetura preparada caso não haja.
- Implementar notificações de lembrete antes da reunião.

### Notificações
- Implementar página de Notificações: listagem de notificações enviadas aos alunos.
- Implementar criação de notificações push/e-mail para alunos individuais ou grupos.
- Implementar tipos de notificação (pagamento, treino, dieta, exame, sistema).
- Implementar status de leitura e histórico de envio.
- Integrar notificações com eventos do sistema (novo pagamento, treino atribuído, exame enviado).

### Redes Sociais
- Implementar página de Redes Sociais: gerenciamento de links e perfis sociais da marca.
- Implementar cadastro de redes (Instagram, WhatsApp, YouTube, TikTok, etc.) com URL e ícone.
- Implementar ativação/desativação de cada rede.
- Implementar ordenação manual de exibição.

### Configurações
- Implementar página de Configurações com seções organizadas:
  - **Geral**: nome da plataforma, logo, cores, idioma padrão.
  - **Pagamentos**: configuração de gateways (Stripe, ASAAS), moeda padrão, tolerância de vencimento.
  - **E-mails**: templates de e-mail, remetente, configuração SMTP.
  - **Armazenamento**: limites de upload, tipos permitidos, políticas de retenção.
  - **Segurança**: políticas de senha, 2FA para administradores, sessões.
- Garantir validação server-side com Zod para todas as configurações.
- Garantir que apenas administradores tenham acesso a esta página.

### Auditoria
- Implementar página de Auditoria: visualização de logs de ações administrativas.
- Registrar eventos: criação, edição e exclusão de alunos, treinos, dietas, suplementos, exames, e-books, planos e configurações.
- Exibir: data/hora, usuário responsável, ação executada, entidade afetada e detalhes.
- Implementar filtros por período, usuário, ação e entidade.
- Garantir que os logs sejam imutáveis (apenas inserção, sem edição/exclusão).
Prioridade 5 - Validação

### Segurança e Permissões
- Testar proteção server-side de todas as rotas administrativas (`/admin/*`).
- Testar Supabase Auth: login, logout, recuperação de senha e expiração de sessão.
- Testar autorização baseada em roles: admin, student e qualquer papel intermediário existente.
- Validar políticas RLS em todas as tabelas (profiles, subscriptions, payments, workouts, diets, supplements, exams, ebooks, audit_logs).
- Verificar validação server-side com Zod em todas as Server Actions e endpoints de API.
- Testar proteção de operações administrativas (criação, edição, exclusão).
- Validar proteção de uploads: tipo de arquivo, tamanho máximo e sanitização de nomes.
- Validar URLs assinadas para arquivos privados (exames, e-books, anexos de mentoria).
- Testar proteção de webhooks (Stripe, ASAAS): validação de assinatura e idempotência.
- Verificar rate limiting em endpoints sensíveis (login, upload, envio de mensagens).
- Confirmar que segredos estão apenas em variáveis de ambiente, nunca expostos ao cliente.
- Validar tabela de auditoria: eventos sendo registrados corretamente e sem possibilidade de edição.

### Casos de Teste de Acesso Indevido
- Aluno tentando acessar `/admin` deve ser redirecionado ou bloqueado.
- Usuário sem permissão tentando executar uma ação administrativa deve receber erro 403.
- Usuário tentando acessar dados de outro aluno deve receber erro 403 ou vazio.
- Tentativa de acessar exames privados de terceiros deve ser negada.
- Tentativa de modificar o próprio papel (role) para obter privilégios deve ser bloqueada.
- Tentativa de acessar e-books sem permissão deve ser negada.
- Tentativa de ultrapassar o limite de 6 treinos ativos por aluno deve ser bloqueada.
- Tentativa de ultrapassar o limite de 5 exames por aluno por mês deve ser bloqueada.
- Todos esses acessos devem ser negados quando não autorizados.

### Qualidade de Código
- Executar `lint` e corrigir todos os erros e warnings.
- Executar `typecheck` e corrigir todos os erros de TypeScript.
- Remover usos de `any`, `@ts-ignore` e desativações de regras do lint sem justificativa.
- Garantir que não existam variáveis de ambiente não utilizadas ou indefinidas.
- Verificar que não há dados estáticos ou mocks em páginas de produção.
- Garantir que não há valores hexadecimais espalhados fora dos tokens de design.

### Testes Automatizados
- Executar a suíte de testes existente sem erros.
- Criar testes para os fluxos críticos afetados:
  - Login e redirecionamento por role.
  - Criação e atribuição de treino com limite de 6 ativos.
  - Upload de exame respeitando limite de 5 por mês.
  - Criação e cálculo nutricional de dietas.
  - Webhooks de pagamento (Stripe/ASAAS) com validação de assinatura.
  - Proteção de rotas administrativas.
- Garantir que todos os testes novos e existentes passam.

### Responsividade
- Validar a interface nas seguintes larguras: 390px, 412px, 430px, 768px, 1024px, 1280px, 1440px.
- Verificar sidebar (drawer no mobile, fixa no desktop).
- Verificar header com breadcrumbs, notificações e avatar.
- Verificar cards: proporções, espaçamentos e overflow.
- Verificar gráficos: redimensionamento correto sem cortes.
- Verificar tabelas: solução responsiva (colunas prioritárias, rolagem controlada ou cards).
- Verificar filtros e formulários: inputs, selects, botões e modais.
- Verificar que não há overflow horizontal em nenhuma página.

### Internacionalização
- Testar todos os textos em PT-BR e EN-US.
- Verificar formatação de datas, horários e moedas nos dois idiomas.
- Verificar menus, botões, formulários, validações, estados vazios, loadings e toasts.
- Confirmar que a preferência de idioma persiste entre sessões.
- Verificar que não há textos hardcoded restantes.

### Integrações e Funcionalidades
- Validar Dashboard: todos os indicadores e gráficos com dados reais.
- Validar Alunos: listagem, busca, filtros, paginação e detalhes.
- Validar Treinos: criação, edição, publicação, arquivamento e atribuição.
- Validar Dietas: criação, edição, cálculo nutricional e atribuição.
- Validar Suplementos e Kits: cadastro, organização e atribuição.
- Validar Exames: upload, visualização com URL assinada e comentários.
- Validar E-books: cadastro, publicação e permissões de acesso.
- Validar Financeiro: planos, assinaturas, pagamentos e webhooks.
- Validar que integrações existentes não foram quebradas.

### Documentação de Pendências
- Listar funcionalidades que não puderam ser testadas por falta de credenciais ou ambiente.
- Documentar integrações pendentes (ex: videoconferência, gateways sem credenciais).
- Listar erros conhecidos e sua severidade.
- Descrever passos necessários para concluir integrações pendentes.