'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
}

interface VendorAutocompleteProps {
  bakeryId: string;
  onSelect: (vendor: Vendor) => void;
  excludeVendorIds?: string[];
  placeholder?: string;
  /** Allow creating new vendors inline when not found */
  allowCreate?: boolean;
  /** Callback when creating a new vendor. Returns the created vendor or null if failed. */
  onCreate?: (name: string) => Promise<Vendor | null>;
}

export function VendorAutocomplete({
  bakeryId,
  onSelect,
  excludeVendorIds = [],
  placeholder = 'Search vendors...',
  allowCreate = false,
  onCreate,
}: VendorAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if query exactly matches any vendor name (case-insensitive)
  const exactMatch = vendors.some(
    (v) => v.name.toLowerCase() === query.toLowerCase()
  );

  // Show create option if allowCreate is true, query has content, and no exact match
  const showCreateOption = allowCreate && onCreate && query.trim().length >= 2 && !exactMatch && !isLoading;

  // Total options count for keyboard navigation
  const totalOptions = vendors.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const params = new URLSearchParams({
            bakeryId,
            search: query,
            limit: '10',
          });

          if (excludeVendorIds.length > 0) {
            params.append('excludeIds', excludeVendorIds.join(','));
          }

          const response = await fetch(`/api/vendors?${params}`);
          const data = await response.json();
          setVendors(data.vendors || []);
          setIsOpen(true);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Error fetching vendors:', error);
          setVendors([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setVendors([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, bakeryId, excludeVendorIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vendor: Vendor) => {
    onSelect(vendor);
    setQuery('');
    setVendors([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!onCreate || !query.trim()) return;

    setIsCreating(true);
    try {
      const newVendor = await onCreate(query.trim());
      if (newVendor) {
        handleSelect(newVendor);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || totalOptions === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex < vendors.length) {
          // Selected a vendor
          if (vendors[selectedIndex]) {
            handleSelect(vendors[selectedIndex]);
          }
        } else if (showCreateOption) {
          // Selected the create option
          handleCreate();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input input-bordered w-full"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCreating}
        />
        {query && !isCreating && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setVendors([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isCreating && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="loading loading-spinner loading-sm"></span>
          </span>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-center text-base-content/60">
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Searching...
            </div>
          ) : (
            <ul className="py-1">
              {vendors.map((vendor, index) => (
                <li key={vendor.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(vendor)}
                    className={`w-full text-left px-4 py-2 hover:bg-base-200 ${
                      index === selectedIndex ? 'bg-base-200' : ''
                    }`}
                  >
                    <div className="font-medium">{vendor.name}</div>
                  </button>
                </li>
              ))}
              {showCreateOption && (
                <li>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className={`w-full text-left px-4 py-2 hover:bg-primary/10 text-primary ${
                      selectedIndex === vendors.length ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Plus className="h-4 w-4" />
                      Add &quot;{query.trim()}&quot;
                    </div>
                  </button>
                </li>
              )}
              {vendors.length === 0 && !showCreateOption && (
                <li className="p-3 text-center text-base-content/60">
                  No vendors found
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
