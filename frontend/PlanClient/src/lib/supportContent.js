export const SUPPORT_EMAIL = 'nduryamuhammad6@gmail.com';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('PlanSoko support request')}`;

export const helpFaqs = [
  {
    id: 'payment',
    question: 'What should I do if my M-Pesa payment is pending?',
    answer: 'Keep your order reference and wait for server confirmation. Do not pay again while the payment is pending or its confirmation is delayed. If the status does not resolve, email support with the order reference and the problem you saw.',
  },
  {
    id: 'downloads',
    question: 'Why can’t I download a purchased plan?',
    answer: 'Downloads are enabled only after the server confirms payment and the purchased file grant is available. If your guest session has expired or a file is temporarily unavailable, email support with your order reference. Never send an M-Pesa PIN, OTP, password or download token.',
  },
  {
    id: 'licensing',
    question: 'Where can I ask about plan licensing?',
    answer: 'Review the plan listing and its included files before purchasing. For a licensing question or unclear inclusion, email support before relying on the plan for a project. Approved policy pages will be linked when they are available.',
  },
  {
    id: 'designer-review',
    question: 'How should I evaluate a designer listing?',
    answer: 'Review the designer information, plan description, preview and package contents shown on the listing. If important information is missing or appears inconsistent, email support with the listing link before purchasing.',
  },
];

export const manualRecoverySteps = [
  'Email support with your order reference, the email or phone number used at checkout, and a short description of the problem.',
  'Do not include passwords, M-Pesa PINs, one-time passwords or download tokens.',
  'Support checks the order, payment confirmation and download entitlement on the server before giving access guidance.',
  'If payment is not server-confirmed, support cannot promise paid-file access; keep the reference for follow-up.',
];
