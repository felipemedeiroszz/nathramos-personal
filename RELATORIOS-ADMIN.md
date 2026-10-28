# Análises e relatórios do administrador

Implementado em 28/10/2026. A área fica em `/{locale}/admin/relatorios`, no menu **Análises e relatórios**. O painel usa o banco da aplicação; não há métricas de demonstração no código de produção.

## Conteúdo

- Indicadores de alunos, novos cadastros, treinos concluídos, participação e conclusão de sessões.
- Comparação com o período anterior de igual quantidade de dias.
- Evolução por dia, semana ou mês, com tabela acessível dos dados dos gráficos.
- Cobertura atual de treino/dieta, exames aguardando parecer, conversas sem resposta e reuniões próximas.
- Financeiro para administrador: receita bruta paga, ticket médio, MRR estimado, falhas, pendências, estornos, situação das assinaturas, métodos e planos com maior receita.
- Acompanhamento dos alunos com paginação e links para o cadastro.

## Filtros e definições

Datas seguem `America/Sao_Paulo`. Semanas começam na segunda-feira; o primeiro/último agrupamento pode ser parcial. São permitidos até 731 dias; agrupamento diário até 93 dias. Atalhos de 7, 30, 90 e 365 dias usam a data final selecionada.

Coach e busca por nome definem a carteira analisada. Moeda, plano e provedor filtram somente o financeiro. BRL e USD nunca são somados ou convertidos implicitamente.

Cobertura, carteira, pendências e assinaturas são fotografias do estado atual. Treinos concluídos e receita usam o período selecionado. A base histórica considera alunos atualmente não removidos e sua responsabilidade atual; não reconstrói carteiras antigas.

Conclusão de sessões usa sessões iniciadas e concluídas no período divididas pelas sessões iniciadas no período. Treinos iniciados antes e concluídos durante o período entram no total concluído, mas não no numerador dessa taxa. Ausência de denominador não vira 0%.

Receita bruta soma registros locais `paid` pela data de aprovação. Não é lucro, saldo bancário ou receita líquida; taxas e estornos não são descontados automaticamente. Contador de estornos conta registros, não reconstrói valores parciais ausentes no banco. MRR é uma estimativa de 30 dias baseada nas assinaturas atuais elegíveis, excluindo cancelamentos agendados.

## Permissões

Administrador pode analisar a plataforma ou filtrar uma carteira. Coach recebe apenas alunos cujo responsável atual na mentoria seja ele, sem financeiro, opções de planos ou valores financeiros nos gráficos/arquivos.

A página e a API verificam a sessão. A RPC `admin_analytics_report` exige ator válido e é executável somente pela service role. O coach não consegue forjar filtros de outro profissional ou de planos/provedores. Não são enviados e-mails, documentos, informações de cartão ou resultados clínicos no relatório.

## Exportação e impressão

- **PDF:** relatório executivo paginado, com fonte incorporada, indicadores, gráficos, resumos financeiros quando permitidos e até 25 alunos. O limite e o total são identificados no documento.
- **Excel:** `.xlsx` real com resumo, evolução, detalhamento dos alunos e definições. Administrador também recebe abas financeiras. Valores e datas permanecem tipados; totais possuem fórmulas com resultados salvos. Gráficos são imagens incorporadas do snapshot. Datas da aba de alunos usam UTC, identificado no cabeçalho/definições.
- **Limite do Excel:** até 5.000 alunos. Se houver mais, o servidor retorna orientação para restringir coach/nome, sem gerar arquivo silenciosamente truncado.
- **Impressão:** versão clara, sem navegação, botões ou filtros de edição; preserva período, filtros aplicados, gráficos e a página corrente de detalhes.

API: `GET /api/admin/analytics/export?format=pdf|xlsx&from=AAAA-MM-DD&to=AAAA-MM-DD&grain=day|week|month&currency=BRL|USD&locale=pt-BR|en-US`. Parâmetros opcionais: `coach`, `plan`, `provider`, `q`. A exportação usa página 1 dos detalhes e consulta os dados novamente; o horário de geração registra essa nova leitura.

Downloads não usam cache compartilhado, não criam arquivos públicos e são auditados. O servidor gera o conteúdo em memória e revalida permissões em cada requisição. Textos de alunos no Excel são gravados como strings, não fórmulas.

## Implantação

1. Aplicar a sequência anterior de migrações até `000039`, se ainda pendente.
2. Aplicar `supabase/migrations/000040_admin_analytics_reports.sql`.
3. Instalar dependências atualizadas com `npm ci` e publicar código/schema juntos.
4. Preservar a fonte `public/report-fonts/Inter.ttf` e sua licença OFL. A configuração do Next inclui fonte e dados AFM do PDFKit no rastreamento da rota de exportação.
5. Homologar com contas reais de administrador/coach e carteiras diferentes.

A geração usa ExcelJS, PDFKit e Sharp no servidor Node.js. A interface usa Recharts já presente no projeto. Não foi aplicada migração nem publicada alteração no Supabase real nesta cópia, pois não há credenciais configuradas.

## Validação local

- 65 testes no conjunto completo, incluindo 8 testes novos de consultas, limites de datas, comparação de períodos, moeda, carteira, RPC, serviço, endpoint e arquivos reais.
- Migrações aplicadas integralmente em PostgreSQL local (PGlite).
- Excel reaberto para verificar tipos, fórmulas, imagens e ausência de abas financeiras no arquivo do coach; abas renderizadas para inspeção, sem erros de fórmula encontrados.
- PDF renderizado e inspecionado para corrigir alinhamento, quebras e recortes.
- Chrome: interface hidratada com gráficos em PT/EN, admin/coach, 390 e 1280 px; oito cenários sem transbordamento de documento. Downloads PDF/Excel, filtros e impressão exercitados com fixtures.
- Os testes de navegador usam fixtures e não substituem homologação autenticada no ambiente implantado.

Logs: `analytics-all-tests.log`, `analytics-typecheck.log`, `analytics-lint.log`, `analytics-build.log`, `analytics-ui.log`. Evidências locais ignoradas pelo Git em `artifacts/analytics-ui/`.
