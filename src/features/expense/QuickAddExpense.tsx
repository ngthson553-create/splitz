import { useEffect, useRef, useState } from 'react'
import { ChevronRight, FolderPlus, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import { useStore } from '../../lib/store'
import { formatCompactVnd } from '../../lib/format'
import { totalGroupSpend } from '../../lib/settlement/balances'
import { ExpenseSheet } from './ExpenseSheet'

export function QuickAddExpense({
  open,
  onClose,
  onCreateGroup,
}: {
  open: boolean
  onClose: () => void
  onCreateGroup: () => void
}) {
  const { groups, loading, error, reload } = useStore()
  // Lưu ID (không lưu object) để luôn lấy bản nhóm MỚI NHẤT từ store khi poll realtime
  // cập nhật — tránh giữ snapshot cũ. `picked` = nhóm tươi theo id.
  const [pickedId, setPickedId] = useState<string | null>(null)
  const wasOpen = useRef(false)

  // Chỉ khởi tạo lựa chọn khi sheet VỪA mở (false→true). KHÔNG phụ thuộc danh tính
  // mảng `groups` để tránh đồng bộ realtime (poll 20s tạo mảng mới) làm reset lựa chọn
  // → ExpenseSheet remount, xoá form đang nhập / nhảy về màn chọn nhóm.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setPickedId(groups.length === 1 ? groups[0].id : null)
    } else if (!open) {
      setPickedId(null)
    }
    wasOpen.current = open
  }, [open, groups])

  const picked = pickedId ? (groups.find((g) => g.id === pickedId) ?? null) : null

  // Đã chọn nhóm → mở thẳng ExpenseSheet.
  if (picked) {
    return (
      <ExpenseSheet
        group={picked}
        open={open}
        onClose={() => {
          setPickedId(null)
          onClose()
        }}
      />
    )
  }

  if (loading && groups.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title="Thêm khoản chi">
        <div className="flex flex-col items-center text-center py-8 px-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl gradient-brand-soft text-white shadow-glow mb-4">
            <Loader2 size={26} className="animate-spin" />
          </div>
          <h3 className="font-bold text-app">Đang tải nhóm</h3>
          <p className="mt-1.5 text-sm text-muted max-w-xs">
            Splitz đang lấy danh sách nhóm để bạn chọn nơi ghi khoản chi.
          </p>
        </div>
      </Sheet>
    )
  }

  if (error && groups.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title="Thêm khoản chi">
        <div className="flex flex-col items-center text-center py-8 px-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl bg-neg/12 text-neg mb-4">
            <TriangleAlert size={26} />
          </div>
          <h3 className="font-bold text-app">Không tải được nhóm</h3>
          <p className="mt-1.5 text-sm text-muted max-w-xs">{error}</p>
          <Button size="lg" variant="secondary" className="mt-5" onClick={() => void reload()}>
            <RefreshCw size={18} /> Thử lại
          </Button>
        </div>
      </Sheet>
    )
  }

  // Chưa có nhóm.
  if (groups.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title="Thêm khoản chi">
        <div className="flex flex-col items-center text-center py-8 px-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl gradient-brand-soft text-white shadow-glow mb-4 animate-float">
            <Sparkles size={26} />
          </div>
          <h3 className="font-bold text-app">Bạn chưa có nhóm nào</h3>
          <p className="mt-1.5 text-sm text-muted max-w-xs">
            Hãy tạo một nhóm trước, sau đó bạn có thể ghi khoản chi và chia tiền cho cả nhóm.
          </p>
          <Button
            size="lg"
            className="mt-5"
            onClick={() => {
              onClose()
              onCreateGroup()
            }}
          >
            <FolderPlus size={18} /> Tạo nhóm đầu tiên
          </Button>
        </div>
      </Sheet>
    )
  }

  // Có nhiều nhóm → chọn nhóm.
  return (
    <Sheet open={open} onClose={onClose} title="Ghi vào nhóm nào?">
      <div className="space-y-1.5 py-1">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setPickedId(g.id)}
            className="press w-full flex items-center gap-3 p-2.5 rounded-2xl surface-sunken hover:bg-[var(--surface-2)] transition text-left"
          >
            <span className="grid place-items-center h-10 w-10 rounded-xl gradient-brand-soft text-xl shrink-0">
              {g.emoji ?? '💸'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{g.name}</p>
              <p className="text-xs text-muted">
                {g.members.length} người · {formatCompactVnd(totalGroupSpend(g))}
              </p>
            </div>
            <ChevronRight size={18} className="text-faint shrink-0" />
          </button>
        ))}
      </div>
    </Sheet>
  )
}
