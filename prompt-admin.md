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
Implementar Página de Dietas: Listagem real com dados do banco.
Implementar Página de Suplementos: Listagem real com dados do banco.
Implementar Página de Exames: Listagem real com dados do banco.
Implementar Página de E-books: Listagem real com dados do banco.
Refinar Módulo de Treinos: Corrigir internacionalização e validar UX.
Prioridade 4 - Baixo (Refinamento)
Corrigir Internacionalização Completa: Mover todos os textos hardcoded para i18n.
Implementar Módulos de Relacionamento: Mentoria, Reuniões, Notificações, Redes Sociais.
Implementar Página de Configurações: Configurações administrativas reais.
Implementar Página de Auditoria: Visualização de logs de auditoria.
Prioridade 5 - Validação
Validar Segurança: Testar permissões, RLS, proteção de arquivos.
Executar Testes: Lint, typecheck, validação de funcionalidades.
Testar Responsividade: Validar em todas as resoluções especificadas.