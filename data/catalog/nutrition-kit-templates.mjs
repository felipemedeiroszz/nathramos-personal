// Reusable examples, not assignments or individual nutrition prescriptions.
const meal = (type, ...foods) => ({ type, foods });
const breakfast = (...foods) => meal("breakfast", ...foods);
const morning = (...foods) => meal("morning_snack", ...foods);
const lunch = (...foods) => meal("lunch", ...foods);
const afternoon = (...foods) => meal("afternoon_snack", ...foods);
const dinner = (...foods) => meal("dinner", ...foods);
const oats = ["Aveia em Flocos", 40];
const yogurt = ["Iogurte Natural Integral", 170];
const banana = ["Banana Prata", 100];
const apple = ["Maçã Fuji com Casca", 150];
const chicken = ["Peito de Frango Grelhado", 150];
const rice = ["Arroz Integral Cozido", 150];
const beans = ["Feijão Carioca Cozido", 100];
const broccoli = ["Brócolis Cozido", 150];
const oil = ["Azeite de Oliva Extra Virgem", 5];
const fish = ["Filé de Merluza Assado", 150];
const potato = ["Batata Inglesa Cozida", 200];
const tofu = ["Tofu", 180];
const lentils = ["Lentilha Cozida", 150];
const egg = ["Ovo de Galinha Cozido", 100];
const papaya = ["Mamão Papaia Cru", 150];
const zucchini = ["Abobrinha Italiana Cozida", 150];
const cottage = ["Queijo Cottage Tirolez", 100];
const walnuts = ["Nozes Cruas", 15];
const carrots = ["Cenoura Cozida", 100];

export const dietTemplates = [
  {
    slug: "modelo-dieta-brasileira-cotidiana",
    pt: "Brasileira do dia a dia",
    en: "Everyday Brazilian meals",
    meals: [
      breakfast(egg, oats, banana),
      morning(yogurt, apple),
      lunch(chicken, rice, beans, broccoli, oil),
      afternoon(cottage, papaya),
      dinner(fish, potato, zucchini, oil),
    ],
  },
  {
    slug: "modelo-dieta-marmitas-praticas",
    pt: "Marmitas práticas",
    en: "Practical packed meals",
    meals: [
      breakfast(yogurt, oats, papaya),
      morning(apple, walnuts),
      lunch(chicken, ["Arroz Branco Cozido", 150], beans, carrots, oil),
      afternoon(cottage, banana),
      dinner(
        ["Músculo Bovino sem Gordura Cozido", 150],
        ["Mandioca Cozida", 150],
        zucchini,
        oil,
      ),
    ],
  },
  {
    slug: "modelo-dieta-peixes-legumes",
    pt: "Peixes e legumes",
    en: "Fish and vegetables",
    meals: [
      breakfast(egg, oats, ["Morango Cru", 150]),
      morning(yogurt, apple),
      lunch(fish, rice, ["Feijão Preto Cozido", 100], broccoli, oil),
      afternoon(cottage, banana),
      dinner(fish, ["Batata Baroa Cozida", 180], carrots, zucchini, oil),
    ],
  },
  {
    slug: "modelo-dieta-ovo-lacto-vegetariana",
    pt: "Ovolactovegetariana",
    en: "Lacto-ovo vegetarian meals",
    meals: [
      breakfast(egg, oats, papaya),
      morning(yogurt, walnuts),
      lunch(lentils, rice, tofu, broccoli, oil),
      afternoon(cottage, apple),
      dinner(egg, potato, ["Feijão Fradinho Cozido", 150], zucchini, oil),
    ],
  },
  {
    slug: "modelo-dieta-vegetal-variada",
    pt: "Vegetal variada",
    en: "Varied plant-based meals",
    meals: [
      breakfast(oats, banana, ["Amendoim em Grão Cru", 20]),
      morning(apple, walnuts),
      lunch(tofu, rice, lentils, broccoli, oil),
      afternoon(["Manga Palmer Crua", 150], ["Linhaça em Semente", 10]),
      dinner(tofu, potato, ["Feijão Preto Cozido", 150], carrots, oil),
    ],
  },
  {
    slug: "modelo-dieta-frango-raizes",
    pt: "Frango e raízes",
    en: "Chicken and root vegetables",
    meals: [
      breakfast(egg, oats, banana),
      morning(yogurt, ["Pera Williams Crua", 150]),
      lunch(chicken, ["Batata-doce Cozida", 180], beans, broccoli, oil),
      afternoon(cottage, ["Morango Cru", 150]),
      dinner(chicken, ["Mandioca Cozida", 150], zucchini, carrots, oil),
    ],
  },
  {
    slug: "modelo-dieta-carnes-caseiras",
    pt: "Carnes e refeições caseiras",
    en: "Home-style meat dishes",
    meals: [
      breakfast(yogurt, oats, apple),
      morning(cottage, banana),
      lunch(["Maminha Bovina Grelhada", 150], rice, beans, broccoli, oil),
      afternoon(egg, papaya),
      dinner(["Músculo Bovino sem Gordura Cozido", 150], potato, zucchini, oil),
    ],
  },
  {
    slug: "modelo-dieta-graos-leguminosas",
    pt: "Grãos e leguminosas",
    en: "Grains and pulses",
    meals: [
      breakfast(yogurt, oats, banana),
      morning(apple, walnuts),
      lunch(chicken, rice, lentils, broccoli, oil),
      afternoon(cottage, ["Tangerina Poncã Crua", 150]),
      dinner(
        egg,
        ["Arroz Branco Cozido", 120],
        ["Feijão Fradinho Cozido", 150],
        zucchini,
        oil,
      ),
    ],
  },
  {
    slug: "modelo-dieta-sabores-brasileiros",
    pt: "Sabores brasileiros",
    en: "Brazilian flavours",
    meals: [
      breakfast(egg, ["Mandioca Cozida", 100], papaya),
      morning(yogurt, banana),
      lunch(
        chicken,
        ["Arroz Branco Cozido", 150],
        beans,
        ["Abóbora Cabotiá Cozida", 150],
        oil,
      ),
      afternoon(cottage, ["Manga Palmer Crua", 150]),
      dinner(fish, ["Batata Baroa Cozida", 180], broccoli, oil),
    ],
  },
  {
    slug: "modelo-dieta-rotina-variada",
    pt: "Rotina variada",
    en: "Varied daily meals",
    meals: [
      breakfast(yogurt, oats, ["Morango Cru", 150]),
      morning(egg, apple),
      lunch(fish, rice, lentils, carrots, oil),
      afternoon(cottage, papaya, walnuts),
      dinner(chicken, potato, ["Couve-flor Cozida", 150], oil),
    ],
  },
];

