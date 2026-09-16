import type { Transition, Variants } from 'framer-motion'

/** Spring chuẩn Splitz — mượt, hơi nảy, dùng cho mọi chuyển động chính. */
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 280, damping: 30 }

/** Ease cho fade/slide ngắn. */
export const ease: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] }

/** Vào màn: trồi lên + mờ dần. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18 } },
}

/** Container stagger — con dùng `fadeUpItem`. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: ease },
}

/** Pop nhẹ cho icon/badge xuất hiện. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: spring },
}

/** Chuyển trang — fade + trượt nhẹ. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

/** Sheet trượt từ dưới lên. */
export const sheetMotion: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: springSoft },
  exit: { y: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

/** Overlay nền mờ. */
export const overlayMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

/** Nhấn — scale xuống. Dùng qua prop whileTap. */
export const tap = { scale: 0.96 }
