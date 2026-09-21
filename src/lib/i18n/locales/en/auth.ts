import type { vi } from '../vi'

export const auth: typeof vi.auth = {
  // Sign-in screen
  tagline: 'Smart group expense splitting — transparent, fast, with instant transfer QR codes.',
  continueWithGoogle: 'Continue with Google',
  continueWithZalo: 'Continue with Zalo',
  comingSoon: 'Coming soon',
  agreePrefix: 'By signing in, you agree to the',
  agreeAnd: 'and',
  agreeSuffix: 'of Splitz.',
  termsLink: 'Terms of Service',
  privacyLink: 'Privacy Policy',
  signInFailed: 'Sign in failed.',
  zaloSignInFailed: 'Zalo sign in failed.',

  // Onboarding — consent step
  welcomeTitle: 'Welcome to Splitz',
  welcomeDesc: 'Before you start, please read and accept our terms.',
  consentPrefix: 'By tapping "I agree", you confirm that you have read and accepted the',
  consentAnd: 'and',
  consentDisclaimer:
    'Splitz is a tool for recording and calculating shared expenses. Splitz does not hold money and does not process payments — all bank transfers are made by you directly through your bank.',
  agreeContinue: 'I agree & continue',

  // Onboarding — name step
  nameTitle: "What's your name?",
  nameDesc: 'This name is shown to other members in your groups. You can change it later.',
  displayNameLabel: 'Display name',
  namePlaceholder: 'e.g. John Smith',
  nameRequired: 'Enter your display name.',
  avatarError: 'Could not process the image.',

  // Onboarding — bank step
  bankTitle: 'Payout account',
  bankDesc:
    'Required — so friends can create transfer QR codes for you right inside the group. You can scan a bank QR code to fill it in quickly.',
  bankRequired: 'Complete your bank details so others can transfer money to you.',

  // Onboarding — tour step & shared buttons
  continueLabel: 'Continue',
  readyTitle: "You're all set!",
  readyDesc: 'A few things Splitz can help you with:',
  tour1Title: 'Create groups & invite friends',
  tour1Desc: 'Via link, group code, or by adding members manually.',
  tour2Title: 'Log expenses & split automatically',
  tour2Desc: 'Equally, by shares, by percentage, or per item.',
  tour3Title: 'Simplify debts & QR codes',
  tour3Desc: 'Fewest transfers needed, with instant payment QR codes.',
  startButton: 'Start using Splitz',
  profileSaveFailed: 'Could not save your profile.',

  // Zalo callback — working state
  verifyingWithZalo: 'Verifying with Zalo…',

  // Zalo callback — email step
  emailVerifyTitle: 'Verify your email',
  emailVerifyDesc:
    'To identify your account, use Google (fastest) or enter an email address to receive a verification code.',
  orUseEmail: 'or use email',
  emailLabel: 'Email',
  sendCode: 'Send verification code',
  emailRequired: 'Enter your email address.',
  otpSent: 'A verification code has been sent to your email.',
  codeSendFailed: 'Could not send the code.',
  otpSendHint: "Couldn't send the code. Tap “Resend code” or use a different email.",
  googleLinkFailed: 'Google linking failed.',
  googleOpenFailed: 'Could not open Google sign in.',

  // Zalo callback — OTP step
  otpTitle: 'Enter OTP code',
  otpDesc: (p: { email: string }) =>
    `The verification code was sent to ${p.email}. Enter it to finish.`,
  yourEmail: 'your email',
  otpLabel: 'OTP code',
  otpPlaceholder: 'e.g. 123456',
  otpRequired: 'Enter the OTP code.',
  verifyAndSignIn: 'Confirm & sign in',
  verifyFailed: 'Verification failed.',
  changeEmail: 'Use a different email',

  // Zalo callback — errors
  cancelledOrNoCode: 'You cancelled, or Zalo did not return a login code.',
  signInFailedTitle: 'Sign in failed',
  backToLogin: 'Back to sign in',

  // Email + password sign-in (self-host only, behind a flag)
  // emailLabel reuses the existing key from the Zalo OTP step above.
  emailPlaceholder: 'you@email.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  signInButton: 'Sign in',
  signUpButton: 'Create account',
  noAccountSwitch: "No account yet? Create one",
  hasAccountSwitch: 'Already have an account? Sign in',
  passwordTooShort: 'Password needs at least 6 characters.',
  emailInvalid: 'Invalid email address.',
  checkEmailToConfirm: 'Check your email to confirm your account before signing in.',

}
