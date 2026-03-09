'use client';

import { motion } from 'framer-motion';

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}) {
  const offsets = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.7,
        ease: [0.25, 0.1, 0.25, 1.0],
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
