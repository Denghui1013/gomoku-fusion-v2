import { type Variants } from "framer-motion"

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0 },
}

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
}

export const pulseGlow: Variants = {
  initial: { boxShadow: "0 0 0 0 rgba(234, 179, 8, 0)" },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(234, 179, 8, 0.4)",
      "0 0 0 10px rgba(234, 179, 8, 0)",
    ],
    transition: {
      duration: 1,
      repeat: Infinity,
    },
  },
}

export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 20,
}

export const smoothTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
}
