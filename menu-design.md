# IDENTIDADE VISUAL E UI/UX

A plataforma deverá possuir uma identidade visual **premium, moderna, esportiva e tecnológica**, inspirada em aplicativos fitness profissionais.

## PALETA PRINCIPAL

A identidade visual inteira deverá utilizar:

* **Preto** como cor predominante
* **Amarelo** como cor de destaque
* **Branco** para textos principais
* Tons de cinza escuro para cards, divisores e elementos secundários

### Conceito visual

```text
FUNDO
Preto / quase preto

CARDS
Cinza muito escuro

DESTAQUES
Amarelo

TEXTOS PRINCIPAIS
Branco

TEXTOS SECUNDÁRIOS
Cinza claro
```

Evitar utilizar muitas cores diferentes.

O amarelo deve ser utilizado estrategicamente para:

* Botões principais
* Status ativo
* Indicadores
* Progresso
* Elementos selecionados
* CTAs
* Ícones importantes
* Destaques
* Gráficos quando apropriado

---

# MENU MOBILE INFERIOR

O menu principal da área do aluno deverá ser um:

**Dark Mobile Bottom Navigation with Yellow Circular Active Tab**

O menu ficará fixado na parte inferior da tela.

Visual aproximado:

```text
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           CONTEÚDO                  │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🏠       🥗       🏋️       📊      ⋯ │
│ Home     Dieta    Treino   Desemp.  │
└─────────────────────────────────────┘
```

Porém, o item selecionado deverá possuir um **círculo amarelo destacado**.

Exemplo conceitual:

```text
┌─────────────────────────────────────┐
│                                     │
│                                     │
│              CONTEÚDO              │
│                                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│    🏠      🥗     🏋️     📊      ⋯ │
│          ╭────╮                     │
│          │ 🥗 │                     │
│          ╰────╯                     │
│         AMARELO                      │
└─────────────────────────────────────┘
```

O círculo amarelo deverá ficar **visualmente integrado ao menu**, podendo ultrapassar levemente a área superior da barra inferior para criar efeito de destaque.

## COMPORTAMENTO

Quando o usuário selecionar:

### Dashboard

```text
🏠
```

O círculo amarelo ficará atrás do ícone do Dashboard.

### Dieta

```text
🥗
```

O círculo amarelo se moverá para Dieta.

### Treino

```text
🏋️
```

O círculo amarelo se moverá para Treino.

### Desempenho

```text
📊
```

O círculo amarelo se moverá para Desempenho.

### Mais

```text
⋯
```

O círculo amarelo ficará sobre Mais.

A transição deverá ser suave.

Utilizar animações discretas, sem exageros.

---

# ESTRUTURA DO MENU

No mobile:

```text
Dashboard
Dieta
Treino
Meu Desempenho
Mais
```

No desktop, o menu inferior deverá ser substituído por uma **sidebar lateral**, mantendo a mesma identidade visual.

---

# MENU "MAIS"

Ao clicar em Mais, abrir uma tela ou drawer contendo:

```text
💊 Suplementos
💧 Hidratação
🧪 Exames
📚 E-books
🛒 Lista de compras
💬 Mentoria
```

O drawer também deverá seguir a identidade:

```text
Preto
Cinza escuro
Amarelo
Branco
```

---

# BOTÕES

Botão principal:

```text
background: amarelo
text: preto
```

Exemplo:

```text
┌───────────────────────────┐
│      COMEÇAR TREINO       │
└───────────────────────────┘
```

Botão secundário:

```text
background: transparente
border: cinza/amarelo
text: branco
```

Botões destrutivos:

Utilizar vermelho apenas quando realmente necessário, por exemplo:

* Excluir
* Cancelar
* Remover

Não utilizar vermelho como parte da identidade visual principal.

---

# CARDS

Os cards deverão utilizar:

```text
background: dark gray
border: subtle
border-radius: moderno
```

Exemplo:

```text
┌─────────────────────────────┐
│ TREINO DE HOJE               │
│                             │
│ Peito + Tríceps             │
│ 5 exercícios                │
│                             │
│ ███████████░░ 75%           │
│                             │
│ [ COMEÇAR TREINO ]          │
└─────────────────────────────┘
```

---

# PROGRESSO

Barras de progresso utilizarão amarelo como destaque.

Exemplo:

```text
Hidratação

2.400 / 3.200 ml

████████████░░░░
```

O progresso concluído deverá ser amarelo.

---

# GRÁFICOS

Os gráficos devem respeitar a identidade visual.

Priorizar:

* fundo escuro
* linhas amarelas para dados principais
* textos brancos
* grades discretas
* tooltips escuros
* destaques amarelos

Não utilizar uma paleta multicolorida desnecessária.

---

# TIPOGRAFIA

Utilizar uma fonte moderna e altamente legível.

Sugestões:

* Inter
* Geist
* Manrope

Preferência:

**Inter ou Geist**

Utilizar pesos diferentes para criar hierarquia:

```text
Título → Bold
Subtítulo → Semibold
Texto → Regular
Informação secundária → Regular
```

---

# ESTILO GERAL

O resultado deve transmitir:

**Fitness + Premium + Tecnologia + Performance**

Evitar aparência:

* infantil
* excessivamente colorida
* genérica
* de template administrativo
* cheia de gradientes
* cheia de sombras

Priorizar:

* espaço
* contraste
* hierarquia
* cards limpos
* ícones simples
* animações suaves
* visual premium

---

# DARK MODE

A plataforma será **dark-first**.

Não criar Light Mode inicialmente.

Toda a aplicação deverá utilizar o tema escuro como padrão:

```text
Background
#000 / quase preto

Surface
cinza muito escuro

Primary
amarelo

Text
branco

Secondary text
cinza claro
```

Os valores exatos das cores deverão ser centralizados em tokens CSS/Tailwind, permitindo alteração futura sem precisar procurar cores espalhadas pelo projeto.

---

# RESPONSIVIDADE

Mobile é prioridade.

A interface deverá ser pensada primeiro para:

```text
390px
412px
430px
```

e depois adaptada para:

```text
Tablet
Desktop
```

O bottom navigation deve permanecer acessível no mobile e respeitar:

* Safe Area do iPhone
* `env(safe-area-inset-bottom)`
* navegação por gestos
* telas pequenas

Adicionar padding inferior ao conteúdo para que o menu nunca cubra informações.

---

# ANIMAÇÕES

Utilizar animações pequenas e elegantes:

* mudança do item ativo
* movimento do círculo amarelo
* abertura do menu Mais
* entrada de cards
* progresso
* feedback de conclusão do treino

As animações não devem prejudicar performance.

Respeitar também:

```text
prefers-reduced-motion
```

---

# REGRA VISUAL PRINCIPAL

Toda nova tela ou componente criado posteriormente deverá seguir obrigatoriamente:

**PRETO + AMARELO + BRANCO**

e manter o mesmo sistema de design.

Não criar componentes com identidade visual diferente da plataforma.
