# Modelos de kits de nutrição

O pacote `data/catalog/nutrition-kit-templates.mjs` acrescenta dez kits de dieta e dez kits de suplementos. Não altera kits existentes nem vincula alunos.

As dietas incluem cinco refeições com porções ilustrativas, descrição em português/inglês e itens reais do catálogo: brasileira cotidiana, marmitas, peixes, ovolactovegetariana, vegetal, frango e raízes, carnes caseiras, grãos e leguminosas, sabores brasileiros e rotina variada. Não há promessa de emagrecimento, meta calórica ou hidratação individual.

Os suplementos são dez alternativas de ingrediente único: whey isolado, whey hidrolisado, albumina, soja, ervilha, arroz, whey zero lactose, colágeno, dextrose e isomaltulose. Quantidades reproduzem a porção de referência dos produtos já cadastrados; não representam prescrição individual nem combinação para consumo simultâneo. Frequência e horários precisam de revisão antes da atribuição. Cada descrição mantém a fonte do fabricante registrada no produto.

Referências editoriais: [Guia Alimentar do Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/saps/promocao-da-saude/guias-alimentares) e [perguntas sobre suplementos da Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares/perguntas-frequentes). Os modelos são exemplos próprios, não cardápios transcritos desses documentos.

## Execução

Com as variáveis locais do Supabase disponíveis:

```powershell
node --env-file=.env.local scripts/create-nutrition-kits.mjs
node --env-file=.env.local scripts/create-nutrition-kits.mjs --apply
```

Sem `--apply`, apenas verifica os produtos e informa as adições propostas. Exige o catálogo expandido de alimentos/suplementos. Cada kit é criado pela transação existente `admin_save_content_kit`, com itens, revisões e auditoria. A auditoria usa um administrador ativo; é possível indicar `CATALOG_ACTOR_ID` no ambiente. Credenciais não são exibidas.

Reexecuções preservam nomes/slug já existentes, inclusive os personalizados ou excluídos. Não restauram ou sobrescrevem conteúdo. A verificação final exige pelo menos dez kits publicados de cada tipo e dez modelos completos de cada pacote.
