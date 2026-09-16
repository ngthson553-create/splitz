import { useEffect } from 'react'
import { animate, useMotionValue, useReducedMotion, useTransform, motion } from 'framer-motion'
import { formatVnd } from '../lib/format'

/** Số tiền đếm lên mượt khi giá trị đổi. Tôn trọng prefers-reduced-motion. */
export function CountUpVnd({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => formatVnd(Math.round(v)))

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [value, mv, reduce])

  return <motion.span className={className}>{text}</motion.span>
}
