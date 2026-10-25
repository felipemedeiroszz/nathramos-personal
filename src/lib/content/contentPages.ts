import type { ContentPageBlock, ContentPageRow } from "@/types"
import type { ContentPageSlugT } from "@/schemas/contentPages"

export interface DefaultContentPage {
  slug: ContentPageSlugT
  titlePt: string
  titleEn: string
  subtitlePt: string
  subtitleEn: string
  blocks: ContentPageBlock[]
}

/**
 * Conteúdo padrão das páginas institucionais.
 * É usado como conteúdo inicial (e fallback) até que o administrador
 * personalize a página pelo painel. Blocos com `subtitle` são agrupados
 * por categoria (usado na página de FAQ).
 */
const termosBlocks: ContentPageBlock[] = [
  {
    id: "termos-1",
    title_pt: "1. Aceite dos Termos",
    title_en: "1. Acceptance of Terms",
    text_pt:
      "Ao acessar ou utilizar a plataforma Nath Ramos Personal Trainer, doravante denominada Plataforma, você declara ter lido, compreendido e concordado integralmente com os presentes Termos de Uso, bem como com a Política de Privacidade e todas as demais políticas complementares aplicáveis.\n\nEstes Termos regem a relação jurídica entre Nath Ramos (a seguir Prestadora de Serviços) e você (a seguir Usuário). Caso não concorde com qualquer disposição, você não deve utilizar a Plataforma.\n\nA utilização da Plataforma exige que você tenha capacidade jurídica plena (maior de 18 anos ou emancipado). Menores de idade poderão utilizar a Plataforma apenas mediante consentimento expresso e acompanhamento dos pais ou responsáveis legais.",
    text_en:
      "By accessing or using the Nath Ramos Personal Trainer platform, hereafter referred to as the Platform, you declare that you have read, understood and fully agreed to these Terms of Service, as well as the Privacy Policy and all other applicable complementary policies.\n\nThese Terms govern the legal relationship between Nath Ramos (hereafter the Service Provider) and you (hereafter the User). If you do not agree with any provision, you must not use the Platform.\n\nUse of the Platform requires full legal capacity (18 years of age or older or legally emancipated). Minors may use the Platform only upon express consent and supervision of their parents or legal guardians.",
  },
  {
    id: "termos-2",
    title_pt: "2. Descrição dos Serviços",
    title_en: "2. Description of Services",
    text_pt:
      "A Prestadora oferece serviços de acompanhamento fitness personalizado online, incluindo, sem se limitar a: planos de treino personalizados, planos alimentares e dietas personalizadas, acompanhamento de hidratação, registro de sono, acompanhamento de peso e evolução corporal, guias de suplementação, e-books educacionais, análise de exames laboratoriais (conforme plano contratado) e mentoria individual (conforme plano contratado).\n\nOs serviços são prestados de forma remota via Plataforma web e/ou aplicativo. A Prestadora não garante resultados específicos, pois a evolução depende de múltiplos fatores incluindo, sem limitação, adesão estrita ao plano, genética, sono, estresse, patologias pré-existentes e hábitos de vida do Usuário.\n\nTodo o conteúdo educacional disponibilizado tem caráter meramente informativo e educativo, não substituindo consulta com profissionais de saúde habilitados (médico, nutricionista, educador físico) para diagnósticos, prescrições ou tratamentos específicos.",
    text_en:
      "The Provider offers personalized online fitness coaching services, including, but not limited to: personalized workout plans, personalized meal plans and diets, hydration tracking, sleep logging, weight and body evolution tracking, supplementation guides, educational e-books, lab exam analysis (per contracted plan) and individual mentoring (per contracted plan).\n\nServices are provided remotely via web platform and/or application. The Provider does not guarantee specific results, as progress depends on multiple factors including, without limitation, strict adherence to the plan, genetics, sleep, stress, pre-existing pathologies and User lifestyle habits.\n\nAll educational content provided is for informational and educational purposes only, and does not replace consultation with licensed health professionals (physician, nutritionist, physical educator) for diagnoses, prescriptions or specific treatments.",
  },
  {
    id: "termos-3",
    title_pt: "3. Pagamentos, Planos e Assinaturas",
    title_en: "3. Payments, Plans and Subscriptions",
    text_pt:
      "Os serviços da Plataforma são oferecidos mediante assinatura paga dos planos Essencial, Transformação ou Elite, cujos valores são apresentados no momento da contratação e podem ser atualizados a qualquer momento, com aviso prévio de 30 dias para assinaturas ativas.\n\nFormas de pagamento aceitas: cartões de crédito (Visa, Mastercard, Elo, Amex, Hipercard), Pix e boleto bancário. Assinaturas recorrentes serão debitadas automaticamente na data de vencimento.\n\nA assinatura tem duração mensal e renovação automática, salvo cancelamento prévio por qualquer das partes. O Usuário é responsável por conferir regularmente sua fatura e dados de pagamento.\n\nReembolsos: conforme previsto no Código de Defesa do Consumidor, o Usuário poderá exercer o direito de arrependimento em até 7 (sete) dias corridos contados da data da contratação, desde que não tenha utilizado efetivamente os serviços personalizados prestados. Fora desse prazo, não haverá devolução de valores pagos, exceto em casos de cancelamento unilateral por parte da Prestadora.",
    text_en:
      "Platform services are offered through paid subscriptions to the Essential, Transformation or Elite plans, whose prices are presented at the time of purchase and may be updated at any time, with 30-day prior notice for active subscriptions.\n\nAccepted payment methods: credit cards (Visa, Mastercard, Elo, Amex, Hipercard), Pix (Brazil) and bank slips. Recurring subscriptions will be automatically charged on the due date.\n\nThe subscription is monthly with automatic renewal, unless cancelled in advance by either party. The User is responsible for regularly reviewing invoices and payment details.\n\nRefunds: as provided by consumer protection laws, the User may exercise the right of withdrawal within 7 (seven) calendar days from the purchase date, provided that the personalized services have not been effectively used. Outside this period, no refunds will be given for paid amounts, except in cases of unilateral cancellation by the Provider.",
  },
  {
    id: "termos-4",
    title_pt: "4. Cancelamento e Suspensão",
    title_en: "4. Cancellation and Suspension",
    text_pt:
      "O Usuário poderá solicitar o cancelamento da assinatura a qualquer momento, diretamente na área Minha Conta da Plataforma. O cancelamento não requer justificativa e não implica multa ou encargos adicionais.\n\nApós o cancelamento, o acesso aos serviços permanecerá ativo até o final do período já pago, sem devolução proporcional dos valores já pagos.\n\nA Prestadora reserva-se o direito de suspender ou cancelar, unilateralmente e sem aviso prévio, a conta do Usuário que: (I) violar qualquer disposição destes Termos; (II) utilizar a Plataforma para fins ilícitos ou contrários à ética e aos bons costumes; (III) fornecer informações falsas ou imprecisas; (IV) compartilhar sua conta com terceiros; (V) praticar qualquer ato que possa comprometer a segurança, integridade ou funcionamento da Plataforma.\n\nEm caso de pagamento recusado ou inadimplência, o acesso aos serviços poderá ser temporariamente suspenso até a regularização do pagamento.",
    text_en:
      "The User may request subscription cancellation at any time, directly in the My Account area of the Platform. Cancellation requires no justification and involves no penalties or additional charges.\n\nAfter cancellation, access to services remains active until the end of the already paid period, without proportional refunds of amounts already paid.\n\nThe Provider reserves the right to unilaterally suspend or cancel, without prior notice, the User account that: (I) violates any provision of these Terms; (II) uses the Platform for unlawful purposes or contrary to ethics and good morals; (III) provides false or inaccurate information; (IV) shares account credentials with third parties; (V) commits any act that may compromise the security, integrity or operation of the Platform.\n\nIn case of declined payment or delinquency, access to services may be temporarily suspended until payment is regularized.",
  },
  {
    id: "termos-5",
    title_pt: "5. Privacidade e Proteção de Dados",
    title_en: "5. Privacy and Data Protection",
    text_pt:
      "A Prestadora trata os dados pessoais do Usuário em conformidade com a legislação brasileira aplicável, em especial a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e com sua Política de Privacidade, disponível em seção própria da Plataforma.\n\nSão coletados apenas os dados estritamente necessários à prestação dos serviços contratados, incluindo dados de identificação, contato, antropométricos e de saúde relevantes para personalização de treinos e dietas. Mais detalhes sobre a coleta, tratamento e armazenamento constam na Política de Privacidade.\n\nO Usuário garante a veracidade e exatidão dos dados informados e compromete-se a mantê-los atualizados. A Prestadora não se responsabiliza por consequências decorrentes de informações imprecisas ou desatualizadas.",
    text_en:
      "The Provider processes the User's personal data in compliance with applicable legislation, in particular the Brazilian General Data Protection Law (LGPD - Law 13.709/2018) and its Privacy Policy, available in a dedicated section of the Platform.\n\nOnly data strictly necessary to provide the contracted services is collected, including identification, contact, anthropometric and health information relevant to personalizing workouts and diets. Further details on collection, processing and storage are set out in the Privacy Policy.\n\nThe User guarantees the truthfulness and accuracy of the information provided and undertakes to keep it updated. The Provider is not responsible for consequences arising from inaccurate or outdated information.",
  },
  {
    id: "termos-6",
    title_pt: "6. Responsabilidade e Isenções",
    title_en: "6. Liability and Disclaimers",
    text_pt:
      "A Plataforma é disponibilizada no estado em que se encontra. A Prestadora envida seus melhores esforços para manter a disponibilidade e funcionamento contínuos, porém não garante acesso ininterrupto, isento de falhas, erros, vírus ou outros componentes prejudiciais.\n\nEm nenhuma hipótese a Prestadora, seus colaboradores ou parceiros serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, lucros cessantes, interrupção de atividade, perda de dados ou informações, mesmo que avisada da possibilidade de tais danos.\n\nÉ de responsabilidade exclusiva do Usuário consultar profissional de saúde habilitado (médico) antes de iniciar qualquer programa de exercícios físicos ou mudanças alimentares, especialmente em caso de gravidez, lactação, hipertensão, diabetes, cardiopatias, problemas ortopédicos, patologias preexistentes ou uso contínuo de medicamentos.\n\nO Usuário reconhece que a prática de atividades físicas e a adoção de planos alimentares envolvem riscos inerentes, incluindo lesões musculares e articulares, sendo sua execução de inteira responsabilidade do Usuário.",
    text_en:
      "The Platform is provided as is. The Provider makes its best efforts to maintain continuous availability and operation, but does not guarantee uninterrupted access free of failures, errors, viruses or other harmful components.\n\nUnder no circumstances shall the Provider, its employees or partners be liable for any direct, indirect, incidental, special, consequential or punitive damages, including, without limitation, lost profits, business interruption, loss of data or information, even if advised of the possibility of such damages.\n\nIt is the exclusive responsibility of the User to consult a licensed health professional (physician) before starting any physical exercise program or dietary changes, especially in case of pregnancy, breastfeeding, hypertension, diabetes, heart conditions, orthopedic problems, pre-existing pathologies or continuous medication use.\n\nThe User acknowledges that physical activity and adoption of meal plans involve inherent risks, including muscular and joint injuries, and their execution is the sole responsibility of the User.",
  },
  {
    id: "termos-7",
    title_pt: "7. Alterações nos Termos",
    title_en: "7. Changes to the Terms",
    text_pt:
      "A Prestadora reserva-se o direito de modificar, atualizar ou complementar estes Termos de Uso a qualquer momento, visando melhorias ou adequações legais, normativas ou operacionais.\n\nAs alterações entrarão em vigor imediatamente após sua publicação na Plataforma. O Usuário será notificado por e-mail ou por aviso destacado na área de login. A continuidade na utilização dos serviços após a alteração configura aceitação tácita.\n\nRecomenda-se a leitura periódica destes Termos. A versão vigente será sempre a publicada na data de utilização da Plataforma.\n\nCaso o Usuário não concorde com qualquer alteração, deverá cessar imediatamente o uso dos serviços e solicitar o cancelamento da assinatura.\n\nEstes Termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no foro da comarca de domicílio da Prestadora, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    text_en:
      "The Provider reserves the right to modify, update or supplement these Terms of Service at any time, for improvements or legal, regulatory or operational adjustments.\n\nChanges shall take effect immediately upon publication on the Platform. The User will be notified by email or by a prominent notice in the login area. Continued use of the services after changes constitutes tacit acceptance.\n\nPeriodic reading of these Terms is recommended. The current version shall always be that published on the date of Platform use.\n\nIf the User does not agree with any change, they must immediately cease use of the services and request subscription cancellation.\n\nThese Terms are governed by Brazilian law. Any disputes shall be resolved in the judicial district of the Provider's domicile, with express waiver of any other, regardless of privilege.",
  },
]

