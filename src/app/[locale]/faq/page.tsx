import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { FAQItem } from "@/components/shared/FAQItem";
import { Badge } from "@/components/ui/Badge";
import { getTranslations, setRequestLocale } from "next-intl/server";

const faqsPt = [
  {
    category: "Geral",
    q: "Como funciona o acompanhamento da Nath Ramos?",
    a: "Oferecemos acompanhamento fitness personalizado 100% online. Após o cadastro e assinatura, você preenche uma avaliação completa e Nath Ramos monta seus treinos, dieta e plano de suplementação de acordo com seus objetivos, biotipo e disponibilidade.",
  },
  {
    category: "Geral",
    q: "Quais são os objetivos que a plataforma atende?",
    a: "Atendemos todos os objetivos: hipertrofia (ganho de massa muscular), emagrecimento e perda de gordura, definição muscular, melhora do condicionamento físico, reeducação alimentar, e qualidade de vida para iniciantes e avançados.",
  },
  {
    category: "Planos",
    q: "Qual a diferença entre os planos Essencial, Transformação e Elite?",
    a: "O Essencial inclui treinos e dietas personalizadas + acompanhamento de hidratação, sono e peso. O Transformação adiciona guia de suplementação e e-books exclusivos. O Elite é o mais completo, com mentoria individual 1:1, análise de exames laboratoriais e suporte prioritário.",
  },
  {
    category: "Planos",
    q: "Posso trocar de plano depois de assinar?",
    a: "Sim, você pode fazer upgrade ou downgrade do plano a qualquer momento. O ajuste proporcional é calculado automaticamente e refletido na próxima fatura.",
  },
  {
    category: "Planos",
    q: "Os planos têm fidelidade ou multa de cancelamento?",
    a: "Não. Todos os planos são mensais e sem fidelidade. Você pode cancelar quando quiser, sem multas ou taxas adicionais. O acesso permanece até o fim do período pago.",
  },
  {
    category: "Treinos",
    q: "Os treinos são atualizados com que frequência?",
    a: "Os treinos são revisados e atualizados a cada 4 a 8 semanas, dependendo do seu progresso e adaptação. No plano Elite, Nath ajusta semanalmente conforme feedback e evolução.",
  },
  {
    category: "Treinos",
    q: "Não tenho acesso a academia. Posso treinar em casa?",
    a: "Claro. Na avaliação inicial você informa o tipo de equipamento disponível (nenhum, halteres, banco, barra ou academia completa) e montamos treinos adequados à sua realidade, seja em casa ou academia.",
  },
  {
    category: "Dietas",
    q: "A dieta leva em conta minhas restrições e preferências alimentares?",
    a: "Sim, 100%. Você informa alergias, intolerâncias (lactose, glúten etc.), vegetarianismo/veganismo, aversões e alimentos preferidos. Toda a dieta é montada respeitando suas individualidades.",
  },
  {
    category: "Dietas",
    q: "Como funciona a lista de compras?",
    a: "A partir do plano alimentar, a plataforma gera automaticamente uma lista de compras organizada por categorias de supermercado. Você pode marcar itens como comprados e ajustar quantidades conforme necessidade.",
  },
  {
    category: "Mentoria",
    q: "Como funciona a mentoria individual do plano Elite?",
    a: "No plano Elite você tem encontros semanais ou quinzenais (via videochamada) com Nath Ramos para alinhar estratégia, tirar dúvidas, analisar evolução física, ajustar treinos/dieta e manter motivação. Além de suporte prioritário via WhatsApp.",
  },
  {
    category: "Pagamentos",
    q: "Quais formas de pagamento são aceitas?",
    a: "Aceitamos cartões de crédito das principais bandeiras (Visa, Mastercard, Elo, Amex, Hipercard), Pix e boleto bancário. Assinaturas recorrentes funcionam com cartão ou Pix automático.",
  },
  {
    category: "Pagamentos",
    q: "A assinatura renova automaticamente?",
    a: "Sim, a assinatura é recorrente e renova todo mês no mesmo dia da contratação. Você pode desativar a renovação automática na sua área de conta a qualquer momento.",
  },
  {
    category: "Técnico",
    q: "A plataforma funciona em celular e tablet?",
    a: "Sim, o site é 100% responsivo e funciona perfeitamente em smartphones, tablets e computadores. Recomendamos adicionar à tela inicial para uma experiência de app nativo (PWA).",
  },
  {
    category: "Técnico",
    q: "Meus dados pessoais e médicos estão seguros?",
    a: "Totalmente. Usamos criptografia de ponta a ponta, servidores seguros da Supabase e seguimos rigorosamente a LGPD (Lei Geral de Proteção de Dados). Seus dados nunca são compartilhados com terceiros sem sua autorização.",
  },
];

