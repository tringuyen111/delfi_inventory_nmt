
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  // Simple pagination logic: show first, current, and last pages
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    if (currentPage > 1) pages.add(currentPage - 1);
    pages.add(currentPage);
    if (currentPage < totalPages) pages.add(currentPage + 1);
    
    const result = Array.from(pages).sort((a,b) => a - b);
    
    // Add ellipsis
    const withEllipsis: (number | string)[] = [];
    let lastPage = 0;
    for (const page of result) {
      if (lastPage !== 0 && page > lastPage + 1) {
        withEllipsis.push('...');
      }
      withEllipsis.push(page);
      lastPage = page;
    }
    return withEllipsis;
  };
  
  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      {pageNumbers.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-md transition-colors ${
              currentPage === page
                ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900 font-bold'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center">...</span>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </nav>
  );
};
