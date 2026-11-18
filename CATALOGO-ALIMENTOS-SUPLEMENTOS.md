# Expansão do catálogo de alimentos e suplementos — 18/11/2026

Foram incluídos no banco configurado no ambiente 40 alimentos e 10 suplementos, totalizando 50 alimentos e 22 suplementos no momento da aplicação. Os registros anteriores foram preservados. Nenhum produto foi vinculado a kits, rotinas ou alunos automaticamente.

Os dados estão em `data/catalog/expanded-nutrition-2026-11.json`. Cada item tem nome em português/inglês, categoria, porção de referência e fonte na descrição.

## Fontes e critérios

- Alimentos genéricos: TACO, 4ª edição, NEPA/UNICAMP (2011). Cada descrição informa o número do alimento e o estado/preparo. As quantidades nutricionais são por 100 g da parte comestível. Valores classificados como Tr (traços) e fibra NA são representados por zero nos campos numéricos; essa convenção fica explícita na descrição.
- Queijo cottage: produto específico Tirolez, tabela oficial por 100 g, consultada em 18/11/2026.
- Suplementos: produtos específicos da Growth, com a porção do produto consultado. Porção é referência de cadastro, não dose personalizada. Não foram preenchidos horários, promessas de benefícios ou contraindicações não verificadas. As descrições incluem o link do produto e a necessidade de conferir seu rótulo real, ingredientes e restrições. A seleção de marcas serve para identificar referências de produto, sem recomendação comercial.

Fontes principais:

- https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf
- https://www.tirolez.com.br/produtos/nutricao-bem-estar/queijo-cottage/
- Páginas oficiais da Growth listadas individualmente no manifesto e nas descrições.

## Reutilizar em outro ambiente

Prévia, sem gravar:

```powershell
node --env-file=.env.local scripts/expand-nutrition-catalog.mjs
```

Para cadastrar os itens faltantes:

```powershell
node --env-file=.env.local scripts/expand-nutrition-catalog.mjs --apply
```

Alternativamente, execute `supabase/seeds/expanded_nutrition_catalog.sql` no SQL Editor do ambiente de destino. O SQL é transacional e não substitui registros existentes. As duas formas usam os mesmos IDs determinísticos e ignoram nomes já cadastrados, normalizando maiúsculas, espaços, pontuação e acentuação. Produtos inativos não são reativados automaticamente. A criação é registrada em auditoria.

Não é necessário executar novamente no ambiente já atualizado. Uma segunda prévia confirmou zero inclusões pendentes e a conferência de todos os campos dos 50 novos registros encontrou zero diferenças.

Validação local: dados compatíveis com os esquemas reais, normalização e deduplicação, SQL repetível e preservação de produtos personalizados/inativos. Chaves de acesso não são incluídas no manifesto, no SQL ou nos relatórios.
