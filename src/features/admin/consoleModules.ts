import {
  Activity,
  Bell,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type ConsoleModuleGroup = 'Vận hành' | 'Tăng trưởng' | 'Cấu hình' | 'Kiểm soát'

export type ConsoleModule = {
  id: string
  slug: string
  label: string
  group: ConsoleModuleGroup
  summary: string
  icon: LucideIcon
  bullets: string[]
}

export const consoleModules: ConsoleModule[] = [
  {
    id: 'health',
    slug: 'health',
    label: 'Dashboard vận hành',
    group: 'Vận hành',
    summary: 'Supabase, Edge Functions, Resend, AI, PayOS, tác vụ gần nhất và lỗi gần đây.',
    icon: Activity,
    bullets: ['Thẻ sức khỏe', 'Kiểm tra nhà cung cấp', 'Tác vụ gần nhất', 'Lỗi gần đây'],
  },
  {
    id: 'notifications',
    slug: 'notifications',
    label: 'Thông báo hệ thống',
    group: 'Vận hành',
    summary: 'Gửi in-app/web push, xem trước, lên lịch, retry và log gửi.',
    icon: Bell,
    bullets: ['Gửi ngay', 'Lên lịch', 'Chọn user/nhóm/gói', 'Xem trước + xác nhận'],
  },
  {
    id: 'jobs',
    slug: 'jobs',
    label: 'Lịch chạy',
    group: 'Vận hành',
    summary: 'Theo dõi tác vụ đã chạy, sắp chạy, trạng thái và lỗi gần đây.',
    icon: Clock,
    bullets: ['Đang chờ/đang chạy/đã xong/lỗi', 'Chi tiết chỉ đọc', 'Retry/cancel khóa'],
  },
  {
    id: 'redeem',
    slug: 'redeem',
    label: 'Mã Premium',
    group: 'Tăng trưởng',
    summary: 'Tạo code đơn lẻ/batch, chiến dịch, tra cứu, thu hồi và lịch sử dùng.',
    icon: Ticket,
    bullets: ['Code đơn lẻ/batch', 'Prefix chiến dịch', 'Thu hồi code', 'Lịch sử dùng'],
  },
  {
    id: 'billing',
    slug: 'billing',
    label: 'Thanh toán / Premium',
    group: 'Tăng trưởng',
    summary: 'Theo dõi gói Premium, đơn thanh toán, PayOS webhook và trạng thái user.',
    icon: CreditCard,
    bullets: ['Gói Premium', 'Đơn thanh toán', 'Sức khỏe webhook', 'Cấp thủ công có audit'],
  },
  {
    id: 'ai',
    slug: 'ai',
    label: 'Điều hành AI',
    group: 'Cấu hình',
    summary: 'Bật/tắt AI, quota, model/nhà cung cấp, prompt template và test parser/OCR/insight.',
    icon: Sparkles,
    bullets: ['Cờ tính năng', 'Quota', 'Nhà cung cấp/model', 'Kết quả test đã lọc'],
  },
  {
    id: 'email',
    slug: 'email',
    label: 'Email / Resend',
    group: 'Cấu hình',
    summary: 'Kiểm tra Resend, gửi test email, template và lỗi gửi.',
    icon: Mail,
    bullets: ['Sức khỏe Resend', 'Test email', 'Template', 'Lỗi gửi'],
  },
  {
    id: 'config',
    slug: 'config',
    label: 'Cài đặt hệ thống',
    group: 'Cấu hình',
    summary: 'Cờ tính năng, kill switch, banner bảo trì và giới hạn gói.',
    icon: SlidersHorizontal,
    bullets: ['Cờ tính năng', 'Giới hạn gói', 'Bảo trì', 'Chế độ duyệt'],
  },
  {
    id: 'support',
    slug: 'support',
    label: 'Hỗ trợ user / nhóm',
    group: 'Kiểm soát',
    summary: 'Màn hỗ trợ chỉ đọc cho user, nhóm, Premium, redeem và lượt dùng AI.',
    icon: Users,
    bullets: ['Tra user', 'Vai trò trong nhóm', 'Premium', 'Ưu tiên chỉ đọc'],
  },
  {
    id: 'admin-access',
    slug: 'admin-access',
    label: 'Quyền admin',
    group: 'Kiểm soát',
    summary: 'Quản lý người có quyền vào console, vai trò, trạng thái và audit bắt buộc.',
    icon: ShieldCheck,
    bullets: ['Owner-only', 'Role/status', 'Audit bắt buộc', 'Không thao tác SQL'],
  },
  {
    id: 'releases',
    slug: 'releases',
    label: 'Thông báo phiên bản',
    group: 'Kiểm soát',
    summary: 'Soạn thông báo trong app và gắn với chiến dịch notification.',
    icon: FileText,
    bullets: ['Nháp/xuất bản', 'Xem trước', 'Liên kết chiến dịch'],
  },
  {
    id: 'data-quality',
    slug: 'data-quality',
    label: 'Kiểm tra dữ liệu',
    group: 'Kiểm soát',
    summary: 'Bộ quét phát hiện dữ liệu bất thường, cleanup chỉ sau khi có rule.',
    icon: Search,
    bullets: ['Bộ quét chỉ đọc', 'Danh sách lỗi', 'Dry-run trước cleanup'],
  },
  {
    id: 'audit',
    slug: 'audit',
    label: 'Lịch sử thao tác',
    group: 'Kiểm soát',
    summary: 'Lịch sử thao tác admin, payload đã redact, trạng thái và lỗi.',
    icon: Shield,
    bullets: ['Người thao tác/action/thời gian', 'Tóm tắt payload', 'Thành công/thất bại', 'Bộ lọc'],
  },
]

export const consoleModuleGroups: ConsoleModuleGroup[] = ['Vận hành', 'Tăng trưởng', 'Cấu hình', 'Kiểm soát']

export function pathForConsoleModule(module: ConsoleModule): string {
  return `/console/${module.slug}`
}
