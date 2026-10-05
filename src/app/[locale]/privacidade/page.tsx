import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getTranslations, setRequestLocale } from "next-intl/server";

const contentPt = [
  {
    id: 1,
    title: "1. Dados Coletados",
    paragraphs: [
      "Nath Ramos Personal Trainer (a seguir Controladora), inscrita no CPF/CNPJ sob o número —, com sede em —, é controladora dos dados pessoais coletados por meio desta Plataforma e compromete-se a proteger a privacidade e os dados pessoais dos Usuários em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018), o Marco Civil da Internet e demais normas aplicáveis.",
      "Coletamos os seguintes dados pessoais, conforme a sua interação com a Plataforma:",
      "Dados de identificação e contato: nome completo (first_name, last_name), endereço de e-mail, número de telefone celular, data de nascimento, sexo/gênero, país e idioma preferido.",
      "Dados antropométricos e de saúde: altura (height_cm), peso corporal (weight_kg), porcentual de gordura corporal, nível de treinamento, objetivo principal, condições médicas pré-existentes, restrições alimentares, alergias, histórico de lesões e informações de exames laboratoriais, quando fornecidos voluntariamente.",
      "Dados de uso e navegação: endereço IP, tipo de dispositivo, sistema operacional, navegador, páginas visitadas, horários de acesso, interações e logs de operação.",
      "Dados de pagamento: os dados financeiros (número de cartão, CVC, validade) são tratados exclusivamente pelos processadores de pagamento (Stripe e/ou outros parceiros homologados), de forma criptografada, não sendo armazenados em nossos servidores. Temos acesso apenas aos dados de transação (status, data, valor e últimos 4 dígitos do cartão).",
      "Cookies e tecnologias semelhantes: conforme detalhado na seção 6 desta Política.",
    ],
  },
  {
    id: 2,
    title: "2. Finalidade do Tratamento",
    paragraphs: [
      "Os dados pessoais coletados são tratados com base em sua manifestação de consentimento, na execução de contrato ou em nosso legítimo interesse, para as seguintes finalidades:",
      "Execução dos serviços contratados: personalização de treinos, dietas, planos de suplementação e mentoria individual; comunicação entre Usuário e equipe Nath Ramos; envio de notificações relacionadas aos serviços (lembretes de treino, refeições, hidratação, atualizações de plano, mensagens da mentoria).",
      "Gestão da conta e assinatura: criação e autenticação de conta; processamento e cobrança de pagamentos; suporte técnico e atendimento ao cliente; resolução de contestações e prevenção a fraudes.",
      "Melhoria dos serviços: análise de uso, desempenho e engajamento da Plataforma; estudos estatísticos e de pesquisa (em geral, anonimizados); desenvolvimento de novas funcionalidades e conteúdos.",
      "Comunicações: envio de novidades, conteúdos educacionais, promoções e eventos, quando expressamente autorizado pelo Usuário. O Usuário poderá cancelar a inscrição a qualquer momento por meio do link de descadastramento presente em cada comunicação.",
      "Cumprimento de obrigação legal ou regulatória: atendimento a requisições de autoridades públicas competentes, defesa de direitos em processos judiciais e administrativos, e cumprimento de normas tributárias e contábeis.",
    ],
  },
  {
    id: 3,
    title: "3. Armazenamento e Segurança",
    paragraphs: [
      "Os dados pessoais são armazenados em servidores seguros hospedados pela plataforma Supabase e Amazon Web Services (AWS), com infraestrutura localizada no Brasil e/ou Estados Unidos, observados os padrões de segurança da informação de mercado.",
      "Adotamos medidas técnicas e administrativas adequadas para proteger seus dados contra acesso não autorizado, destruição, perda, alteração, comunicação ou difusão acidental ou ilícita, incluindo: criptografia em trânsito (TLS/SSL) e em repouso; controle de acesso baseado em função (RBAC); monitoramento contínuo de logs e ameaças; backups criptografados e redundância geográfica; políticas internas de segurança e confidencialidade.",
      "Ainda que adotemos os melhores padrões, nenhum método de transmissão pela Internet ou de armazenamento eletrônico é 100% seguro. Nesses casos, agiremos prontamente para mitigar danos, comunicar os titulares e as autoridades conforme exigido pela LGPD.",
      "Os dados serão mantidos apenas pelo tempo necessário ao cumprimento das finalidades elencadas, observados os prazos legais de prescrição e arquivamento obrigatório. Após o término do tratamento, os dados serão eliminados ou anonimizados.",
    ],
  },
  {
    id: 4,
    title: "4. Compartilhamento de Dados",
    paragraphs: [
      "Não vendemos, alugamos ou negociamos dados pessoais de nossos Usuários com terceiros para fins de marketing ou quaisquer outros fins diversos dos previstos nesta Política.",
      "Seus dados podem ser compartilhados apenas com os seguintes destinatários, estritamente para o cumprimento das finalidades descritas:",
      "Prestadores de serviços essenciais: processadores de pagamento (Stripe, Asaas e similares) para efetivação de cobranças; provedores de infraestrutura cloud (Supabase, AWS) para hospedagem e processamento de dados; provedores de comunicação (e-mail, SMS, push) para envio de notificações autorizadas.",
      "Autoridades públicas: quando exigido por lei, ordem judicial ou requisição administrativa de órgão competente.",
      "Colaboradores: equipe Nath Ramos (incluindo Nath Ramos e equipe de suporte) que necessitem de acesso aos dados para prestação dos serviços, todos vinculados por obrigações contratuais de confidencialidade.",
      "Operações societárias: em caso de fusão, aquisição, incorporação ou reorganização societária, os dados poderão ser transferidos aos sucessores, observados os mesmos padrões de proteção desta Política.",
      "Todos os destinatários externos são contratados com cláusulas rigorosas de proteção de dados e responsabilidade, em conformidade com os artigos 107 a 109 da LGPD.",
    ],
  },
  {
    id: 5,
    title: "5. Seus Direitos (LGPD / CCPA)",
    paragraphs: [
      "Enquanto titular de dados pessoais, você usufrui dos seguintes direitos previstos na LGPD e nas normas aplicáveis, que poderão ser exercidos mediante solicitação através do contato nathramos@exemplo.com ou da área Minha Conta na Plataforma:",
      "I. Direito de Acesso (Art. 18, I): confirmar a existência de tratamento e acessar seus dados pessoais.",
      "II. Direito de Correção (Art. 18, II): solicitar correção de dados incompletos, inexatos ou desatualizados.",
      "III. Direito de Exclusão (Art. 18, III): solicitar a exclusão dos seus dados pessoais, quando não mais necessários às finalidades do tratamento ou após o término da assinatura, observados os prazos legais.",
      "IV. Direito à Portabilidade (Art. 18, V): solicitar, mediante requisição formal, a portabilidade dos seus dados para outro fornecedor de serviço ou produto.",
      "V. Direito de Oposição e Revogação do Consentimento (Art. 8º, §5º e Art. 18, VI): opor-se ou revogar o consentimento a qualquer momento, por decisão livre e manifestada, sem prejuízo da validade dos tratamentos realizados anteriormente.",
      "VI. Direito de Explicabilidade (Art. 18, VII): solicitar informações claras, adequadas e ostensivas sobre o tratamento de seus dados.",
      "Para residentes da Califórnia (CCPA), aplica-se ainda o direito de: solicitar divulgação das categorias e dados pessoais específicos coletados, usados ou compartilhados; solicitar exclusão; optar por não ter seus dados vendidos (aqui não vendemos); não ser discriminado pelo exercício desses direitos.",
      "Solicitações serão respondidas em até 15 (quinze) dias úteis, podendo ser prorrogadas uma única vez por igual período, conforme art. 19 da LGPD.",
    ],
  },
  {
    id: 6,
    title: "6. Cookies",
    paragraphs: [
      "Cookies são pequenos arquivos de texto enviados pela Plataforma para o seu dispositivo e que ficam armazenados no navegador. Utilizamos cookies para proporcionar a melhor experiência possível, sendo classificados como:",
      "Cookies estritamente necessários: indispensáveis para o funcionamento básico da Plataforma, autenticação de sessão, segurança e navegação. Não podem ser desativados, pois sem eles a Plataforma não funcionará adequadamente.",
      "Cookies de desempenho e analytics: coletam informações anônimas sobre como os Usuários navegam e utilizam a Plataforma (páginas mais acessadas, tempo de permanência, erros), permitindo melhorias contínuas.",
      "Cookies de funcionalidade: armazenam preferências do Usuário (idioma, região, modo de exibição, lembretes de login) para personalizar a experiência entre sessões.",
      "Cookies de marketing: utilizados apenas se você autorizar, para exibir anúncios relevantes e medir o desempenho de campanhas fora da Plataforma.",
      "Você pode gerenciar ou revogar o consentimento a qualquer momento através das configurações do seu navegador ou da área de preferências da Plataforma. A desativação de cookies não essenciais pode afetar algumas funcionalidades.",
    ],
  },
  {
    id: 7,
    title: "7. Contato e Encarregado (DPO)",
    paragraphs: [
      "Para dúvidas, reclamações, solicitações de exercício de direitos ou qualquer comunicação relativa à proteção de dados pessoais, entre em contato conosco pelos canais abaixo:",
      "E-mail: nathramos@exemplo.com",
      "Endereço: —",
      "Nosso Encarregado de Tratamento de Dados Pessoais (DPO) designado está disponível para atendimento nos mesmos canais, garantindo a comunicação entre a Controladora, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD).",
      "Reservamo-nos o direito de atualizar esta Política de Privacidade periodicamente. Quando houver alterações materiais que possam reduzir seus direitos ou alterar significativamente o tratamento de seus dados, você será avisado por meio de comunicação destacada na Plataforma ou por e-mail.",
      "A versão vigente desta Política é sempre a publicada nesta página, indicada pela data de última atualização no topo.",
    ],
  },
];

