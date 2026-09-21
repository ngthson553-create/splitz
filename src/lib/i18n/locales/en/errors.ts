import type { errors as vi } from '../vi/errors'

export const errors: typeof vi = {
  invalidAmount: 'That amount is not valid.',
  balancesMustSumToZero: 'Balances must sum to zero.',
  expenseOutdated: 'This expense was just updated. Please reload.',

  rateFetchFailed: "Couldn't fetch the exchange rate.",
  rateInvalid: 'The exchange rate is not valid.',

  fileReadFailed: "Couldn't read the image file.",
  imageLoadFailed: "Couldn't load the image.",
  imageUnsupported: "Couldn't read this image. Try another JPG/PNG or retake it more clearly.",
  imageHeicUnsupported:
    "This HEIC/HEIF image can't be read on this device. Convert it to JPG/PNG or retake the photo.",

  notSignedIn: "You're not signed in.",
  accountMissingEmail: "This account has no email, so it can't be identified.",
  zaloNotConfigured: 'VITE_ZALO_APP_ID is not configured.',
  zaloSessionInvalid: 'The Zalo session is no longer valid. Please try again.',
  zaloStateMismatch: 'State mismatch (security check failed).',
  zaloProfileFailed: "Couldn't get your Zalo profile. Please try again.",
  zaloLinkSessionMissing: "Couldn't find the Zalo linking session. Please try again.",

  pushUnsupported: "Push notifications aren't supported or haven't been configured in this browser.",
  pushPermissionDenied: "You haven't allowed notifications.",

  unknownError: 'Unknown error.',
  paymentLinkFailed: "Couldn't create the payment link.",
  redeemCodeInvalid: 'This code is not valid.',
  signedUrlFailed: "Couldn't create the view link.",
  settlementNoProof: 'This settlement has no proof attached yet.',
  groupMissing: "This group doesn't exist.",
  remindSendFailed: "Couldn't send the reminder.",
  createdGroupMissing: "Couldn't load the group you just created.",
  createdSettlementIdMissing: "Couldn't get the ID of the settlement you just created.",

  parseFailed: "Couldn't parse this.",
  insightFailed: "Couldn't generate the insight.",
  ocrFailed: "Couldn't scan the receipt.",

  popupBlocked: 'Your browser blocked the window. Allow pop-ups to export the report.',
  qrNotFound: "Couldn't read a QR code in the image. Try a sharper photo.",
  qrNotBankQr: "This isn't a valid VietQR bank code.",
  qrBankUnknown: "Account number filled in. The bank couldn't be detected — please pick it manually.",
  qrScanFailed: 'QR scan failed. Please try again.',

  hookOutsideProvider: '{fn} must be used inside a {provider}.',

  supabaseNotConfigured:
    'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
}