const privacidadeBlocks: ContentPageBlock[] = [
  {
    id: "privacidade-1",
    title_pt: "1. Dados Coletados",
    title_en: "1. Data Collected",
    text_pt:
      "Nath Ramos Personal Trainer (a seguir Controladora), inscrita no CPF/CNPJ sob o número —, com sede em —, é controladora dos dados pessoais coletados por meio desta Plataforma e compromete-se a proteger a privacidade e os dados pessoais dos Usuários em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018), o Marco Civil da Internet e demais normas aplicáveis.\n\nColetamos os seguintes dados pessoais, conforme a sua interação com a Plataforma:\n\nDados de identificação e contato: nome completo (first_name, last_name), endereço de e-mail, número de telefone celular, data de nascimento, sexo/gênero, país e idioma preferido.\n\nDados antropométricos e de saúde: altura (height_cm), peso corporal (weight_kg), porcentual de gordura corporal, nível de treinamento, objetivo principal, condições médicas pré-existentes, restrições alimentares, alergias, histórico de lesões e informações de exames laboratoriais, quando fornecidos voluntariamente.\n\nDados de uso e navegação: endereço IP, tipo de dispositivo, sistema operacional, navegador, páginas visitadas, horários de acesso, interações e logs de operação.\n\nDados de pagamento: os dados financeiros (número de cartão, CVC, validade) são tratados exclusivamente pelos processadores de pagamento (Stripe e/ou outros parceiros homologados), de forma criptografada, não sendo armazenados em nossos servidores. Temos acesso apenas aos dados de transação (status, data, valor e últimos 4 dígitos do cartão).\n\nCookies e tecnologias semelhantes: conforme detalhado na seção 6 desta Política.",
    text_en:
      "Nath Ramos Personal Trainer (hereafter the Controller), registered under CPF/CNPJ number —, headquartered at —, is the controller of personal data collected through this Platform and is committed to protecting User privacy and personal data in compliance with the Brazilian General Data Protection Law (LGPD, Law 13.709/2018), the Civil Internet Framework and other applicable regulations.\n\nWe collect the following personal data according to your interaction with the Platform:\n\nIdentification and contact data: full name (first_name, last_name), email address, mobile phone number, date of birth, gender, country and preferred language.\n\nAnthropometric and health data: height (height_cm), body weight (weight_kg), body fat percentage, training level, primary goal, pre-existing medical conditions, dietary restrictions, allergies, injury history and lab exam information, when voluntarily provided.\n\nUsage and navigation data: IP address, device type, operating system, browser, visited pages, access timestamps, interactions and operation logs.\n\nPayment data: financial information (card number, CVC, expiration) is processed exclusively by our payment processors (Stripe and/or other certified partners), in encrypted form, and is not stored on our servers. We only access transaction data (status, date, amount and last 4 card digits).\n\nCookies and similar technologies: as detailed in Section 6 of this Policy.",
  },
  {
    id: "privacidade-2",
    title_pt: "2. Finalidade do Tratamento",
    title_en: "2. Purpose of Processing",
    text_pt:
      "Os dados pessoais coletados são tratados com base em sua manifestação de consentimento, na execução de contrato ou em nosso legítimo interesse, para as seguintes finalidades:\n\nExecução dos serviços contratados: personalização de treinos, dietas, planos de suplementação e mentoria individual; comunicação entre Usuário e equipe Nath Ramos; envio de notificações relacionadas aos serviços (lembretes de treino, refeições, hidratação, atualizações de plano, mensagens da mentoria).\n\nGestão da conta e assinatura: criação e autenticação de conta; processamento e cobrança de pagamentos; suporte técnico e atendimento ao cliente; resolução de contestações e prevenção a fraudes.\n\nMelhoria dos serviços: análise de uso, desempenho e engajamento da Plataforma; estudos estatísticos e de pesquisa (em geral, anonimizados); desenvolvimento de novas funcionalidades e conteúdos.\n\nComunicações: envio de novidades, conteúdos educacionais, promoções e eventos, quando expressamente autorizado pelo Usuário. O Usuário poderá cancelar a inscrição a qualquer momento por meio do link de descadastramento presente em cada comunicação.\n\nCumprimento de obrigação legal ou regulatória: atendimento a requisições de autoridades públicas competentes, defesa de direitos em processos judiciais e administrativos, e cumprimento de normas tributárias e contábeis.",
    text_en:
      "Personal data collected is processed based on your express consent, contract performance or our legitimate interest, for the following purposes:\n\nPerformance of contracted services: personalization of workouts, diets, supplementation plans and individual mentoring; communication between the User and Nath Ramos team; delivery of service-related notifications (workout reminders, meals, hydration, plan updates, mentoring messages).\n\nAccount and subscription management: account creation and authentication; payment processing and billing; technical support and customer service; dispute resolution and fraud prevention.\n\nService improvement: analysis of Platform usage, performance and engagement; statistical and research studies (typically anonymized); development of new features and content.\n\nCommunications: delivery of news, educational content, promotions and events, when expressly authorized by the User. The User may unsubscribe at any time via the opt-out link included in each communication.\n\nLegal or regulatory compliance: response to requests from competent public authorities, defense of rights in judicial and administrative proceedings, and compliance with tax and accounting rules.",
  },
  {
    id: "privacidade-3",
    title_pt: "3. Armazenamento e Segurança",
    title_en: "3. Storage and Security",
    text_pt:
      "Os dados pessoais são armazenados em servidores seguros hospedados pela plataforma Supabase e Amazon Web Services (AWS), com infraestrutura localizada no Brasil e/ou Estados Unidos, observados os padrões de segurança da informação de mercado.\n\nAdotamos medidas técnicas e administrativas adequadas para proteger seus dados contra acesso não autorizado, destruição, perda, alteração, comunicação ou difusão acidental ou ilícita, incluindo: criptografia em trânsito (TLS/SSL) e em repouso; controle de acesso baseado em função (RBAC); monitoramento contínuo de logs e ameaças; backups criptografados e redundância geográfica; políticas internas de segurança e confidencialidade.\n\nAinda que adotemos os melhores padrões, nenhum método de transmissão pela Internet ou de armazenamento eletrônico é 100% seguro. Nesses casos, agiremos prontamente para mitigar danos, comunicar os titulares e as autoridades conforme exigido pela LGPD.\n\nOs dados serão mantidos apenas pelo tempo necessário ao cumprimento das finalidades elencadas, observados os prazos legais de prescrição e arquivamento obrigatório. Após o término do tratamento, os dados serão eliminados ou anonimizados.",
    text_en:
      "Personal data is stored on secure servers hosted by Supabase and Amazon Web Services (AWS), with infrastructure located in Brazil and/or the United States, following market information security standards.\n\nWe adopt appropriate technical and administrative measures to protect your data against unauthorized access, destruction, loss, alteration, communication or accidental or unlawful disclosure, including: in-transit (TLS/SSL) and at-rest encryption; role-based access control (RBAC); continuous log and threat monitoring; encrypted backups and geographic redundancy; internal security and confidentiality policies.\n\nAlthough we adopt the highest standards, no method of Internet transmission or electronic storage is 100% secure. In such cases, we will act promptly to mitigate damages, notify data subjects and authorities as required by the LGPD.\n\nData will be retained only for the period necessary to fulfill the listed purposes, in compliance with legal retention and archiving deadlines. After processing ends, data will be deleted or anonymized.",
  },
  {
    id: "privacidade-4",
    title_pt: "4. Compartilhamento de Dados",
    title_en: "4. Data Sharing",
    text_pt:
      "Não vendemos, alugamos ou negociamos dados pessoais de nossos Usuários com terceiros para fins de marketing ou quaisquer outros fins diversos dos previstos nesta Política.\n\nSeus dados podem ser compartilhados apenas com os seguintes destinatários, estritamente para o cumprimento das finalidades descritas:\n\nPrestadores de serviços essenciais: processadores de pagamento (Stripe, Asaas e similares) para efetivação de cobranças; provedores de infraestrutura cloud (Supabase, AWS) para hospedagem e processamento de dados; provedores de comunicação (e-mail, SMS, push) para envio de notificações autorizadas.\n\nAutoridades públicas: quando exigido por lei, ordem judicial ou requisição administrativa de órgão competente.\n\nColaboradores: equipe Nath Ramos (incluindo Nath Ramos e equipe de suporte) que necessitem de acesso aos dados para prestação dos serviços, todos vinculados por obrigações contratuais de confidencialidade.\n\nOperações societárias: em caso de fusão, aquisição, incorporação ou reorganização societária, os dados poderão ser transferidos aos sucessores, observados os mesmos padrões de proteção desta Política.\n\nTodos os destinatários externos são contratados com cláusulas rigorosas de proteção de dados e responsabilidade, em conformidade com os artigos 107 a 109 da LGPD.",
    text_en:
      "We do not sell, rent or trade our Users' personal data with third parties for marketing purposes or any purposes other than those set out in this Policy.\n\nYour data may only be shared with the following recipients, strictly to fulfill the described purposes:\n\nEssential service providers: payment processors (Stripe, Asaas and similar) for billing; cloud infrastructure providers (Supabase, AWS) for data hosting and processing; communication providers (email, SMS, push) for authorized notifications.\n\nPublic authorities: when required by law, court order or administrative request from a competent body.\n\nStaff: Nath Ramos team (including Nath Ramos and support staff) who require data access for service delivery, all bound by contractual confidentiality obligations.\n\nCorporate transactions: in the event of merger, acquisition, incorporation or corporate reorganization, data may be transferred to successors, subject to the same protection standards of this Policy.\n\nAll external recipients are contracted with strict data protection and liability clauses, in accordance with articles 107 to 109 of the LGPD.",
  },
  {
    id: "privacidade-5",
    title_pt: "5. Seus Direitos (LGPD / CCPA)",
    title_en: "5. Your Rights (LGPD / CCPA)",
    text_pt:
      "Enquanto titular de dados pessoais, você usufrui dos seguintes direitos previstos na LGPD e nas normas aplicáveis, que poderão ser exercidos mediante solicitação através do contato nathramos@exemplo.com ou da área Minha Conta na Plataforma:\n\nI. Direito de Acesso (Art. 18, I): confirmar a existência de tratamento e acessar seus dados pessoais.\n\nII. Direito de Correção (Art. 18, II): solicitar correção de dados incompletos, inexatos ou desatualizados.\n\nIII. Direito de Exclusão (Art. 18, III): solicitar a exclusão dos seus dados pessoais, quando não mais necessários às finalidades do tratamento ou após o término da assinatura, observados os prazos legais.\n\nIV. Direito à Portabilidade (Art. 18, V): solicitar, mediante requisição formal, a portabilidade dos seus dados para outro fornecedor de serviço ou produto.\n\nV. Direito de Oposição e Revogação do Consentimento (Art. 8º, §5º e Art. 18, VI): opor-se ou revogar o consentimento a qualquer momento, por decisão livre e manifestada, sem prejuízo da validade dos tratamentos realizados anteriormente.\n\nVI. Direito de Explicabilidade (Art. 18, VII): solicitar informações claras, adequadas e ostensivas sobre o tratamento de seus dados.\n\nPara residentes da Califórnia (CCPA), aplica-se ainda o direito de: solicitar divulgação das categorias e dados pessoais específicos coletados, usados ou compartilhados; solicitar exclusão; optar por não ter seus dados vendidos (aqui não vendemos); não ser discriminado pelo exercício desses direitos.\n\nSolicitações serão respondidas em até 15 (quinze) dias úteis, podendo ser prorrogadas uma única vez por igual período, conforme art. 19 da LGPD.",
    text_en:
      "As a personal data subject, you enjoy the following rights under the LGPD and applicable regulations, which can be exercised upon request to nathramos@example.com or through the My Account area of the Platform:\n\nI. Right of Access (Art. 18, I): confirm the existence of processing and access your personal data.\n\nII. Right of Rectification (Art. 18, II): request correction of incomplete, inaccurate or outdated data.\n\nIII. Right to Erasure (Art. 18, III): request deletion of your personal data when no longer necessary for processing purposes or after subscription ends, subject to legal deadlines.\n\nIV. Right to Portability (Art. 18, V): request, upon formal application, portability of your data to another service or product provider.\n\nV. Right to Object and Withdraw Consent (Art. 8, §5 and Art. 18, VI): object to or withdraw consent at any time, by free and informed decision, without prejudice to the validity of previously performed processing.\n\nVI. Right to Information (Art. 18, VII): request clear, adequate and transparent information about how your data is processed.\n\nFor California residents (CCPA), the additional right applies to: request disclosure of the categories and specific personal data collected, used or shared; request deletion; opt-out of sale of data (we do not sell data); not be discriminated against for exercising these rights.\n\nRequests will be responded to within 15 (fifteen) business days, extendable once for the same period, per Art. 19 of the LGPD.",
  },
  {
    id: "privacidade-6",
    title_pt: "6. Cookies",
    title_en: "6. Cookies",
    text_pt:
      "Cookies são pequenos arquivos de texto enviados pela Plataforma para o seu dispositivo e que ficam armazenados no navegador. Utilizamos cookies para proporcionar a melhor experiência possível, sendo classificados como:\n\nCookies estritamente necessários: indispensáveis para o funcionamento básico da Plataforma, autenticação de sessão, segurança e navegação. Não podem ser desativados, pois sem eles a Plataforma não funcionará adequadamente.\n\nCookies de desempenho e analytics: coletam informações anônimas sobre como os Usuários navegam e utilizam a Plataforma (páginas mais acessadas, tempo de permanência, erros), permitindo melhorias contínuas.\n\nCookies de funcionalidade: armazenam preferências do Usuário (idioma, região, modo de exibição, lembretes de login) para personalizar a experiência entre sessões.\n\nCookies de marketing: utilizados apenas se você autorizar, para exibir anúncios relevantes e medir o desempenho de campanhas fora da Plataforma.\n\nVocê pode gerenciar ou revogar o consentimento a qualquer momento através das configurações do seu navegador ou da área de preferências da Plataforma. A desativação de cookies não essenciais pode afetar algumas funcionalidades.",
    text_en:
      "Cookies are small text files sent by the Platform to your device and stored on your browser. We use cookies to deliver the best possible experience, classified as follows:\n\nStrictly necessary cookies: indispensable for basic Platform operation, session authentication, security and navigation. They cannot be disabled, as without them the Platform would not work properly.\n\nPerformance and analytics cookies: collect anonymous information about how Users navigate and use the Platform (most visited pages, time spent, errors), enabling continuous improvements.\n\nFunctionality cookies: store User preferences (language, region, display mode, login reminders) to personalize experience between sessions.\n\nMarketing cookies: only used if you authorize them, to display relevant ads and measure campaign performance outside the Platform.\n\nYou can manage or withdraw consent at any time through your browser settings or the Platform preferences area. Disabling non-essential cookies may affect some functionalities.",
  },
  {
    id: "privacidade-7",
    title_pt: "7. Contato e Encarregado (DPO)",
    title_en: "7. Contact and DPO",
    text_pt:
      "Para dúvidas, reclamações, solicitações de exercício de direitos ou qualquer comunicação relativa à proteção de dados pessoais, entre em contato conosco pelos canais abaixo:\n\nE-mail: nathramos@exemplo.com\n\nEndereço: —\n\nNosso Encarregado de Tratamento de Dados Pessoais (DPO) designado está disponível para atendimento nos mesmos canais, garantindo a comunicação entre a Controladora, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD).\n\nReservamo-nos o direito de atualizar esta Política de Privacidade periodicamente. Quando houver alterações materiais que possam reduzir seus direitos ou alterar significativamente o tratamento de seus dados, você será avisado por meio de comunicação destacada na Plataforma ou por e-mail.\n\nA versão vigente desta Política é sempre a publicada nesta página, indicada pela data de última atualização no topo.",
    text_en:
      "For questions, complaints, rights exercise requests or any communication regarding personal data protection, contact us through the channels below:\n\nEmail: nathramos@example.com\n\nAddress: —\n\nOur appointed Data Protection Officer (DPO) is available at the same channels, ensuring communication between the Controller, data subjects and the Brazilian National Data Protection Authority (ANPD).\n\nWe reserve the right to update this Privacy Policy periodically. When there are material changes that may reduce your rights or significantly alter data processing, you will be notified via a prominent notice on the Platform or by email.\n\nThe current version of this Policy is always the one published on this page, indicated by the last updated date at the top.",
  },
]

