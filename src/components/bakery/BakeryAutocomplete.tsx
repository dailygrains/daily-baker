'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

interface Bakery {
  id: string;
  name: string;
  description: string | null;
  _count: {
    users: number;
  };
}

interface BakeryAutocompleteProps {
  value?: string | null; // Selected bakery ID
  onSelect: (bakeryId: string | null, bakeryName?: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  excludeBakeryIds?: string[]; // Bakeries to exclude from search (e.g., already assigned)
}

export function BakeryAutocomplete({
  value,
  onSelect,
  onError,
  disabled = false,
  placeholder = "Search bakeries...",
  className = "",
  excludeBakeryIds = [],
}: BakeryAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedBakery, setSelectedBakery] = useState<Bakery | null>(null);
  const [searchResults, setSearchResults] = useState<Bakery[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected bakery when value changes externally
  useEffect(() => {
    if (value && value !== selectedBakery?.id) {
      loadBakery(value);
    } else if (!value && selectedBakery) {
      setSelectedBakery(null);
      setInputValue('');
    }
  }, [value, selectedBakery]);

  // Load bakery by ID for initial state
  const loadBakery = async (bakeryId: string) => {
    try {
      const response = await fetch(`/api/bakeries/${bakeryId}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedBakery(result.data);
        setInputValue(result.data.name);
      }
    } catch (error) {
      console.error('Error loading bakery:', error);
    }
  };

  // Debounced search function
  const searchBakeries = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/bakeries?search=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success && result.data) {
        // Filter out excluded bakeries
        const filteredBakeries = result.data.filter(
          (bakery: Bakery) => !excludeBakeryIds.includes(bakery.id)
        );
        setSearchResults(filteredBakeries);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching bakeries:', error);
      onError('Failed to search bakeries');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear selected bakery if input doesn't match
    if (selectedBakery && newValue !== selectedBakery.name) {
      setSelectedBakery(null);
      onSelect(null);
    }

    // Open dropdown when typing
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchBakeries(newValue);
    }, 300);
  };

  // Handle bakery selection
  const handleSelectBakery = (bakery: Bakery) => {
    setSelectedBakery(bakery);
    setInputValue(bakery.name);
    setIsOpen(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
    onSelect(bakery.id, bakery.name);
  };

  // Handle clear selection
  const handleClear = () => {
    setSelectedBakery(null);
    setInputValue('');
    setIsOpen(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
    onSelect(null);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
          handleSelectBakery(searchResults[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle focus
  const handleFocus = () => {
    if (inputValue && !selectedBakery) {
      searchBakeries(inputValue);
      setIsOpen(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <fieldset className={`fieldset ${className}`}>
      <legend className="fieldset-legend">Assign Bakery</legend>

      <div className="relative">
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={`input input-bordered w-full pr-10 ${disabled ? 'input-disabled' : ''}`}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={isOpen ? "bakery-listbox" : undefined}
          />

          {/* Clear Button */}
          {(selectedBakery || inputValue) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="loading loading-spinner loading-xs"></span>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            id="bakery-listbox"
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
          >
            {isLoading ? (
              <div className="p-3 text-center">
                <span className="loading loading-spinner loading-xs"></span>
                <span className="ml-2 text-sm">Searching bakeries...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((bakery, index) => (
                <button
                  key={bakery.id}
                  type="button"
                  onClick={() => handleSelectBakery(bakery)}
                  className={`w-full text-left p-3 hover:bg-base-200 transition-colors ${
                    index === highlightedIndex ? 'bg-base-200' : ''
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === searchResults.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                  role="option"
                  aria-selected={selectedBakery?.id === bakery.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base-content truncate">
                        {bakery.name}
                      </div>
                      {bakery.description && (
                        <div className="text-sm text-base-content/60 truncate">
                          {bakery.description}
                        </div>
                      )}
                      <div className="text-xs text-base-content/50 truncate mt-1">
                        {bakery._count.users} user{bakery._count.users !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : inputValue.trim() ? (
              <div className="p-3 text-center text-base-content/60">
                <Search className="w-4 h-4 mx-auto mb-2" />
                <span className="text-sm">No bakeries found</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <label className="label">
        <span className="label-text-alt">Search by name</span>
      </label>
    </fieldset>
  );
}
