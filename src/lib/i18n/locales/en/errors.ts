import type { errors as vi } from '../vi/errors'

export const errors: typeof vi = {
  invalidAmount: 'That amount is not valid.',
  balancesMustSumToZero: 'Balances must sum to zero.',
  expenseOutdated: 'This expense was just updated. Please reload.',
}
