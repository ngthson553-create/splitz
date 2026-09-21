/**
 * Mảnh chữ đi kèm định dạng số/ngày. Sổ cái luôn là VND nên đơn vị tiền KHÔNG
 * đổi theo ngôn ngữ — chỉ ký hiệu và cách viết tắt là khác.
 */
export const format = {
  /** Hậu tố tiền: người Việt quen "đ", bản quốc tế dùng ký hiệu ₫. */
  currencySuffix: 'đ',
  /** Viết tắt hàng triệu / hàng nghìn trên thẻ thống kê. */
  millionSuffix: 'tr',
  thousandSuffix: 'k',
  /** Dấu thập phân của số rút gọn (1,25tr ở VN — 1.25M ở EN). */
  decimalMark: ',',
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  daysAgo: (p: { count: number }) => `${p.count} ngày trước`,
}
