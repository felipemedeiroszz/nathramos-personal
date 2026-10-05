import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getTranslations, setRequestLocale } from "next-intl/server";

const contentPt = [
  {
    id: 1,
    title: "1. Aceite dos Termos",
    paragraphs: [
      "Ao acessar ou utilizar a plataforma Nath Ramos Personal Trainer, doravante denominada Plataforma, você declara ter lido, compreendido e concordado integralmente com os presentes Termos de Uso, bem como com a Política de Privacidade e todas as demais políticas complementares aplicáveis.",
      "Estes Termos regem a relação jurídica entre Nath Ramos (a seguir Prestadora de Serviços) e você (a seguir Usuário). Caso não concorde com qualquer disposição, você não deve utilizar a Plataforma.",
      "A utilização da Plataforma exige que você tenha capacidade jurídica plena (maior de 18 anos ou emancipado). Menores de idade poderão utilizar a Plataforma apenas mediante consentimento expresso e acompanhamento dos pais ou responsáveis legais.",
    ],
  },
  {
    id: 2,
    title: "2. Descrição dos Serviços",
    paragraphs: [
      "A Prestadora oferece serviços de acompanhamento fitness personalizado online, incluindo, sem se limitar a: planos de treino personalizados, planos alimentares e dietas personalizadas, acompanhamento de hidratação, registro de sono, acompanhamento de peso e evolução corporal, guias de suplementação, e-books educacionais, análise de exames laboratoriais (conforme plano contratado) e mentoria individual (conforme plano contratado).",
      "Os serviços são prestados de forma remota via Plataforma web e/ou aplicativo. A Prestadora não garante resultados específicos, pois a evolução depende de múltiplos fatores incluindo, sem limitação, adesão estrita ao plano, genética, sono, estresse, patologias pré-existentes e hábitos de vida do Usuário.",
      "Todo o conteúdo educacional disponibilizado tem caráter meramente informativo e educativo, não substituindo consulta com profissionais de saúde habilitados (médico, nutricionista, educador físico) para diagnósticos, prescrições ou tratamentos específicos.",
    ],
  },
  {
    id: 3,
    title: "3. Pagamentos, Planos e Assinaturas",
    paragraphs: [
      "Os serviços da Plataforma são oferecidos mediante assinatura paga dos planos Essencial, Transformação ou Elite, cujos valores são apresentados no momento da contratação e podem ser atualizados a qualquer momento, com aviso prévio de 30 dias para assinaturas ativas.",
      "Formas de pagamento aceitas: cartões de crédito (Visa, Mastercard, Elo, Amex, Hipercard), Pix e boleto bancário. Assinaturas recorrentes serão debitadas automaticamente na data de vencimento.",
      "A assinatura tem duração mensal e renovação automática, salvo cancelamento prévio por qualquer das partes. O Usuário é responsável por conferir regularmente sua fatura e dados de pagamento.",
      "Reembolsos: conforme previsto no Código de Defesa do Consumidor, o Usuário poderá exercer o direito de arrependimento em até 7 (sete) dias corridos contados da data da contratação, desde que não tenha utilizado efetivamente os serviços personalizados prestados. Fora desse prazo, não haverá devolução de valores pagos, exceto em casos de cancelamento unilateral por parte da Prestadora.",
    ],
  },
  {
    id: 4,
    title: "4. Cancelamento e Suspensão",
    paragraphs: [
      "O Usuário poderá solicitar o cancelamento da assinatura a qualquer momento, diretamente na área Minha Conta da Plataforma. O cancelamento não requer justificativa e não implica multa ou encargos adicionais.",
      "Após o cancelamento, o acesso aos serviços permanecerá ativo até o final do período já pago, sem devolução proporcional dos valores já pagos.",
      "A Prestadora reserva-se o direito de suspender ou cancelar, unilateralmente e sem aviso prévio, a conta do Usuário que: (I) violar qualquer disposição destes Termos; (II) utilizar a Plataforma para fins ilícitos ou contrários à ética e aos bons costumes; (III) fornecer informações falsas ou imprecisas; (IV) compartilhar sua conta com terceiros; (V) praticar qualquer ato que possa comprometer a segurança, integridade ou funcionamento da Plataforma.",
      "Em caso de pagamento recusado ou inadimplência, o acesso aos serviços poderá ser temporariamente suspenso até a regularização do pagamento.",
    ],
  },
  {
    id: 5,
    title: "5. Privacidade e Proteção de Dados",
    paragraphs: [
      "A Prestadora trata os dados pessoais do Usuário em conformidade com a legislação brasileira aplicável, em especial a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e com sua Política de Privacidade, disponível em seção própria da Plataforma.",
      "São coletados apenas os dados estritamente necessários à prestação dos serviços contratados, incluindo dados de identificação, contato, antropométricos e de saúde relevantes para personalização de treinos e dietas. Mais detalhes sobre a coleta, tratamento e armazenamento constam na Política de Privacidade.",
      "O Usuário garante a veracidade e exatidão dos dados informados e compromete-se a mantê-los atualizados. A Prestadora não se responsabiliza por consequências decorrentes de informações imprecisas ou desatualizadas.",
    ],
  },
  {
    id: 6,
    title: "6. Responsabilidade e Isenções",
    paragraphs: [
      "A Plataforma é disponibilizada no estado em que se encontra. A Prestadora envida seus melhores esforços para manter a disponibilidade e funcionamento contínuos, porém não garante acesso ininterrupto, isento de falhas, erros, vírus ou outros componentes prejudiciais.",
      "Em nenhuma hipótese a Prestadora, seus colaboradores ou parceiros serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, lucros cessantes, interrupção de atividade, perda de dados ou informações, mesmo que avisada da possibilidade de tais danos.",
      "É de responsabilidade exclusiva do Usuário consultar profissional de saúde habilitado (médico) antes de iniciar qualquer programa de exercícios físicos ou mudanças alimentares, especialmente em caso de gravidez, lactação, hipertensão, diabetes, cardiopatias, problemas ortopédicos, patologias preexistentes ou uso contínuo de medicamentos.",
      "O Usuário reconhece que a prática de atividades físicas e a adoção de planos alimentares envolvem riscos inerentes, incluindo lesões musculares e articulares, sendo sua execução de inteira responsabilidade do Usuário.",
    ],
  },
  {
    id: 7,
    title: "7. Alterações nos Termos",
    paragraphs: [
      "A Prestadora reserva-se o direito de modificar, atualizar ou complementar estes Termos de Uso a qualquer momento, visando melhorias ou adequações legais, normativas ou operacionais.",
      "As alterações entrarão em vigor imediatamente após sua publicação na Plataforma. O Usuário será notificado por e-mail ou por aviso destacado na área de login. A continuidade na utilização dos serviços após a alteração configura aceitação tácita.",
      "Recomenda-se a leitura periódica destes Termos. A versão vigente será sempre a publicada na data de utilização da Plataforma.",
      "Caso o Usuário não concorde com qualquer alteração, deverá cessar imediatamente o uso dos serviços e solicitar o cancelamento da assinatura.",
      "Estes Termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no foro da comarca de domicílio da Prestadora, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    ],
  },
];

const contentEn = [
  {
    id: 1,
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By accessing or using the Nath Ramos Personal Trainer platform, hereafter referred to as the Platform, you declare that you have read, understood and fully agreed to these Terms of Service, as well as the Privacy Policy and all other applicable complementary policies.",
      "These Terms govern the legal relationship between Nath Ramos (hereafter the Service Provider) and you (hereafter the User). If you do not agree with any provision, you must not use the Platform.",
      "Use of the Platform requires full legal capacity (18 years of age or older or legally emancipated). Minors may use the Platform only upon express consent and supervision of their parents or legal guardians.",
    ],
  },
  {
    id: 2,
    title: "2. Description of Services",
    paragraphs: [
      "The Provider offers personalized online fitness coaching services, including, but not limited to: personalized workout plans, personalized meal plans and diets, hydration tracking, sleep logging, weight and body evolution tracking, supplementation guides, educational e-books, lab exam analysis (per contracted plan) and individual mentoring (per contracted plan).",
      "Services are provided remotely via web platform and/or application. The Provider does not guarantee specific results, as progress depends on multiple factors including, without limitation, strict adherence to the plan, genetics, sleep, stress, pre-existing pathologies and User lifestyle habits.",
      "All educational content provided is for informational and educational purposes only, and does not replace consultation with licensed health professionals (physician, nutritionist, physical educator) for diagnoses, prescriptions or specific treatments.",
    ],
  },
  {
    id: 3,
    title: "3. Payments, Plans and Subscriptions",
    paragraphs: [
      "Platform services are offered through paid subscriptions to the Essential, Transformation or Elite plans, whose prices are presented at the time of purchase and may be updated at any time, with 30-day prior notice for active subscriptions.",
      "Accepted payment methods: credit cards (Visa, Mastercard, Elo, Amex, Hipercard), Pix (Brazil) and bank slips. Recurring subscriptions will be automatically charged on the due date.",
      "The subscription is monthly with automatic renewal, unless cancelled in advance by either party. The User is responsible for regularly reviewing invoices and payment details.",
      "Refunds: as provided by consumer protection laws, the User may exercise the right of withdrawal within 7 (seven) calendar days from the purchase date, provided that the personalized services have not been effectively used. Outside this period, no refunds will be given for paid amounts, except in cases of unilateral cancellation by the Provider.",
    ],
  },
  {
    id: 4,
    title: "4. Cancellation and Suspension",
    paragraphs: [
      "The User may request subscription cancellation at any time, directly in the My Account area of the Platform. Cancellation requires no justification and involves no penalties or additional charges.",
      "After cancellation, access to services remains active until the end of the already paid period, without proportional refunds of amounts already paid.",
      "The Provider reserves the right to unilaterally suspend or cancel, without prior notice, the User account that: (I) violates any provision of these Terms; (II) uses the Platform for unlawful purposes or contrary to ethics and good morals; (III) provides false or inaccurate information; (IV) shares account credentials with third parties; (V) commits any act that may compromise the security, integrity or operation of the Platform.",
      "In case of declined payment or delinquency, access to services may be temporarily suspended until payment is regularized.",
    ],
  },
  {
    id: 5,
    title: "5. Privacy and Data Protection",
    paragraphs: [
      "The Provider processes the User's personal data in compliance with applicable legislation, in particular the Brazilian General Data Protection Law (LGPD - Law 13.709/2018) and its Privacy Policy, available in a dedicated section of the Platform.",
      "Only data strictly necessary to provide the contracted services is collected, including identification, contact, anthropometric and health information relevant to personalizing workouts and diets. Further details on collection, processing and storage are set out in the Privacy Policy.",
      "The User guarantees the truthfulness and accuracy of the information provided and undertakes to keep it updated. The Provider is not responsible for consequences arising from inaccurate or outdated information.",
    ],
  },
  {
    id: 6,
    title: "6. Liability and Disclaimers",
    paragraphs: [
      "The Platform is provided as is. The Provider makes its best efforts to maintain continuous availability and operation, but does not guarantee uninterrupted access free of failures, errors, viruses or other harmful components.",
      "Under no circumstances shall the Provider, its employees or partners be liable for any direct, indirect, incidental, special, consequential or punitive damages, including, without limitation, lost profits, business interruption, loss of data or information, even if advised of the possibility of such damages.",
      "It is the exclusive responsibility of the User to consult a licensed health professional (physician) before starting any physical exercise program or dietary changes, especially in case of pregnancy, breastfeeding, hypertension, diabetes, heart conditions, orthopedic problems, pre-existing pathologies or continuous medication use.",
      "The User acknowledges that physical activity and adoption of meal plans involve inherent risks, including muscular and joint injuries, and their execution is the sole responsibility of the User.",
    ],
  },
  {
    id: 7,
    title: "7. Changes to the Terms",
    paragraphs: [
      "The Provider reserves the right to modify, update or supplement these Terms of Service at any time, for improvements or legal, regulatory or operational adjustments.",
      "Changes shall take effect immediately upon publication on the Platform. The User will be notified by email or by a prominent notice in the login area. Continued use of the services after changes constitutes tacit acceptance.",
      "Periodic reading of these Terms is recommended. The current version shall always be that published on the date of Platform use.",
      "If the User does not agree with any change, they must immediately cease use of the services and request subscription cancellation.",
      "These Terms are governed by Brazilian law. Any disputes shall be resolved in the judicial district of the Provider's domicile, with express waiver of any other, regardless of privilege.",
    ],
  },
];

export default async function TermosPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const navT = await getTranslations("nav");
  const content = locale === "pt-BR" ? contentPt : contentEn;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <PublicHeader locale={locale} />
      <main className="flex-1 w-full">
        <article className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-4">
              {navT("terms")}
            </h1>
            <p className="text-text-secondary text-sm">
              Última atualização: {new Date().toLocaleDateString(locale)}
            </p>
          </header>

          <div className="space-y-10">
            {content.map((section) => (
              <section key={section.id}>
                <h2 className="text-xl font-semibold text-text mb-4 pb-3 border-b border-border">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
