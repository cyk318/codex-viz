import type { ReactNode } from 'react';

type Props = {
  text: string;
  className?: string;
};

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string | null; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] };

export function MarkdownContent({ text, className = '' }: Props) {
  const blocks = parseBlocks(text);

  return (
    <div className={`markdown-content break-words text-sm leading-6 text-slate-800 dark:text-slate-300 ${className}`}>
      {blocks.length ? blocks.map((block, index) => renderBlock(block, index)) : null}
    </div>
  );
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```(\S*)\s*$/);
    if (fence) {
      const language = fence[1] || null;
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language, text: codeLines.join('\n') });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index]);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(/^>\s?(.*)$/);
        if (!match) break;
        quoteLines.push(match[1]);
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    const listMatch = trimmed.match(/^((?:[-*+])|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(/^((?:[-*+])|\d+[.)])\s+(.+)$/);
        if (!match || /^\d/.test(match[1]) !== ordered) break;
        items.push(match[2]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index].trim();
      if (
        current.match(/^```/) ||
        current.match(/^(#{1,6})\s+/) ||
        current.match(/^>\s?/) ||
        current.match(/^((?:[-*+])|\d+[.)])\s+/) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(current) ||
        isTableStart(lines, index)
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
  }

  return blocks;
}

function renderBlock(block: Block, index: number) {
  if (block.type === 'heading') {
    const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
    const sizeClass = block.level <= 2 ? 'text-base' : 'text-sm';
    return <Tag key={index} className={`mb-2 mt-3 font-semibold ${sizeClass}`}>{renderInline(block.text)}</Tag>;
  }

  if (block.type === 'paragraph') {
    return <p key={index} className="mb-2 last:mb-0">{renderInline(block.text)}</p>;
  }

  if (block.type === 'quote') {
    return (
      <blockquote key={index} className="mb-2 border-l-2 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {renderInline(block.text)}
      </blockquote>
    );
  }

  if (block.type === 'code') {
    return (
      <div key={index} className="mb-2 overflow-hidden rounded border border-slate-200 bg-slate-950 dark:border-slate-800">
        {block.language ? <div className="border-b border-slate-800 px-3 py-1 text-xs text-slate-400">{block.language}</div> : null}
        <pre className="overflow-auto p-3 text-xs leading-5 text-slate-300"><code>{block.text || ' '}</code></pre>
      </div>
    );
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag key={index} className={`mb-2 ${block.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
        {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
      </Tag>
    );
  }

  if (block.type === 'table') {
    return (
      <div key={index} className="mb-2 overflow-auto rounded border border-slate-200 dark:border-slate-800">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>{block.headers.map((header, cellIndex) => <th key={cellIndex} className="border-b border-slate-200 px-2 py-1 font-semibold dark:border-slate-700">{renderInline(header)}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100 dark:border-slate-800">
                {block.headers.map((_, cellIndex) => <td key={cellIndex} className="px-2 py-1 align-top">{renderInline(row[cellIndex] || '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <hr key={index} className="my-3 border-slate-200 dark:border-slate-800" />;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|_[^_\n]+?_|\[[^\]\n]+?\]\([^) \n]+?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(...renderPlainText(text.slice(lastIndex, match.index), nodes.length));
    nodes.push(renderInlineToken(match[0], nodes.length));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(...renderPlainText(text.slice(lastIndex), nodes.length));
  return nodes;
}

function renderInlineToken(token: string, key: number): ReactNode {
  if (token.startsWith('`')) {
    return <code key={key} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-pink-700 dark:bg-slate-800 dark:text-pink-300">{token.slice(1, -1)}</code>;
  }

  if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
    return <strong key={key}>{renderInline(token.slice(2, -2))}</strong>;
  }

  if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
    return <em key={key}>{renderInline(token.slice(1, -1))}</em>;
  }

  const link = token.match(/^\[([^\]\n]+?)\]\(([^) \n]+?)\)$/);
  if (link) {
    const href = link[2];
    const external = /^https?:\/\//i.test(href);
    return (
      <a key={key} className="text-blue-700 underline underline-offset-2 dark:text-blue-300" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {renderInline(link[1])}
      </a>
    );
  }

  return token;
}

function renderPlainText(text: string, startKey: number): ReactNode[] {
  const parts = text.split('\n');
  const nodes: ReactNode[] = [];

  parts.forEach((part, index) => {
    if (index > 0) nodes.push(<br key={`${startKey}-br-${index}`} />);
    if (part) nodes.push(part);
  });

  return nodes;
}

function isTableStart(lines: string[], index: number) {
  return Boolean(lines[index]?.includes('|') && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/));
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}