type FaqSeed = { categoryPt: string; categoryEn: string; qPt: string; qEn: string; aPt: string; aEn: string }

const faqSeeds: FaqSeed[] = [
  {
    categoryPt: "Geral",
    categoryEn: "General",
    qPt: "Como funciona o acompanhamento da Nath Ramos?",
    qEn: "How does Nath Ramos coaching work?",
    aPt: "Oferecemos acompanhamento fitness personalizado 100% online. Após o cadastro e assinatura, você preenche uma avaliação completa e Nath Ramos monta seus treinos, dieta e plano de suplementação de acordo com seus objetivos, biotipo e disponibilidade.",
    aEn: "We offer 100% online personalized fitness coaching. After signing up, you complete a comprehensive assessment and Nath Ramos designs your workouts, diet and supplementation plan based on your goals, body type and availability.",
  },
  {
    categoryPt: "Geral",
    categoryEn: "General",
    qPt: "Quais são os objetivos que a plataforma atende?",
    qEn: "Which goals does the platform support?",
    aPt: "Atendemos todos os objetivos: hipertrofia (ganho de massa muscular), emagrecimento e perda de gordura, definição muscular, melhora do condicionamento físico, reeducação alimentar, e qualidade de vida para iniciantes e avançados.",
    aEn: "We support all goals: hypertrophy (muscle gain), fat loss, muscle definition, improved fitness, nutritional education, and quality of life for beginners and advanced athletes alike.",
  },
  {
    categoryPt: "Planos",
    categoryEn: "Plans",
    qPt: "Qual a diferença entre os planos Essencial, Transformação e Elite?",
    qEn: "What is the difference between Essential, Transformation and Elite plans?",
    aPt: "O Essencial inclui treinos e dietas personalizadas + acompanhamento de hidratação, sono e peso. O Transformação adiciona guia de suplementação e e-books exclusivos. O Elite é o mais completo, com mentoria individual 1:1, análise de exames laboratoriais e suporte prioritário.",
    aEn: "Essential includes personalized workouts & diets plus hydration, sleep and weight tracking. Transformation adds a supplementation guide and exclusive e-books. Elite is the most complete, with 1:1 individual mentoring, lab exam analysis and priority support.",
  },
  {
    categoryPt: "Planos",
    categoryEn: "Plans",
    qPt: "Posso trocar de plano depois de assinar?",
    qEn: "Can I switch plans after subscribing?",
    aPt: "Sim, você pode fazer upgrade ou downgrade do plano a qualquer momento. O ajuste proporcional é calculado automaticamente e refletido na próxima fatura.",
    aEn: "Yes, you can upgrade or downgrade your plan at any time. The prorated adjustment is calculated automatically and reflected on your next invoice.",
  },
  {
    categoryPt: "Planos",
    categoryEn: "Plans",
    qPt: "Os planos têm fidelidade ou multa de cancelamento?",
    qEn: "Do plans have lock-in periods or cancellation fees?",
    aPt: "Não. Todos os planos são mensais e sem fidelidade. Você pode cancelar quando quiser, sem multas ou taxas adicionais. O acesso permanece até o fim do período pago.",
    aEn: "No. All plans are monthly with no lock-in. You can cancel anytime without penalties or additional fees. Access remains active until the end of the paid period.",
  },
  {
    categoryPt: "Treinos",
    categoryEn: "Workouts",
    qPt: "Os treinos são atualizados com que frequência?",
    qEn: "How often are workouts updated?",
    aPt: "Os treinos são revisados e atualizados a cada 4 a 8 semanas, dependendo do seu progresso e adaptação. No plano Elite, Nath ajusta semanalmente conforme feedback e evolução.",
    aEn: "Workouts are reviewed and updated every 4 to 8 weeks, depending on your progress and adaptation. On the Elite plan, Nath adjusts them weekly based on your feedback and evolution.",
  },
  {
    categoryPt: "Treinos",
    categoryEn: "Workouts",
    qPt: "Não tenho acesso a academia. Posso treinar em casa?",
    qEn: "I don't have a gym membership. Can I train at home?",
    aPt: "Claro. Na avaliação inicial você informa o tipo de equipamento disponível (nenhum, halteres, banco, barra ou academia completa) e montamos treinos adequados à sua realidade, seja em casa ou academia.",
    aEn: "Absolutely. In the initial assessment you inform the equipment you have available (none, dumbbells, bench, barbell or full gym) and we build workouts suited to your reality, whether home or gym-based.",
  },
  {
    categoryPt: "Dietas",
    categoryEn: "Diets",
    qPt: "A dieta leva em conta minhas restrições e preferências alimentares?",
    qEn: "Does the diet consider my restrictions and food preferences?",
    aPt: "Sim, 100%. Você informa alergias, intolerâncias (lactose, glúten etc.), vegetarianismo/veganismo, aversões e alimentos preferidos. Toda a dieta é montada respeitando suas individualidades.",
    aEn: "Yes, 100%. You inform allergies, intolerances (lactose, gluten, etc.), vegetarian/vegan diets, food aversions and favorite foods. The entire meal plan is built respecting your individuality.",
  },
  {
    categoryPt: "Dietas",
    categoryEn: "Diets",
    qPt: "Como funciona a lista de compras?",
    qEn: "How does the shopping list feature work?",
    aPt: "A partir do plano alimentar, a plataforma gera automaticamente uma lista de compras organizada por categorias de supermercado. Você pode marcar itens como comprados e ajustar quantidades conforme necessidade.",
    aEn: "From your meal plan, the platform automatically generates a shopping list organized by supermarket categories. You can mark items as purchased and adjust quantities as needed.",
  },
  {
    categoryPt: "Mentoria",
    categoryEn: "Mentoring",
    qPt: "Como funciona a mentoria individual do plano Elite?",
    qEn: "How does the Elite plan individual mentoring work?",
    aPt: "No plano Elite você tem encontros semanais ou quinzenais (via videochamada) com Nath Ramos para alinhar estratégia, tirar dúvidas, analisar evolução física, ajustar treinos/dieta e manter motivação. Além de suporte prioritário via WhatsApp.",
    aEn: "On the Elite plan you have weekly or bi-weekly video calls with Nath Ramos to align strategy, answer questions, analyze physical evolution, adjust workouts/diet and stay motivated. Plus priority WhatsApp support.",
  },
  {
    categoryPt: "Pagamentos",
    categoryEn: "Payments",
    qPt: "Quais formas de pagamento são aceitas?",
    qEn: "Which payment methods are accepted?",
    aPt: "Aceitamos cartões de crédito das principais bandeiras (Visa, Mastercard, Elo, Amex, Hipercard), Pix e boleto bancário. Assinaturas recorrentes funcionam com cartão ou Pix automático.",
    aEn: "We accept major credit cards (Visa, Mastercard, Elo, Amex, Hipercard), Pix (Brazil) and bank slips. Recurring subscriptions work with card or automatic Pix.",
  },
  {
    categoryPt: "Pagamentos",
    categoryEn: "Payments",
    qPt: "A assinatura renova automaticamente?",
    qEn: "Does the subscription renew automatically?",
    aPt: "Sim, a assinatura é recorrente e renova todo mês no mesmo dia da contratação. Você pode desativar a renovação automática na sua área de conta a qualquer momento.",
    aEn: "Yes, the subscription is recurring and renews every month on the same day as purchase. You can disable auto-renewal in your account area at any time.",
  },
  {
    categoryPt: "Técnico",
    categoryEn: "Technical",
    qPt: "A plataforma funciona em celular e tablet?",
    qEn: "Does the platform work on mobile and tablet?",
    aPt: "Sim, o site é 100% responsivo e funciona perfeitamente em smartphones, tablets e computadores. Recomendamos adicionar à tela inicial para uma experiência de app nativo (PWA).",
    aEn: "Yes, the website is 100% responsive and works perfectly on smartphones, tablets and computers. We recommend adding to the home screen for a native app-like experience (PWA).",
  },
  {
    categoryPt: "Técnico",
    categoryEn: "Technical",
    qPt: "Meus dados pessoais e médicos estão seguros?",
    qEn: "Are my personal and medical data secure?",
    aPt: "Totalmente. Usamos criptografia de ponta a ponta, servidores seguros da Supabase e seguimos rigorosamente a LGPD (Lei Geral de Proteção de Dados). Seus dados nunca são compartilhados com terceiros sem sua autorização.",
    aEn: "Absolutely. We use end-to-end encryption, secure Supabase servers and strictly follow GDPR/CCPA data protection laws. Your data is never shared with third parties without your explicit consent.",
  },
]

