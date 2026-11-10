import type { Variants } from 'framer-motion';

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const INTRO_DELAY = 2.9;
export const MATTE = 'bg-[oklch(0.15_0.008_250)]';
export const ACCENT = 'oklch(0.8 0.13 245)';

export const blurIn: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(14px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.1, delay: INTRO_DELAY + i * 0.08, ease: EASE },
  }),
};

export const photoIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, filter: 'blur(12px)' },
  show: (i = 0) => ({
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.2, delay: INTRO_DELAY + 0.1 + i * 0.1, ease: EASE },
  }),
};
