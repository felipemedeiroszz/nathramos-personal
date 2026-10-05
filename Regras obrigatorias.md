# REGRA OBRIGATÓRIA — ÍCONES

A plataforma **NÃO deverá utilizar emojis na interface**.

Não utilizar emojis como:

* Ícones de menu
* Ícones de botões
* Ícones de cards
* Ícones de status
* Ícones de notificações
* Ícones de treino
* Ícones de dieta
* Ícones de hidratação
* Ícones de suplementos
* Ícones de exames
* Ícones de navegação
* Ícones do painel administrativo

Exemplos proibidos:

```text
🏠
🥗
🏋️
📊
💊
💧
🧪
📚
🛒
💬
```

---

# SISTEMA DE ÍCONES

Todos os ícones deverão ser construídos utilizando **CSS/SVG**, sem emojis.

Preferencialmente utilizar:

* SVG
* CSS
* Icon components baseados em SVG

Os ícones devem possuir:

* Traços consistentes
* Tamanho consistente
* Espessura consistente
* Área de clique adequada
* Versão ativa/inativa
* Compatibilidade com tema dark

Pode utilizar uma biblioteca de ícones baseada em SVG, como **Lucide Icons**, caso seja conveniente.

Não utilizar imagens rasterizadas para ícones simples.

---

# BOTTOM NAVIGATION

O menu inferior deverá utilizar ícones vetoriais.

Estrutura:

```text
Dashboard
Dieta
Treino
Desempenho
Mais
```

Visual:

```text
┌──────────────────────────────────────┐
│                                      │
│              CONTEÚDO                │
│                                      │
├──────────────────────────────────────┤
│                                      │
│    ◯        ●        ◯       ◯     ◯ │
│   Home     Dieta    Treino  Desemp. Mais
│                                      │
└──────────────────────────────────────┘
```

O item ativo possuirá:

**CÍRCULO AMARELO**

com o ícone SVG centralizado.

Exemplo conceitual:

```text
             ┌─────────┐
             │    SVG  │
             │   ICON  │
             └─────────┘
               AMARELO
```

O ícone poderá ser preto quando estiver dentro do círculo amarelo para criar alto contraste.

Os itens inativos deverão utilizar ícones SVG em branco/cinza.

---

# ÍCONES SUGERIDOS

Utilizar ícones vetoriais semanticamente adequados.

### Dashboard

Ícone de:

```text
House / Layout Dashboard
```

### Dieta

Ícone relacionado a:

```text
Utensils / Fork Knife
```

### Treino

Ícone relacionado a:

```text
Dumbbell
```

### Desempenho

Ícone relacionado a:

```text
Chart / Trending Up
```

### Mais

Ícone:

```text
More Horizontal
```

### Suplementos

```text
Pill / Capsule
```

### Hidratação

```text
Droplets
```

### Exames

```text
File / Clipboard
```

### E-books

```text
Book Open
```

### Lista de compras

```text
Shopping Cart / List
```

### Mentoria

```text
Message Circle
```

Os ícones devem ser escolhidos de maneira consistente e profissional.

---

# REGRA DE CONSISTÊNCIA

Não misturar estilos diferentes de ícones.

Por exemplo, não utilizar:

```text
SVG outline
+
emoji
+
PNG
+
ícone 3D
```

A interface deverá utilizar um único sistema visual de ícones.

Preferência:

**SVG Outline / Lucide-style**

com espessura consistente.

---

# CORES DOS ÍCONES

### Ativo

```text
Círculo:
Amarelo

Ícone:
Preto
```

### Inativo

```text
Ícone:
Branco / cinza claro
```

### Hover

```text
Ícone:
Amarelo
```

### Disabled

```text
Cinza escuro
```

---

# ADMIN

A mesma regra vale para o painel administrativo.

Não utilizar emojis no painel.

Utilizar apenas ícones SVG.

Exemplo:

```text
Dashboard
Users
Dumbbell
Utensils
Pill
File
Book
Wallet
Message
Settings
```

Tudo utilizando o mesmo sistema de ícones.

---

# REGRA ABSOLUTA

**ZERO EMOJIS NA UI.**

A plataforma deverá parecer um aplicativo fitness premium e profissional.

Todos os elementos gráficos que funcionem como ícones deverão ser feitos com:

**SVG / CSS / componentes vetoriais.**
