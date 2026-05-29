import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ParsedMessage, ParsedReasoning, ParsedToolCall, SessionDetail } from '../lib/types';
import { MessageBubble, ReasoningBubble } from '../components/MessageBubble';
import { ToolCallCard } from '../components/ToolCallCard';

type TimelineItem =
  | { type: 'message'; timestamp: string; entryIndex: number; item: ParsedMessage }
  | { type: 'reasoning'; timestamp: string; entryIndex: number; item: ParsedReasoning }
  | { type: 'tool'; timestamp: string; entryIndex: number; item: ParsedToolCall };

export function Timeline({ session }: { session: SessionDetail }) {
  const [turnOnly, setTurnOnly] = useState<string>('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const items = useMemo<TimelineItem[]>(() => {
    const combined: TimelineItem[] = [
      ...session.messages.map((item) => ({ type: 'message' as const, timestamp: item.timestamp, entryIndex: item.entryIndex, item })),
      ...session.reasoning.map((item) => ({ type: 'reasoning' as const, timestamp: item.timestamp, entryIndex: item.entryIndex, item })),
      ...session.toolCalls.map((item) => ({ type: 'tool' as const, timestamp: item.timestamp, entryIndex: Number(item.id.replace('tool-', '')) || 0, item }))
    ];
    return combined
      .filter((item) => turnOnly === 'all' || item.item.turnId === turnOnly)
      .sort((a, b) => a.entryIndex - b.entryIndex);
  }, [session, turnOnly]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 190,
    overscan: 8
  });

  function scrollToTool(offset: number) {
    const current = virtualizer.getVirtualItems()[0]?.index ?? 0;
    const next = items.findIndex((item, index) => index > current + offset && item.type === 'tool');
    if (next >= 0) virtualizer.scrollToIndex(next, { align: 'start' });
  }

  return (
    <div className="grid gap-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <button className="rounded bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800" onClick={() => virtualizer.scrollToIndex(0)}>顶部</button>
        <button className="rounded bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800" onClick={() => virtualizer.scrollToIndex(items.length - 1)}>底部</button>
        <button className="rounded bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800" onClick={() => scrollToTool(0)}>下一个工具</button>
        <select className="h-8 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={turnOnly} onChange={(event) => setTurnOnly(event.target.value)}>
          <option value="all">全部 turns</option>
          {session.turns.map((turn) => <option key={turn.id} value={turn.id}>{turn.title}</option>)}
        </select>
      </div>
      <div ref={parentRef} className="h-[calc(100vh-260px)] overflow-auto rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((row) => {
            const item = items[row.index];
            return (
              <div key={`${item.type}-${item.entryIndex}`} ref={virtualizer.measureElement} data-index={row.index} className="absolute left-0 top-0 w-full p-3" style={{ transform: `translateY(${row.start}px)` }}>
                {item.type === 'message' ? <MessageBubble message={item.item} /> : null}
                {item.type === 'reasoning' ? <ReasoningBubble item={item.item} /> : null}
                {item.type === 'tool' ? <ToolCallCard call={item.item} compact /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
