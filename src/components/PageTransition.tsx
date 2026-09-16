import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageTransition } from '../lib/motion'

/** Bọc nội dung mỗi route để fade + trượt nhẹ khi chuyển trang. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  )
}
