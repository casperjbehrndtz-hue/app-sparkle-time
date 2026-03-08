import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--kassen-gold))",
  "hsl(var(--kassen-blue))",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
];

export function ConfettiEffect({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: COLORS[i % COLORS.length],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.4,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: `${p.x}vw`,
              y: "-5vh",
              rotate: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              y: "110vh",
              rotate: p.rotation + 720,
              opacity: [1, 1, 0.8, 0],
              scale: [1, 1.2, 0.8, 0.4],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2 + Math.random(),
              ease: [0.22, 0.61, 0.36, 1],
              delay: p.delay,
            }}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
