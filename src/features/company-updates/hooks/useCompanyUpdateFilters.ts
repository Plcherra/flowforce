import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'company-updates:filters';

export type ViewMode = 'feed' | 'grid' | 'list';

export function useCompanyUpdateFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const readInitialState = () => {
    const fromStorage = (() => {
      if (typeof window === 'undefined') {
        return null;
      }
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    return {
      searchTerm: searchParams.get('search') ?? fromStorage?.searchTerm ?? '',
      page: Number(searchParams.get('page') ?? fromStorage?.page ?? 1),
      pageSize: Number(searchParams.get('pageSize') ?? fromStorage?.pageSize ?? 10),
      viewMode: (searchParams.get('view') as ViewMode) ?? fromStorage?.viewMode ?? 'feed',
    };
  };

  const initialState = useMemo(readInitialState, [searchParams]);

  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [page, setPage] = useState(initialState.page);
  const [pageSize, setPageSize] = useState(initialState.pageSize);
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.viewMode);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('view', viewMode);
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchTerm, page, pageSize, viewMode }),
      );
    }
  }, [page, pageSize, searchTerm, viewMode, setSearchParams]);

  const resetPage = useCallback(() => setPage(1), []);

  const updateSearchTerm = useCallback((value: string) => {
    setSearchTerm(value);
    resetPage();
  }, [resetPage]);

  const updatePageSize = useCallback((size: number) => {
    setPageSize(size);
    resetPage();
  }, [resetPage]);

  const updateViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return {
    searchTerm,
    setSearchTerm: updateSearchTerm,
    page,
    setPage,
    pageSize,
    setPageSize: updatePageSize,
    viewMode,
    setViewMode: updateViewMode,
  };
}
