import { useEffect, useRef } from 'react';

// Project a rotating sphere and its orbital paths; no network assets or WebGL needed.
export function OrbitVisual() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      angle = 0,
      width = 0,
      height = 0,
      visible = true;
    const pointer = { x: 0, y: 0 };
    const points = Array.from({ length: 620 }, (_, i) => {
      const y = 1 - (2 * i) / 619,
        r = Math.sqrt(1 - y * y),
        a = i * 2.399963;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    });
    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const radius = Math.min(width * 0.3, height * 0.34),
        cx = width / 2,
        cy = height / 2;
      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.65);
      glow.addColorStop(0, '#b17af40c');
      glow.addColorStop(1, '#b17af400');
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, width, height);
      const project = (x: number, y: number, z: number) => {
        const a = angle + pointer.x * 0.25,
          b = -0.2 + pointer.y * 0.2;
        const rx = x * Math.cos(a) + z * Math.sin(a),
          rz = -x * Math.sin(a) + z * Math.cos(a);
        const ry = y * Math.cos(b) - rz * Math.sin(b),
          depth = y * Math.sin(b) + rz * Math.cos(b);
        return [cx + rx * radius, cy + ry * radius, depth];
      };
      for (let ring = 0; ring < 3; ring++) {
        ctx!.beginPath();
        for (let i = 0; i <= 150; i++) {
          const t = (i / 150) * Math.PI * 2,
            x = Math.cos(t) * 1.43,
            y = Math.sin(t) * 0.4,
            z = Math.sin(t) * 1.3;
          const tilt = ring * 0.8 + 0.3,
            p = project(
              x * Math.cos(tilt) - y * Math.sin(tilt),
              x * Math.sin(tilt) + y * Math.cos(tilt),
              z
            );
          i ? ctx!.lineTo(p[0], p[1]) : ctx!.moveTo(p[0], p[1]);
        }
        ctx!.strokeStyle = ring === 0 ? '#bf91f855' : '#bf91f820';
        ctx!.lineWidth = 0.7;
        ctx!.stroke();
      }
      for (const p of points) {
        const [x, y, z] = project(...(p as [number, number, number]));
        ctx!.beginPath();
        ctx!.arc(x, y, 0.7 + (z + 1) * 0.55, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(202,170,248,${0.13 + (z + 1) * 0.33})`;
        ctx!.fill();
      }
      if (
        !media.matches &&
        document.documentElement.dataset.motion !== 'off' &&
        visible
      ) {
        angle += 0.002;
        frame = requestAnimationFrame(draw);
      }
    }
    const resize = new ResizeObserver(() => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cancelAnimationFrame(frame);
      draw();
    });
    const move = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - r.left) / r.width - 0.5;
      pointer.y = (event.clientY - r.top) / r.height - 0.5;
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    const motionObserver = new MutationObserver(restart);
    motionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion']
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    resize.observe(canvas);
    observer.observe(canvas);
    canvas.addEventListener('pointermove', move);
    media.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      motionObserver.disconnect();
      canvas.removeEventListener('pointermove', move);
      media.removeEventListener('change', restart);
    };
  }, []);
  return (
    <div className="orbit-visual">
      <canvas ref={ref} aria-hidden="true" />
      <span className="orbit-coordinate">LOCAL ORBIT / 001</span>
      <span className="orbit-caption">每一次探索，都有迹可循。</span>
    </div>
  );
}
