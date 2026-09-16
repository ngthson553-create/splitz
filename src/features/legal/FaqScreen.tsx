import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'

type QA = { q: string; a: string }

const FAQS: { group: string; items: QA[] }[] = [
  {
    group: 'Bắt đầu',
    items: [
      { q: 'Splitz là gì?', a: 'Splitz là ứng dụng chia tiền nhóm: ghi khoản chi, tự tính ai nợ ai, rút gọn công nợ và tạo mã QR chuyển khoản. Splitz không giữ tiền và không xử lý thanh toán.' },
      { q: 'Tạo nhóm và mời thành viên thế nào?', a: 'Vào tab Nhóm → Tạo nhóm. Trong Cài đặt nhóm, tạo link mời hoặc mã nhóm để chia sẻ. Người được mời bấm link hoặc nhập mã ở “Tham gia”.' },
      { q: 'Thành viên “ảo” là gì?', a: 'Là thành viên chỉ có tên, chưa có tài khoản Splitz — tạo nhanh để ghi chi ngay. Bạn có thể mời họ “nhận” danh tính đó sau để tự quản tài khoản của mình.' },
    ],
  },
  {
    group: 'Chi tiêu & quyết toán',
    items: [
      { q: 'Có những kiểu chia tiền nào?', a: 'Chia đều, nhập tay từng người, theo phần trăm, theo số phần, hoặc theo từng món (itemized).' },
      { q: '“Xác nhận đôi” khi quyết toán là gì?', a: 'Người trả bấm “Tôi đã chuyển” → giao dịch ở trạng thái chờ. Người nhận bấm “Đã nhận” thì công nợ mới được trừ. Cách này tránh đánh dấu khống.' },
      { q: 'Vì sao tôi không rời được nhóm?', a: 'Bạn chỉ rời nhóm khi đã tất toán (số dư bằng 0). Hãy quyết toán hết các khoản nợ trước.' },
    ],
  },
  {
    group: 'Gói & thanh toán',
    items: [
      { q: 'Gói Free có giới hạn gì?', a: 'Tối đa 3 nhóm và 8 thành viên mỗi nhóm. Giới hạn tính theo gói của CHỦ NHÓM. Nâng cấp để mở rộng (Cá nhân/Team: không giới hạn nhóm, 25 thành viên/nhóm).' },
      { q: 'Hết hạn Premium thì sao?', a: 'Dữ liệu cũ được giữ nguyên, không bị xoá. Chỉ bị chặn TẠO THÊM khi vượt giới hạn gói Free cho tới khi gia hạn.' },
      { q: 'Thanh toán bằng gì?', a: 'Qua PayOS (QR/chuyển khoản). Gia hạn bán tự động: app nhắc trước khi hết hạn, bạn chủ động thanh toán mỗi chu kỳ.' },
      { q: 'Tôi có mã kích hoạt, nhập ở đâu?', a: 'Cài đặt → Nâng cấp Premium → ô “Có mã kích hoạt?”.' },
    ],
  },
  {
    group: 'An toàn & riêng tư',
    items: [
      { q: 'Splitz có giữ tiền của tôi không?', a: 'Không. Splitz chỉ ghi chép và tạo mã QR từ thông tin tài khoản người nhận. Mọi giao dịch do bạn tự thực hiện qua ngân hàng — hãy kiểm tra tên người nhận trước khi chuyển.' },
      { q: 'Ai thấy số tài khoản của tôi?', a: 'Chỉ thành viên trong cùng nhóm với bạn (cần để tạo QR chuyển khoản). Số tài khoản của thành viên thật do chính họ quản lý.' },
    ],
  },
]

export function FaqScreen() {
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-24 max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label="Quay lại" className="press grid place-items-center h-10 w-10 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-muted hover:text-app">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-app">Hỏi đáp</h1>
        </header>

        <div className="space-y-5">
          {FAQS.map((section) => (
            <section key={section.group} className="space-y-2">
              <h2 className="text-[13px] font-semibold text-muted px-1">{section.group}</h2>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const key = `${section.group}-${item.q}`
                  const isOpen = open === key
                  return (
                    <div key={key} className="card overflow-hidden p-0">
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        className="press w-full flex items-center gap-3 p-3.5 text-left"
                      >
                        <span className="flex-1 font-semibold text-sm">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`text-faint shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && <p className="px-3.5 pb-3.5 text-sm text-muted leading-relaxed">{item.a}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
