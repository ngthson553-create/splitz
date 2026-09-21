/**
 * Chuỗi dùng lại ở nhiều màn: nút, nhãn trạng thái, lỗi chung.
 *
 * KHÔNG dùng `as const`: kiểu literal sẽ bắt bản tiếng Anh phải trùng đúng
 * chữ tiếng Việt. Cần suy ra `string` để `en: typeof vi` chỉ soát key + chữ ký.
 */
export const common = {
  save: 'Lưu',
  cancel: 'Huỷ',
  close: 'Đóng',
  delete: 'Xoá',
  edit: 'Sửa',
  back: 'Quay lại',
  retry: 'Thử lại',
  confirm: 'Xác nhận',
  loading: 'Đang tải…',
  done: 'Xong',
  add: 'Thêm',
  search: 'Tìm kiếm',
  copy: 'Sao chép',
  copied: 'Đã sao chép',
  share: 'Chia sẻ',
  you: 'Bạn',
  optional: 'Không bắt buộc',
  somethingWentWrong: 'Có lỗi xảy ra',
  networkError: 'Mất kết nối tới máy chủ.',
  notFound: 'Không tìm thấy trang',
}