const faqBlocks: ContentPageBlock[] = faqSeeds.map((seed, index) => ({
  id: `faq-${index + 1}`,
  title_pt: seed.qPt,
  title_en: seed.qEn,
  subtitle_pt: seed.categoryPt,
  subtitle_en: seed.categoryEn,
  text_pt: seed.aPt,
  text_en: seed.aEn,
}))

export const DEFAULT_CONTENT_PAGES: Record<ContentPageSlugT, DefaultContentPage> = {
  termos: {
    slug: "termos",
    titlePt: "Termos de Uso",
    titleEn: "Terms of Service",
    subtitlePt: "",
    subtitleEn: "",
    blocks: termosBlocks,
  },
  privacidade: {
    slug: "privacidade",
    titlePt: "Política de Privacidade",
    titleEn: "Privacy Policy",
    subtitlePt: "",
    subtitleEn: "",
    blocks: privacidadeBlocks,
  },
  faq: {
    slug: "faq",
    titlePt: "Perguntas Frequentes",
    titleEn: "Frequently Asked Questions",
    subtitlePt: "Respostas para as dúvidas mais comuns",
    subtitleEn: "Answers to the most common questions",
    blocks: faqBlocks,
  },
}

export interface ResolvedContentBlock {
  id: string
  title: string
  subtitle: string
  text: string
  imageUrl: string
  buttonLabel: string
  buttonUrl: string
}

