'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into blocks (paragraphs, headers, tables, blockquotes, list blocks)
  const lines = content.split('\n');
  const blocks: Array<{ type: 'header' | 'table' | 'blockquote' | 'list' | 'text'; lines: string[]; level?: number }> = [];

  let currentBlock: { type: 'header' | 'table' | 'blockquote' | 'list' | 'text'; lines: string[]; level?: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (currentBlock?.type === 'table') {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'table', lines: [line] };
      }
      continue;
    }

    // Check header line
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'header', lines: [headerMatch[2]], level: headerMatch[1].length };
      blocks.push(currentBlock);
      currentBlock = null;
      continue;
    }

    // Check blockquote line
    if (trimmed.startsWith('>')) {
      if (currentBlock?.type === 'blockquote') {
        currentBlock.lines.push(trimmed.replace(/^>\s?/, ''));
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'blockquote', lines: [trimmed.replace(/^>\s?/, '')] };
      }
      continue;
    }

    // Check list item
    if (/^(\*|-|\+|\d+\.|•)\s+/.test(trimmed)) {
      if (currentBlock?.type === 'list') {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'list', lines: [line] };
      }
      continue;
    }

    // Normal text
    if (trimmed === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    } else {
      if (currentBlock?.type === 'text') {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'text', lines: [line] };
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const renderInlineFormatted = (text: string) => {
    // Replace **bold**
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-slate-700">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 bg-slate-100 text-emerald-700 font-mono text-xs rounded">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;

    // Filter out separator lines like |---|---|
    const parsedRows = tableLines
      .map(r => r.trim())
      .filter(r => r.startsWith('|') && r.endsWith('|'))
      .map(r => r.slice(1, -1).split('|').map(cell => cell.trim()));

    if (parsedRows.length === 0) return null;

    const headerRow = parsedRows[0];
    const isSeparator = (row: string[]) => row.every(cell => /^:?-+:?$/.test(cell));

    const bodyRows = parsedRows.slice(1).filter(r => !isSeparator(r));

    return (
      <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
              {headerRow.map((col, idx) => (
                <th key={idx} className="px-3.5 py-2.5 whitespace-nowrap">
                  {renderInlineFormatted(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                {row.map((cell, cIdx) => {
                  let badgeStyle = '';
                  if (cell.includes('🔴') || cell.includes('หมดสต๊อก') || cell.includes('OUT_OF_STOCK')) {
                    badgeStyle = 'text-rose-700 bg-rose-50 border-rose-200';
                  } else if (cell.includes('🟡') || cell.includes('ต่ำกว่าขั้นต่ำ') || cell.includes('LOW_STOCK')) {
                    badgeStyle = 'text-amber-700 bg-amber-50 border-amber-200';
                  } else if (cell.includes('🟢') || cell.includes('พร้อมขาย') || cell.includes('IN_STOCK')) {
                    badgeStyle = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  }

                  return (
                    <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                      {badgeStyle ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeStyle}`}>
                          {renderInlineFormatted(cell)}
                        </span>
                      ) : (
                        renderInlineFormatted(cell)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-2.5 text-slate-800 text-sm leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          return renderTable(block.lines, bIdx);
        }

        if (block.type === 'header') {
          const level = block.level || 3;
          const text = block.lines.join(' ');
          if (level === 1 || level === 2) {
            return (
              <h2 key={bIdx} className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 mt-4 mb-2 flex items-center gap-2">
                {renderInlineFormatted(text)}
              </h2>
            );
          }
          return (
            <h3 key={bIdx} className="text-sm font-bold text-slate-900 mt-3 mb-1 flex items-center gap-1.5">
              {renderInlineFormatted(text)}
            </h3>
          );
        }

        if (block.type === 'blockquote') {
          const text = block.lines.join('\n');
          const isWarning = text.includes('[!WARNING]') || text.includes('คำแนะนำ:') || text.includes('ข้อควรระวัง:');
          return (
            <div
              key={bIdx}
              className={`my-3 p-3.5 rounded-xl border text-xs leading-relaxed ${
                isWarning
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {renderInlineFormatted(text.replace(/\[!(WARNING|NOTE|IMPORTANT|CAUTION)\]/g, ''))}
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={bIdx} className="space-y-1 my-2 pl-1">
              {block.lines.map((l, lIdx) => {
                const cleanItem = l.trim().replace(/^(\*|-|\+|\d+\.|•)\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                    <span className="text-emerald-500 font-bold select-none shrink-0">•</span>
                    <span>{renderInlineFormatted(cleanItem)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Standard text
        return (
          <p key={bIdx} className="text-xs sm:text-sm text-slate-700 leading-normal">
            {renderInlineFormatted(block.lines.join(' '))}
          </p>
        );
      })}
    </div>
  );
};
