'use client';

import React from 'react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  isTop?: boolean;
}

export function Pagination({ currentPage, totalPages, basePath, isTop = false }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const maxButtons = 5;

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const getPageUrl = (page: number) => {
    const sep = basePath.includes('?') ? '&' : '?';
    return `${basePath}${sep}page=${page}`;
  };

  return (
    <div
      className={`browse__pager ${isTop ? 'browse__pager--top' : ''}`}
      id={isTop ? 'browse-pager-top' : 'browse-pager'}
      style={isTop ? { padding: '10px var(--row-pad, 24px) 24px', justifyContent: 'center' } : undefined}
    >
      <Link
        href={getPageUrl(1)}
        className={`browse__pager-btn ${currentPage <= 1 ? 'disabled' : ''}`}
        title="Trang đầu"
        style={currentPage <= 1 ? { pointerEvents: 'none', opacity: 0.2 } : {}}
      >
        <i className="fas fa-angles-left"></i>
      </Link>

      <Link
        href={getPageUrl(Math.max(1, currentPage - 1))}
        className={`browse__pager-btn ${currentPage <= 1 ? 'disabled' : ''}`}
        title="Trang trước"
        style={currentPage <= 1 ? { pointerEvents: 'none', opacity: 0.2 } : {}}
      >
        <i className="fas fa-chevron-left"></i>
      </Link>

      <div className="browse__pager-numbers" id={isTop ? 'browse-pager-numbers-top' : 'browse-pager-numbers'}>
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="browse__page-dots">
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <Link
              key={p}
              href={getPageUrl(p as number)}
              className={`browse__page-num ${isCurrent ? 'active' : ''}`}
            >
              {p}
            </Link>
          );
        })}
      </div>

      <Link
        href={getPageUrl(Math.min(totalPages, currentPage + 1))}
        className={`browse__pager-btn ${currentPage >= totalPages ? 'disabled' : ''}`}
        title="Trang sau"
        style={currentPage >= totalPages ? { pointerEvents: 'none', opacity: 0.2 } : {}}
      >
        <i className="fas fa-chevron-right"></i>
      </Link>

      <Link
        href={getPageUrl(totalPages)}
        className={`browse__pager-btn ${currentPage >= totalPages ? 'disabled' : ''}`}
        title="Trang cuối"
        style={currentPage >= totalPages ? { pointerEvents: 'none', opacity: 0.2 } : {}}
      >
        <i className="fas fa-angles-right"></i>
      </Link>
    </div>
  );
}

export default Pagination;
