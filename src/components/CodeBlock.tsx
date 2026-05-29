type Props = {
  value: unknown;
  className?: string;
};

export function CodeBlock({ value, className = '' }: Props) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <pre className={`max-h-[520px] overflow-auto rounded border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-300 dark:border-slate-800 ${className}`}>
      {text || '(空)'}
    </pre>
  );
}
