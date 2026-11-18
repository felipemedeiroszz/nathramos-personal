# Kits de dieta por refeições

Em **Admin → Kits → Dietas**, crie ou edite um kit e use **Plano alimentar por refeições**. É possível escrever ou colar o plano, incluindo quantidades em gramas, alternativas de alimentos e orientações adicionais. Os títulos Café da manhã, Lanche, Almoço, Lanche perto do treino e Jantar organizam o texto em cartões na visão do aluno. Orientações e Hidratação ficam em blocos separados.

**Usar exemplo de refeições** preenche um modelo editável baseado no texto solicitado, nas duas línguas. O modelo não é salvo ou atribuído automaticamente a nenhum aluno. Se já houver texto, a substituição exige confirmação e mantém os alimentos estruturados existentes. O nome pessoal do exemplo foi omitido para o kit ser reutilizável.

A **Prévia do aluno** mostra a organização antes de salvar. Depois, salve o kit e vincule-o ao aluno pelo fluxo existente. As datas e a programação da atribuição continuam sendo respeitadas. Orientações individuais da atribuição e da programação são preservadas. A rotina materializa as orientações do dia, mantendo o texto histórico mesmo após alterações futuras do kit.

O kit pode ser salvo somente com texto. Nesse caso, o aluno consulta as refeições sem totais nutricionais inventados e o resumo apresenta a quantidade de refeições do plano em vez de 0/0 alimentos. Para registrar consumo, gerar a lista de compras estruturada e calcular nutrientes, use também os alimentos do catálogo. O texto não é convertido automaticamente em produtos ou registros de consumo.

Quantidades, alternativas e recomendações do modelo são conteúdo editável do plano. O bloco de hidratação é apenas uma orientação exibida; não altera automaticamente a meta de água, a frequência de lembretes ou as preferências do aluno. A ceia opcional permanece como orientação, sem virar uma refeição obrigatória ou somar nutrientes automaticamente.

Não é necessária migração SQL: o plano utiliza os campos de descrição já existentes do kit. Nenhuma conta ou prescrição real foi alterada pelos testes.

Validação: parser, conteúdo e condições do exemplo, tratamento de texto como conteúdo e não HTML, persistência no esquema existente, rotina com vínculo vigente, histórico, idiomas e preservação após erro. A interface foi verificada em português/inglês e celular/desktop.
