'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatQuantity } from '@/lib/format';

interface Recipe {
  id: string;
  name: string;
  totalCost: number | null;
  yieldQty: number;
  yieldUnit: string;
}

interface RecipeAutocompleteProps {
  recipes: Recipe[];
  selectedRecipeId: string;
  excludeRecipeIds?: string[];
  onSelect: (recipe: Recipe) => void;
  onClear?: () => void;
  placeholder?: string;
}

export function RecipeAutocomplete({
  recipes,
  selectedRecipeId,
  excludeRecipeIds = [],
  onSelect,
  onClear,
  placeholder = 'Search recipes...',
}: RecipeAutocompleteProps) {
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const [query, setQuery] = useState(selectedRecipe?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter recipes based on query and exclusions
  const filteredRecipes = recipes.filter((recipe) => {
    // Don't exclude the currently selected recipe
    if (recipe.id !== selectedRecipeId && excludeRecipeIds.includes(recipe.id)) {
      return false;
    }
    if (!query) return true;
    return recipe.name.toLowerCase().includes(query.toLowerCase());
  });

  // Update query when selectedRecipeId changes externally
  useEffect(() => {
    const recipe = recipes.find((r) => r.id === selectedRecipeId);
    setQuery(recipe?.name || '');
  }, [selectedRecipeId, recipes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset query to selected recipe name if user clicked away
        const recipe = recipes.find((r) => r.id === selectedRecipeId);
        setQuery(recipe?.name || '');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedRecipeId, recipes]);

  const handleSelect = (recipe: Recipe) => {
    onSelect(recipe);
    setQuery(recipe.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredRecipes.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredRecipes.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredRecipes.length) % filteredRecipes.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredRecipes[selectedIndex]) {
          handleSelect(filteredRecipes[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        const recipe = recipes.find((r) => r.id === selectedRecipeId);
        setQuery(recipe?.name || '');
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="join w-full">
        <input
          ref={inputRef}
          type="text"
          className="input input-bordered input-sm join-item w-full"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        {(query || selectedRecipeId) && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-sm btn-ghost join-item"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {filteredRecipes.map((recipe, index) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(recipe)}
                  className={`w-full text-left px-4 py-2 hover:bg-base-200 ${
                    index === selectedIndex ? 'bg-base-200' : ''
                  }`}
                >
                  <div className="font-medium">{recipe.name}</div>
                  <div className="text-sm text-base-content/60">
                    {formatQuantity(recipe.yieldQty)} {recipe.yieldUnit}
                  </div>
                </button>
              </li>
            ))}
            {filteredRecipes.length === 0 && (
              <li className="p-3 text-center text-base-content/60">
                No recipes found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