export interface ResolvedContentPage {
  title: string
  subtitle: string
  imageUrl: string
  ctaLabel: string
  ctaUrl: string
  blocks: ResolvedContentBlock[]
}

function pick(pt: string | null | undefined, en: string | null | undefined, locale: string): string {
  const isPt = locale.startsWith("pt")
  const primary = isPt ? pt : en
  const secondary = isPt ? en : pt
  return (primary ?? secondary ?? "").trim()
}

/**
 * Combina o conteúdo salvo no banco com o conteúdo padrão.
 * Campos vazios no banco caem para o padrão; se a página não existir no banco,
 * o padrão é usado integralmente.
 */
export function resolveContentPage(
  row: ContentPageRow | null,
  fallback: DefaultContentPage,
  locale: string
): ResolvedContentPage {
  const sourceBlocks = row && row.blocks.length > 0 ? row.blocks : fallback.blocks
  const blocks = sourceBlocks.map((block) => ({
    id: block.id,
    title: pick(block.title_pt, block.title_en, locale),
    subtitle: pick(block.subtitle_pt, block.subtitle_en, locale),
    text: pick(block.text_pt, block.text_en, locale),
    imageUrl: (block.image_url ?? "").trim(),
    buttonLabel: pick(block.button_label_pt, block.button_label_en, locale),
    buttonUrl: (block.button_url ?? "").trim(),
  }))

  return {
    title: pick(row?.title_pt, row?.title_en, locale) || pick(fallback.titlePt, fallback.titleEn, locale),
    subtitle: pick(row?.subtitle_pt, row?.subtitle_en, locale) || pick(fallback.subtitlePt, fallback.subtitleEn, locale),
    imageUrl: (row?.image_url ?? "").trim(),
    ctaLabel: pick(row?.cta_label_pt, row?.cta_label_en, locale),
    ctaUrl: (row?.cta_url ?? "").trim(),
    blocks,
  }
}
