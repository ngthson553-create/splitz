import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <PageTransition>
      <div className="px-5 pt-6 pb-24 max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label="Quay lại" className="press grid place-items-center h-10 w-10 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-muted hover:text-app">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-app">{title}</h1>
        </header>
        <div className="space-y-4 text-sm text-muted leading-relaxed">{children}</div>
      </div>
    </PageTransition>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-bold text-app mt-6 first:mt-0">{children}</h2>
}

export function TermsScreen() {
  return (
    <LegalShell title="Điều khoản sử dụng">
      <p className="text-xs text-faint">Cập nhật lần cuối: 06/2026</p>
      <H>1. Giới thiệu dịch vụ</H>
      <p>
        Splitz là ứng dụng hỗ trợ ghi chép, tính toán và chia sẻ chi phí trong nhóm. Splitz cung cấp
        công cụ tạo mã QR chuyển khoản theo chuẩn VietQR/Napas dựa trên thông tin bạn nhập.
      </p>
      <H>2. Splitz không xử lý thanh toán</H>
      <p>
        Splitz <strong>không giữ tiền, không trung gian thanh toán</strong>. Mọi giao dịch chuyển
        khoản do bạn tự thực hiện trực tiếp qua ngân hàng. Splitz không chịu trách nhiệm với sai sót
        chuyển khoản do thông tin tài khoản nhập sai.
      </p>
      <H>3. Tài khoản người dùng</H>
      <p>
        Bạn đăng nhập bằng tài khoản Google (và các phương thức khác trong tương lai). Email là danh
        tính duy nhất của bạn. Bạn chịu trách nhiệm bảo mật tài khoản của mình.
      </p>
      <H>4. Trách nhiệm của người dùng</H>
      <p>
        Bạn cam kết nhập thông tin chính xác, không sử dụng Splitz cho mục đích vi phạm pháp luật,
        và tôn trọng quyền riêng tư của các thành viên khác trong nhóm.
      </p>
      <H>5. Gói dịch vụ & thanh toán</H>
      <p>
        Splitz cung cấp gói miễn phí và các gói trả phí (Cá nhân, Team). Chi tiết quyền lợi và giới
        hạn từng gói được hiển thị trong ứng dụng. Thanh toán xử lý qua đối tác PayOS.
      </p>
      <H>6. Thay đổi điều khoản</H>
      <p>
        Splitz có thể cập nhật điều khoản này. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn
        chấp thuận các thay đổi.
      </p>
    </LegalShell>
  )
}

export function PrivacyScreen() {
  return (
    <LegalShell title="Chính sách bảo mật">
      <p className="text-xs text-faint">Cập nhật lần cuối: 06/2026</p>
      <H>1. Thông tin chúng tôi thu thập</H>
      <p>
        Khi đăng nhập, chúng tôi nhận email, tên hiển thị và ảnh đại diện từ nhà cung cấp (Google).
        Bạn cung cấp thêm thông tin tài khoản ngân hàng (ngân hàng, số tài khoản, tên chủ tài khoản)
        để tạo mã QR nhận tiền.
      </p>
      <H>2. Cách chúng tôi sử dụng thông tin</H>
      <p>
        Thông tin được dùng để vận hành dịch vụ chia tiền: hiển thị bạn trong nhóm, tạo mã QR chuyển
        khoản, và tính toán công nợ. Chúng tôi không bán dữ liệu cá nhân của bạn.
      </p>
      <H>3. Thông tin tài khoản ngân hàng</H>
      <p>
        Số tài khoản ngân hàng của bạn chỉ hiển thị cho các thành viên trong cùng nhóm với bạn — đây
        là thông tin cần thiết để họ chuyển tiền. Chúng tôi áp dụng kiểm soát truy cập (RLS) để giới
        hạn phạm vi hiển thị.
      </p>
      <H>4. Lưu trữ dữ liệu</H>
      <p>
        Dữ liệu được lưu trên hạ tầng đám mây (Supabase) tại khu vực Đông Nam Á. Phiên đăng nhập và
        khoá xác thực được bảo vệ bởi nhà cung cấp xác thực.
      </p>
      <H>5. Quyền của bạn</H>
      <p>
        Bạn có quyền truy cập, chỉnh sửa và yêu cầu xoá dữ liệu cá nhân. Khi xoá tài khoản, dữ liệu
        cá nhân của bạn sẽ được xoá hoặc ẩn danh, đồng thời vẫn bảo toàn tính toàn vẹn lịch sử nhóm
        của các thành viên khác.
      </p>
      <H>6. Liên hệ</H>
      <p>Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ qua trang hỗ trợ trong ứng dụng.</p>
    </LegalShell>
  )
}
