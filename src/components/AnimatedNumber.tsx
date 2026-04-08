"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return new Intl.NumberFormat("ko-KR").format(Math.round(latest));
  });

  useEffect(() => {
    const animation = animate(count, value, { duration: 0.8, ease: "easeOut" });
    return animation.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export function AnimatedPercent({ value }: { value: string | null }) {
  if (value === null) return null;
  const numValue = parseFloat(value);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(1));

  useEffect(() => {
    const animation = animate(count, numValue, { duration: 0.8, ease: "easeOut" });
    return animation.stop;
  }, [numValue, count]);

  return <motion.span>{rounded}</motion.span>;
}
