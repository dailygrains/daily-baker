'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface SearchFilterInputProps {
  placeholder?: string;
}

export function SearchFilterInput({ placeholder = 'Search...' }: SearchFilterInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (debouncedQuery.length >= 2) {
      params.set('search', debouncedQuery);
    } else {
      params.delete('search');
    }

    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, pathname, router]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/50 z-10" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input input-lg w-[28rem] pl-11 pr-10 rounded-full"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content z-10"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
