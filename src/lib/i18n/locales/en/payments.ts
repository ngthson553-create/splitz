import type { vi } from '../vi'

export const payments: typeof vi.payments = {
  // ── Method picker ──
  methodLabel: 'Payout method',
  methodHint: 'Pick how you get paid — Splitz generates the QR in each country’s own standard.',
  railVietqr: 'Vietnamese bank (VietQR)',
  railVietqrHint: 'Scannable by every Vietnamese banking app',
  railSepa: 'SEPA / IBAN (Europe)',
  railSepaHint: 'Scannable by Euro-zone banking apps (GiroCode)',
  railUpi: 'UPI (India)',
  railUpiHint: 'GPay, PhonePe, Paytm…',
  railPromptpay: 'PromptPay (Thailand)',
  railPromptpayHint: 'Every Thai banking app',
  railPix: 'Pix (Brazil)',
  railPixHint: 'Pix key — every Brazilian banking app',
  railHandle: 'Other — link / handle',
  railHandleHint: 'US, UK, Japan…: PayPal, Venmo, PayID, Zelle…',

  // ── Shared fields ──
  nameOnAccount: 'Name on account',
  nameOnAccountPlaceholder: 'NGUYEN VAN A',

  // ── SEPA ──
  ibanLabel: 'IBAN',
  bicShort: 'BIC / SWIFT',
  ibanPlaceholder: 'DE89 3704 0044 0532 0130 00',
  bicLabel: 'BIC / SWIFT (optional)',
  bicPlaceholder: 'COBADEFFXXX',

  // ── UPI ──
  vpaLabel: 'UPI ID (VPA)',
  vpaPlaceholder: 'name@okaxis',

  // ── PromptPay ──
  promptpayProxyType: 'ID type',
  promptpayPhone: 'Phone number',
  promptpayNationalId: 'National ID (13 digits)',
  promptpayValueLabel: 'PromptPay ID',
  promptpayPlaceholder: '0812345678 or 1-1101-1101-1101',

  // ── Pix ──
  pixKeyLabel: 'Pix key',
  pixKeyPlaceholder: 'CPF, email, phone number or random key',
  pixCityLabel: 'City (optional)',
  pixCityPlaceholder: 'SAO PAULO',

  // ── Handle ──
  handleLabelField: 'Display label',
  handleLabelPlaceholder: 'PayPal, Venmo, PayID…',
  handleValueField: 'Link or handle',
  handleValuePlaceholder: 'https://paypal.me/your-name',
  handleHint:
    'A link (PayPal.Me, Venmo, Revolut…) becomes a QR code; a plain handle is shown with a copy button.',

  // ── Payment sheet ──
  amountNotInQr:
    'The QR prefills the recipient — enter the amount shown above in your banking app.',
  openLink: 'Open link',
  copyValue: 'Copy',
  proxyPhone: 'Phone number',
  proxyNationalId: 'National ID',

  // ── Validation ──
  methodRequired: 'Complete your payout info to continue.',
  ibanInvalid: 'Invalid IBAN (16–34 characters, starts with a country code).',
  vpaInvalid: 'A UPI ID looks like name@provider.',
}
