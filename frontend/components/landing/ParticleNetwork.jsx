'use client';

import { useEffect, useRef } from 'react';

export default function ParticleNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 150;
    const PARTICLE_COLOR = 'rgba(0, 200, 150, 0.6)';

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.8,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = PARTICLE_COLOR;
        ctx.fill();
      }

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 200, 150, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    init();

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) {
      draw();
    } else {
      // Draw a single static frame
      draw();
      cancelAnimationFrame(animationId);
    }

    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
