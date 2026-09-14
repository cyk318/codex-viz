import { useMemo, useState } from 'react';
type Props = { value: unknown; className?: string };
export function CodeBlock({ value, className = '' }: Props) {
  const text =
    useMemo(
      () =>
        typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      [value]
    ) || '(空)';
  const [limit, setLimit] = useState(30_000);
  return (
    <div className="code-block">
      <pre
        className={`max-h-[520px] overflow-auto rounded border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-300 dark:border-slate-800 ${className}`}
      >
        {text.slice(0, limit)}
      </pre>
      {text.length > limit && (
        <button className="code-more" onClick={() => setLimit(limit + 30_000)}>
          已展示 {limit.toLocaleString()} / {text.length.toLocaleString()} 字符
          · 加载更多
        </button>
      )}
    </div>
  );
}