const contentEn = [
  {
    id: 1,
    title: "1. Data Collected",
    paragraphs: [
      "Nath Ramos Personal Trainer (hereafter the Controller), registered under CPF/CNPJ number —, headquartered at —, is the controller of personal data collected through this Platform and is committed to protecting User privacy and personal data in compliance with the Brazilian General Data Protection Law (LGPD, Law 13.709/2018), the Civil Internet Framework and other applicable regulations.",
      "We collect the following personal data according to your interaction with the Platform:",
      "Identification and contact data: full name (first_name, last_name), email address, mobile phone number, date of birth, gender, country and preferred language.",
      "Anthropometric and health data: height (height_cm), body weight (weight_kg), body fat percentage, training level, primary goal, pre-existing medical conditions, dietary restrictions, allergies, injury history and lab exam information, when voluntarily provided.",
      "Usage and navigation data: IP address, device type, operating system, browser, visited pages, access timestamps, interactions and operation logs.",
      "Payment data: financial information (card number, CVC, expiration) is processed exclusively by our payment processors (Stripe and/or other certified partners), in encrypted form, and is not stored on our servers. We only access transaction data (status, date, amount and last 4 card digits).",
      "Cookies and similar technologies: as detailed in Section 6 of this Policy.",
    ],
  },
  {
    id: 2,
    title: "2. Purpose of Processing",
    paragraphs: [
      "Personal data collected is processed based on your express consent, contract performance or our legitimate interest, for the following purposes:",
      "Performance of contracted services: personalization of workouts, diets, supplementation plans and individual mentoring; communication between the User and Nath Ramos team; delivery of service-related notifications (workout reminders, meals, hydration, plan updates, mentoring messages).",
      "Account and subscription management: account creation and authentication; payment processing and billing; technical support and customer service; dispute resolution and fraud prevention.",
      "Service improvement: analysis of Platform usage, performance and engagement; statistical and research studies (typically anonymized); development of new features and content.",
      "Communications: delivery of news, educational content, promotions and events, when expressly authorized by the User. The User may unsubscribe at any time via the opt-out link included in each communication.",
      "Legal or regulatory compliance: response to requests from competent public authorities, defense of rights in judicial and administrative proceedings, and compliance with tax and accounting rules.",
    ],
  },
  {
    id: 3,
    title: "3. Storage and Security",
    paragraphs: [
      "Personal data is stored on secure servers hosted by Supabase and Amazon Web Services (AWS), with infrastructure located in Brazil and/or the United States, following market information security standards.",
      "We adopt appropriate technical and administrative measures to protect your data against unauthorized access, destruction, loss, alteration, communication or accidental or unlawful disclosure, including: in-transit (TLS/SSL) and at-rest encryption; role-based access control (RBAC); continuous log and threat monitoring; encrypted backups and geographic redundancy; internal security and confidentiality policies.",
      "Although we adopt the highest standards, no method of Internet transmission or electronic storage is 100% secure. In such cases, we will act promptly to mitigate damages, notify data subjects and authorities as required by the LGPD.",
      "Data will be retained only for the period necessary to fulfill the listed purposes, in compliance with legal retention and archiving deadlines. After processing ends, data will be deleted or anonymized.",
    ],
  },
  {
    id: 4,
    title: "4. Data Sharing",
    paragraphs: [
      "We do not sell, rent or trade our Users' personal data with third parties for marketing purposes or any purposes other than those set out in this Policy.",
      "Your data may only be shared with the following recipients, strictly to fulfill the described purposes:",
      "Essential service providers: payment processors (Stripe, Asaas and similar) for billing; cloud infrastructure providers (Supabase, AWS) for data hosting and processing; communication providers (email, SMS, push) for authorized notifications.",
      "Public authorities: when required by law, court order or administrative request from a competent body.",
      "Staff: Nath Ramos team (including Nath Ramos and support staff) who require data access for service delivery, all bound by contractual confidentiality obligations.",
      "Corporate transactions: in the event of merger, acquisition, incorporation or corporate reorganization, data may be transferred to successors, subject to the same protection standards of this Policy.",
      "All external recipients are contracted with strict data protection and liability clauses, in accordance with articles 107 to 109 of the LGPD.",
    ],
  },
  {
    id: 5,
    title: "5. Your Rights (LGPD / CCPA)",
    paragraphs: [
      "As a personal data subject, you enjoy the following rights under the LGPD and applicable regulations, which can be exercised upon request to nathramos@example.com or through the My Account area of the Platform:",
      "I. Right of Access (Art. 18, I): confirm the existence of processing and access your personal data.",
      "II. Right of Rectification (Art. 18, II): request correction of incomplete, inaccurate or outdated data.",
      "III. Right to Erasure (Art. 18, III): request deletion of your personal data when no longer necessary for processing purposes or after subscription ends, subject to legal deadlines.",
      "IV. Right to Portability (Art. 18, V): request, upon formal application, portability of your data to another service or product provider.",
      "V. Right to Object and Withdraw Consent (Art. 8, §5 and Art. 18, VI): object to or withdraw consent at any time, by free and informed decision, without prejudice to the validity of previously performed processing.",
      "VI. Right to Information (Art. 18, VII): request clear, adequate and transparent information about how your data is processed.",
      "For California residents (CCPA), the additional right applies to: request disclosure of the categories and specific personal data collected, used or shared; request deletion; opt-out of sale of data (we do not sell data); not be discriminated against for exercising these rights.",
      "Requests will be responded to within 15 (fifteen) business days, extendable once for the same period, per Art. 19 of the LGPD.",
    ],
  },
  {
    id: 6,
    title: "6. Cookies",
    paragraphs: [
      "Cookies are small text files sent by the Platform to your device and stored on your browser. We use cookies to deliver the best possible experience, classified as follows:",
      "Strictly necessary cookies: indispensable for basic Platform operation, session authentication, security and navigation. They cannot be disabled, as without them the Platform would not work properly.",
      "Performance and analytics cookies: collect anonymous information about how Users navigate and use the Platform (most visited pages, time spent, errors), enabling continuous improvements.",
      "Functionality cookies: store User preferences (language, region, display mode, login reminders) to personalize experience between sessions.",
      "Marketing cookies: only used if you authorize them, to display relevant ads and measure campaign performance outside the Platform.",
      "You can manage or withdraw consent at any time through your browser settings or the Platform preferences area. Disabling non-essential cookies may affect some functionalities.",
    ],
  },
  {
    id: 7,
    title: "7. Contact and DPO",
    paragraphs: [
      "For questions, complaints, rights exercise requests or any communication regarding personal data protection, contact us through the channels below:",
      "Email: nathramos@example.com",
      "Address: —",
      "Our appointed Data Protection Officer (DPO) is available at the same channels, ensuring communication between the Controller, data subjects and the Brazilian National Data Protection Authority (ANPD).",
      "We reserve the right to update this Privacy Policy periodically. When there are material changes that may reduce your rights or significantly alter data processing, you will be notified via a prominent notice on the Platform or by email.",
      "The current version of this Policy is always the one published on this page, indicated by the last updated date at the top.",
    ],
  },
];

export default async function PrivacidadePage({
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
              {navT("privacy")}
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
