"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const springValue = useSpring(count, { stiffness: 60, damping: 20 });
  const rounded = useTransform(springValue, (latest) => {
    return new Intl.NumberFormat("ko-KR").format(Math.round(latest));
  });

  useEffect(() => {
    count.set(value);
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export function AnimatedPercent({ value }: { value: string | null }) {
  if (value === null) return null;
  const numValue = parseFloat(value);
  const count = useMotionValue(0);
  const springValue = useSpring(count, { stiffness: 60, damping: 20 });
  const rounded = useTransform(springValue, (latest) => latest.toFixed(1));

  useEffect(() => {
    count.set(numValue);
  }, [numValue, count]);

  return <motion.span>{rounded}</motion.span>;
}
