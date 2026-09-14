import { useState } from 'react';
import type { RawEntry } from '../lib/types';
import { CodeBlock } from './CodeBlock';
import { Icon } from './Icon';

export function RawEvents({
  entries,
  sessionId
}: {
  entries: RawEntry[];
  sessionId: string;
}) {
  const [page, setPage] = useState(0);
  const size = 20,
    count = Math.max(1, Math.ceil(entries.length / size));
  return (
    <div className="raw-events">
      <div className="raw-toolbar">
        <span>
          {entries.length.toLocaleString()} 条原始事件 · 每页 {size} 条
        </span>
        <a
          className="button button-outline"
          href={`/api/sessions/${encodeURIComponent(sessionId)}/raw`}
          download={`${sessionId}.jsonl`}
        >
          <Icon name="code" size={14} />
          下载完整 JSONL
        </a>
      </div>
      <CodeBlock
        key={page}
        value={entries.slice(page * size, (page + 1) * size)}
      />
      <div className="list-pagination">
        <span>
          事件 {entries.length ? page * size + 1 : 0} —{' '}
          {Math.min((page + 1) * size, entries.length)}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="上一页事件"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <Icon name="back" size={16} />
          </button>
          {page + 1} / {count}
          <button
            className="icon-button"
            aria-label="下一页事件"
            disabled={page + 1 >= count}
            onClick={() => setPage(page + 1)}
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
