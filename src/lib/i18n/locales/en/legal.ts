import type { vi } from '../vi'

export const legal: typeof vi.legal = {
  back: 'Back',

  // ── Terms of Service ──
  termsTitle: 'Terms of Service',
  lastUpdated: 'Last updated: 06/2026',

  termsH1: '1. About the service',
  termsP1:
    'Splitz is an application for recording, calculating and sharing expenses within a group. Splitz provides a tool for generating money-transfer QR codes compliant with the VietQR/Napas standards, based on the information you enter.',
  termsH2: '2. Splitz does not process payments',
  termsP2A: 'Splitz ',
  termsP2Strong: 'does not hold funds and does not act as a payment intermediary',
  termsP2B:
    '. All bank transfers are carried out by you directly through your bank. Splitz shall not be liable for transfer errors arising from account details entered incorrectly.',
  termsH3: '3. User accounts',
  termsP3:
    'You sign in with a Google account (and other methods in the future). Your email address is your sole identity. You are responsible for keeping your account secure.',
  termsH4: '4. User responsibilities',
  termsP4:
    'You undertake to enter accurate information, not to use Splitz for any purpose that violates the law, and to respect the privacy of other members in your groups.',
  termsH5: '5. Plans & payments',
  termsP5:
    'Splitz offers a free plan and paid plans (Personal, Team). The benefits and limits of each plan are displayed in the app. Payments are processed by our partner PayOS.',
  termsH6: '6. Changes to these terms',
  termsP6:
    'Splitz may update these terms. Continued use of the service after an update constitutes your acceptance of the changes.',

  // ── Privacy Policy ──
  privacyTitle: 'Privacy Policy',

  privacyH1: '1. Information we collect',
  privacyP1:
    'When you sign in, we receive your email address, display name and profile picture from the provider (Google). You additionally provide your bank account details (bank, account number, account holder name) to generate receiving QR codes.',
  privacyH2: '2. How we use your information',
  privacyP2:
    'This information is used to operate the expense-splitting service: showing you within groups, generating transfer QR codes, and calculating balances. We do not sell your personal data.',
  privacyH3: '3. Bank account information',
  privacyP3:
    'Your bank account number is visible only to members of the groups you belong to — it is required so that they can transfer money to you. We enforce access controls (RLS) to restrict its visibility.',
  privacyH4: '4. Data storage',
  privacyP4:
    'Data is stored on cloud infrastructure (Supabase) in the Southeast Asia region. Login sessions and authentication keys are protected by the authentication provider.',
  privacyH5: '5. Your rights',
  privacyP5:
    'You have the right to access, correct and request deletion of your personal data. When you delete your account, your personal data will be erased or anonymised, while preserving the integrity of other members’ group history.',
  privacyH6: '6. Contact',
  privacyP6: 'For any questions about privacy, please reach out via the support page in the app.',

  // ── FAQ ──
  faqTitle: 'FAQ',

  faqGroupStart: 'Getting started',
  faqStartQ1: 'What is Splitz?',
  faqStartA1:
    'Splitz is a group expense-splitting app: it records expenses, automatically works out who owes whom, simplifies shared debts and generates transfer QR codes. Splitz does not hold money and does not process payments.',
  faqStartQ2: 'How do I create a group and invite members?',
  faqStartA2:
    'Go to the Groups tab → Create group. In Group settings, create an invite link or a group code to share. Invitees tap the link or enter the code under “Join”.',
  faqStartQ3: 'What is a “placeholder” member?',
  faqStartA3:
    'A member who has only a name and no Splitz account yet — created quickly so you can log expenses right away. You can later invite them to “claim” that identity and manage their own account.',

  faqGroupSpend: 'Spending & settlement',
  faqSpendQ1: 'What splitting methods are available?',
  faqSpendA1: 'Equal split, manual amounts per person, percentages, shares, or per item (itemized).',
  faqSpendQ2: 'What is “double confirmation” at settlement?',
  faqSpendA2:
    'The payer taps “I’ve transferred” → the transaction is marked pending. Only when the recipient taps “Received” is the balance reduced. This prevents false markings.',
  faqSpendQ3: 'Why can’t I leave a group?',
  faqSpendA3:
    'You can only leave a group once it is fully settled (your balance is zero). Settle all outstanding debts first.',

  faqGroupPlans: 'Plans & payments',
  faqPlansQ1: 'What are the limits of the Free plan?',
  faqPlansA1:
    'Up to 3 groups and 8 members per group. Limits follow the GROUP OWNER’s plan. Upgrade to expand (Personal/Team: unlimited groups, 25 members per group).',
  faqPlansQ2: 'What happens when Premium expires?',
  faqPlansA2:
    'Existing data is kept intact and never deleted. You are only blocked from CREATING more once you exceed the Free plan limits, until you renew.',
  faqPlansQ3: 'What payment methods are supported?',
  faqPlansA3:
    'Via PayOS (QR/bank transfer). Renewal is semi-automatic: the app reminds you before expiry, and you pay each cycle yourself.',
  faqPlansQ4: 'I have an activation code — where do I enter it?',
  faqPlansA4: 'Settings → Upgrade to Premium → the “Have an activation code?” field.',

  faqGroupSafety: 'Safety & privacy',
  faqSafetyQ1: 'Does Splitz hold my money?',
  faqSafetyA1:
    'No. Splitz only records expenses and generates QR codes from the recipient’s account details. All transfers are made by you through your bank — always verify the recipient’s name before transferring.',
  faqSafetyQ2: 'Who can see my account number?',
  faqSafetyA2:
    'Only members of the groups you belong to (needed to create transfer QR codes). Real members’ account numbers are managed by the members themselves.',
}
