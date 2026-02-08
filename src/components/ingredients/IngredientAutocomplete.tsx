'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface IngredientAutocompleteProps {
  ingredients: Ingredient[];
  onSelect: (ingredient: Ingredient) => void;
  excludeIds?: string[];
  placeholder?: string;
  value?: string;
}

export function IngredientAutocomplete({
  ingredients,
  onSelect,
  excludeIds = [],
  placeholder = 'Search ingredients...',
  value = '',
}: IngredientAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter ingredients based on query and exclusions
  const filteredIngredients = useMemo(() => {
    const available = ingredients.filter((ing) => !excludeIds.includes(ing.id));

    if (!query.trim()) {
      return available.slice(0, 10); // Show first 10 when no query
    }

    const lowerQuery = query.toLowerCase();
    return available
      .filter((ing) => ing.name.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [ingredients, excludeIds, query]);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle click outside to close dropdown
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

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredIngredients.length]);

  const handleSelect = (ingredient: Ingredient) => {
    onSelect(ingredient);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredIngredients.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredIngredients.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredIngredients.length) % filteredIngredients.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredIngredients[selectedIndex]) {
          handleSelect(filteredIngredients[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
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
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {filteredIngredients.map((ingredient, index) => (
              <li key={ingredient.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(ingredient)}
                  className={`w-full text-left px-4 py-2 hover:bg-base-200 ${
                    index === selectedIndex ? 'bg-base-200' : ''
                  }`}
                >
                  <div className="font-medium">{ingredient.name}</div>
                  <div className="text-sm text-base-content/60">{ingredient.unit}</div>
                </button>
              </li>
            ))}
            {filteredIngredients.length === 0 && (
              <li className="p-3 text-center text-base-content/60">
                No ingredients found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
