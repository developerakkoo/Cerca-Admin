/** Shared pagination helpers for admin list pages (server- or client-paged). */

export const ADMIN_LIST_LIMIT_OPTIONS = [10, 20, 50, 100] as const;

export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxPages = 5
): number[] {
  const pages: number[] = [];
  let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let end = Math.min(totalPages, start + maxPages - 1);

  if (end - start < maxPages - 1) {
    start = Math.max(1, end - maxPages + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export function getDisplayRange(
  currentPage: number,
  limit: number,
  total: number,
  entityLabelPlural: string
): string {
  if (total === 0) {
    return `Showing 0 of 0 ${entityLabelPlural}`;
  }
  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, total);
  return `Showing ${start} to ${end} of ${total} ${entityLabelPlural}`;
}
