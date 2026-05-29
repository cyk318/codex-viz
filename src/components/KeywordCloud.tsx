import type { KeywordItem } from '../lib/keywords';

const palette = [
  'text-cyan-100 border-cyan-300/35 bg-cyan-400/10 shadow-cyan-400/20',
  'text-lime-100 border-lime-300/35 bg-lime-400/10 shadow-lime-400/20',
  'text-amber-100 border-amber-300/35 bg-amber-400/10 shadow-amber-400/20',
  'text-fuchsia-100 border-fuchsia-300/35 bg-fuchsia-400/10 shadow-fuchsia-400/20',
  'text-sky-100 border-sky-300/35 bg-sky-400/10 shadow-sky-400/20',
  'text-rose-100 border-rose-300/35 bg-rose-400/10 shadow-rose-400/20'
];

export function KeywordCloud({ keywords, onSelect }: { keywords: KeywordItem[]; onSelect: (keyword: string) => void }) {
  return (
    <section className="mb-4 overflow-hidden rounded border border-white/10 bg-slate-950 shadow-[0_18px_55px_rgba(2,6,23,0.28)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
          <div className="text-sm font-semibold text-slate-100">用户提问热词</div>
        </div>
        <div className="text-xs text-slate-400">点击热词筛选 sessions</div>
      </div>
      <div className="relative h-32 overflow-hidden p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.20),transparent_26%),radial-gradient(circle_at_86%_24%,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_46%_92%,rgba(132,204,22,0.12),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.35),rgba(2,6,23,0.96))]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="relative h-full">
          {keywords.slice(0, 42).map((item, index) => {
            const size = 10 + Math.round(item.weight * 5);
            const seed = hash(`${item.text}-${index}`);
            const left = 2 + (seed % 92);
            const delay = (seed % 900) / 100;
            const duration = 7 + ((seed >> 5) % 8);
            const rotate = -12 + ((seed >> 9) % 25);
            const topOffset = -76 - ((seed >> 13) % 38);
            const drift = -22 + ((seed >> 17) % 45);
            const opacity = 0.72 + (((seed >> 21) % 28) / 100);
            const endY = 168 + ((seed >> 24) % 36);
            return (
              <button
                key={`${item.text}-${index}`}
                className={`keyword-rain group pointer-events-auto absolute rounded-full border px-2.5 py-1 font-semibold shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-white/15 hover:brightness-125 hover:[animation-play-state:paused] focus:outline-none focus:ring-2 focus:ring-cyan-300 ${palette[index % palette.length]}`}
                style={{
                  fontSize: `${size}px`,
                  left: `${left}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  '--kw-rotate': `${rotate}deg`
                  ,
                  '--kw-start-y': `${topOffset}px`,
                  '--kw-drift': `${drift}px`,
                  '--kw-end-y': `${endY}px`,
                  '--kw-opacity': opacity
                } as React.CSSProperties}
                title={`${item.count} 次`}
                onClick={() => onSelect(item.text)}
              >
                {item.text}
                <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/95 px-2 py-1 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/10 group-hover:block">
                  {item.count} 次
                </span>
              </button>
            );
          })}
          {!keywords.length ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">暂无足够的用户提问热词。</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
