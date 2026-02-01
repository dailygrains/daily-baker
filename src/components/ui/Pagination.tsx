'use client';

import { useEffect, useState, useCallback } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 'all'] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STORAGE_KEY = 'pagination-page-size';

interface PaginationProps {
  totalItems: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

function getStoredPageSize(): number {
  if (typeof window === 'undefined') return 10;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 10;
  if (stored === 'all') return Infinity;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? 10 : parsed;
}

function storePageSize(size: number | 'all'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(size));
}

export function usePageSize() {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const stored = getStoredPageSize();
    setItemsPerPage(stored);
    setIsInitialized(true);
  }, []);

  const updateItemsPerPage = useCallback((size: number) => {
    setItemsPerPage(size);
    storePageSize(size === Infinity ? 'all' : size);
  }, []);

  return { itemsPerPage, setItemsPerPage: updateItemsPerPage, isInitialized };
}

export function Pagination({
  totalItems,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) {
  const totalPages = itemsPerPage === Infinity ? 1 : Math.ceil(totalItems / itemsPerPage);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newSize = value === 'all' ? Infinity : parseInt(value, 10);
    storePageSize(value as PageSize);
    onItemsPerPageChange(newSize);
    onPageChange(1); // Reset to first page when changing page size
  };

  const getDisplayValue = (): string => {
    if (itemsPerPage === Infinity) return 'all';
    return String(itemsPerPage);
  };

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];

    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * (itemsPerPage === Infinity ? totalItems : itemsPerPage) + 1;
  const endItem = itemsPerPage === Infinity ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Items per page dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-sm text-base-content/70">
          Rows per page:
        </label>
        <select
          id="page-size"
          className="select select-bordered select-sm w-20"
          value={getDisplayValue()}
          onChange={handlePageSizeChange}
          aria-label="Select number of rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All' : option}
            </option>
          ))}
        </select>
        <span className="text-sm text-base-content/70">
          {startItem}-{endItem} of {totalItems}
        </span>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            «
          </button>
          {getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <button key={`ellipsis-${index}`} className="join-item btn btn-sm btn-disabled">
                ...
              </button>
            ) : (
              <button
                key={page}
                className={`join-item btn btn-sm ${currentPage === page ? 'btn-active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}
          <button
            className="join-item btn btn-sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