// Separate ingredient alternatives, never a recommendation to combine ten kits.
export const supplementTemplates = [
  [
    "whey-isolado",
    "Proteína de soro isolada",
    "Whey isolate",
    "Whey Protein Isolado - Natural",
  ],
  [
    "whey-hidrolisado",
    "Proteína de soro hidrolisada",
    "Hydrolysed whey",
    "Whey Protein Hidrolisado - Natural",
  ],
  [
    "albumina",
    "Proteína de clara de ovo",
    "Egg white protein",
    "Albumina - Natural",
  ],
  [
    "proteina-soja",
    "Proteína de soja",
    "Soy protein",
    "Proteína Isolada de Soja - Natural",
  ],
  [
    "proteina-ervilha",
    "Proteína de ervilha",
    "Pea protein",
    "Proteína de Ervilha - Natural",
  ],
  [
    "proteina-arroz",
    "Proteína de arroz",
    "Rice protein",
    "Proteína de Arroz - Chocolate",
  ],
  [
    "whey-zero-lactose",
    "Whey zero lactose",
    "Lactose-free whey",
    "Daily Whey Zero Lactose - Leite em Pó",
  ],
  [
    "colageno",
    "Colágeno hidrolisado",
    "Hydrolysed collagen",
    "Colágeno Hidrolisado - Natural",
  ],
  [
    "dextrose",
    "Carboidrato dextrose",
    "Dextrose carbohydrate",
    "Dextrose - Natural",
  ],
  [
    "isomaltulose",
    "Carboidrato isomaltulose",
    "Isomaltulose carbohydrate",
    "Isomaltulose Long Energy - Natural",
  ],
].map(([slug, pt, en, product]) => ({
  slug: `modelo-suplemento-${slug}`,
  pt,
  en,
  product,
}));
