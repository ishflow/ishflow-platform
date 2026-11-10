'use client';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function useAllowMotion() {
  const [allow, setAllow] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAllow(!mql.matches);
    const onChange = () => setAllow(!mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return allow;
}

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  locale?: string;
}

export function NumberTicker({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.2,
  locale = 'ru-RU',
}: Props) {
  const motionVal = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const allowMotion = useAllowMotion();
  const display = useTransform(
    motionVal,
    (v) =>
      `${prefix}${v.toLocaleString(locale, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`,
  );

  useEffect(() => {
    if (!allowMotion) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStarted) {
          setHasStarted(true);
          animate(motionVal, value, { duration, ease: [0.2, 0.6, 0.3, 1] });
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [allowMotion, motionVal, value, duration, hasStarted]);

  if (!allowMotion) {
    return (
      <span ref={ref}>
        {prefix}
        {value.toLocaleString(locale, {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        })}
        {suffix}
      </span>
    );
  }
  return <motion.span ref={ref}>{display}</motion.span>;
}
