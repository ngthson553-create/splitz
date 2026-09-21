import type { format as vi } from '../vi/format'

export const format: typeof vi = {
  // Tiền vẫn là đồng Việt Nam — chỉ dùng ký hiệu quốc tế ₫ thay chữ "đ".
  currencySuffix: '₫',
  millionSuffix: 'M',
  thousandSuffix: 'k',
  decimalMark: '.',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: (p: { count: number }) => `${p.count} day${p.count === 1 ? '' : 's'} ago`,
}