const faqsEn = [
  {
    category: "General",
    q: "How does Nath Ramos coaching work?",
    a: "We offer 100% online personalized fitness coaching. After signing up, you complete a comprehensive assessment and Nath Ramos designs your workouts, diet and supplementation plan based on your goals, body type and availability.",
  },
  {
    category: "General",
    q: "Which goals does the platform support?",
    a: "We support all goals: hypertrophy (muscle gain), fat loss, muscle definition, improved fitness, nutritional education, and quality of life for beginners and advanced athletes alike.",
  },
  {
    category: "Plans",
    q: "What is the difference between Essential, Transformation and Elite plans?",
    a: "Essential includes personalized workouts & diets plus hydration, sleep and weight tracking. Transformation adds a supplementation guide and exclusive e-books. Elite is the most complete, with 1:1 individual mentoring, lab exam analysis and priority support.",
  },
  {
    category: "Plans",
    q: "Can I switch plans after subscribing?",
    a: "Yes, you can upgrade or downgrade your plan at any time. The prorated adjustment is calculated automatically and reflected on your next invoice.",
  },
  {
    category: "Plans",
    q: "Do plans have lock-in periods or cancellation fees?",
    a: "No. All plans are monthly with no lock-in. You can cancel anytime without penalties or additional fees. Access remains active until the end of the paid period.",
  },
  {
    category: "Workouts",
    q: "How often are workouts updated?",
    a: "Workouts are reviewed and updated every 4 to 8 weeks, depending on your progress and adaptation. On the Elite plan, Nath adjusts them weekly based on your feedback and evolution.",
  },
  {
    category: "Workouts",
    q: "I don't have a gym membership. Can I train at home?",
    a: "Absolutely. In the initial assessment you inform the equipment you have available (none, dumbbells, bench, barbell or full gym) and we build workouts suited to your reality, whether home or gym-based.",
  },
  {
    category: "Diets",
    q: "Does the diet consider my restrictions and food preferences?",
    a: "Yes, 100%. You inform allergies, intolerances (lactose, gluten, etc.), vegetarian/vegan diets, food aversions and favorite foods. The entire meal plan is built respecting your individuality.",
  },
  {
    category: "Diets",
    q: "How does the shopping list feature work?",
    a: "From your meal plan, the platform automatically generates a shopping list organized by supermarket categories. You can mark items as purchased and adjust quantities as needed.",
  },
  {
    category: "Mentoring",
    q: "How does the Elite plan individual mentoring work?",
    a: "On the Elite plan you have weekly or bi-weekly video calls with Nath Ramos to align strategy, answer questions, analyze physical evolution, adjust workouts/diet and stay motivated. Plus priority WhatsApp support.",
  },
  {
    category: "Payments",
    q: "Which payment methods are accepted?",
    a: "We accept major credit cards (Visa, Mastercard, Elo, Amex, Hipercard), Pix (Brazil) and bank slips. Recurring subscriptions work with card or automatic Pix.",
  },
  {
    category: "Payments",
    q: "Does the subscription renew automatically?",
    a: "Yes, the subscription is recurring and renews every month on the same day as purchase. You can disable auto-renewal in your account area at any time.",
  },
  {
    category: "Technical",
    q: "Does the platform work on mobile and tablet?",
    a: "Yes, the website is 100% responsive and works perfectly on smartphones, tablets and computers. We recommend adding to the home screen for a native app-like experience (PWA).",
  },
  {
    category: "Technical",
    q: "Are my personal and medical data secure?",
    a: "Absolutely. We use end-to-end encryption, secure Supabase servers and strictly follow GDPR/CCPA data protection laws. Your data is never shared with third parties without your explicit consent.",
  },
];

export default async function FAQPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const navT = await getTranslations("nav");
  const faqs = locale === "pt-BR" ? faqsPt : faqsEn;

  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <PublicHeader locale={locale} />
      <main className="flex-1 w-full">
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
              {navT("faq")}
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              {t("faqSubtitle")}
            </p>
          </div>

          {categories.map((category, catIdx) => (
            <div key={category} className={catIdx > 0 ? "mt-12" : ""}>
              <div className="flex items-center gap-3 mb-6">
                <Badge variant="outline">{category}</Badge>
              </div>
              <div className="space-y-3">
                {faqs
                  .filter((f) => f.category === category)
                  .map((faq, idx) => (
                    <FAQItem
                      key={`${category}-${idx}`}
                      question={faq.q}
                      answer={faq.a}
                      defaultOpen={idx === 0 && catIdx === 0}
                    />
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
