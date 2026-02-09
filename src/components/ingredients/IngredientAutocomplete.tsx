'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';

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
  /** Allow creating new ingredients inline when not found */
  allowCreate?: boolean;
  /** Callback when creating a new ingredient. Returns the created ingredient or null if failed. */
  onCreate?: (name: string, unit: string) => Promise<Ingredient | null>;
}

const UNIT_OPTIONS = [
  { group: 'Weight', options: [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lb', label: 'Pounds (lb)' },
  ]},
  { group: 'Volume', options: [
    { value: 'ml', label: 'Milliliters (mL)' },
    { value: 'l', label: 'Liters (L)' },
    { value: 'gal', label: 'Gallons' },
    { value: 'qt', label: 'Quarts' },
    { value: 'pint', label: 'Pints' },
    { value: 'cup', label: 'Cups' },
    { value: 'fl-oz', label: 'Fluid Ounces (fl oz)' },
    { value: 'tbsp', label: 'Tablespoons' },
    { value: 'tsp', label: 'Teaspoons' },
  ]},
  { group: 'Count', options: [
    { value: 'unit', label: 'Each' },
    { value: 'dozen', label: 'Dozen' },
  ]},
];

export function IngredientAutocomplete({
  ingredients,
  onSelect,
  excludeIds = [],
  placeholder = 'Search ingredients...',
  value = '',
  allowCreate = false,
  onCreate,
}: IngredientAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createUnit, setCreateUnit] = useState('');
  const [isCreating, setIsCreating] = useState(false);
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

  // Check if query exactly matches any ingredient name (case-insensitive)
  const exactMatch = useMemo(() => {
    if (!query.trim()) return true;
    return ingredients.some(
      (ing) => ing.name.toLowerCase() === query.toLowerCase()
    );
  }, [ingredients, query]);

  // Show create option if allowCreate is true, query has content, and no exact match
  const showCreateOption = allowCreate && onCreate && query.trim().length >= 2 && !exactMatch;

  // Total options count for keyboard navigation
  const totalOptions = filteredIngredients.length + (showCreateOption ? 1 : 0);

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
  }, [filteredIngredients.length, showCreateOption]);

  const handleSelect = (ingredient: Ingredient) => {
    onSelect(ingredient);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleOpenCreateModal = () => {
    const trimmed = query.trim();
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    setCreateName(capitalized);
    setCreateUnit('');
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!onCreate || !createName.trim() || !createUnit) return;

    setIsCreating(true);
    try {
      const newIngredient = await onCreate(createName.trim(), createUnit);
      if (newIngredient) {
        setShowCreateModal(false);
        handleSelect(newIngredient);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || totalOptions === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

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
        if (selectedIndex < filteredIngredients.length) {
          if (filteredIngredients[selectedIndex]) {
            handleSelect(filteredIngredients[selectedIndex]);
          }
        } else if (showCreateOption) {
          handleOpenCreateModal();
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
    <>
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="input input-bordered w-full text-base"
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(ingredient);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-base-200 ${
                      index === selectedIndex ? 'bg-base-200' : ''
                    }`}
                  >
                    <div className="font-medium">{ingredient.name}</div>
                    <div className="text-sm text-base-content/60">{ingredient.unit}</div>
                  </button>
                </li>
              ))}
              {showCreateOption && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleOpenCreateModal();
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-primary/10 text-primary ${
                      selectedIndex === filteredIngredients.length ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Plus className="h-4 w-4" />
                      Add &quot;{query.trim()}&quot;
                    </div>
                  </button>
                </li>
              )}
              {filteredIngredients.length === 0 && !showCreateOption && (
                <li className="p-3 text-center text-base-content/60">
                  No ingredients found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Create Ingredient Modal */}
      {showCreateModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New Ingredient</h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ingredient name"
                  autoFocus
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Unit</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={createUnit}
                  onChange={(e) => setCreateUnit(e.target.value)}
                >
                  <option value="">Select unit</option>
                  {UNIT_OPTIONS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={isCreating || !createName.trim() || !createUnit}
              >
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Ingredient'
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCreateModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
