'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
  tagType?: {
    id: string;
    name: string;
  };
}

interface TagAutocompleteProps {
  bakeryId: string;
  onSelect: (tag: Tag) => void;
  excludeTagIds?: string[];
  tagTypeId?: string;
  placeholder?: string;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<Tag | null>;
}

export function TagAutocomplete({
  bakeryId,
  onSelect,
  excludeTagIds = [],
  tagTypeId,
  placeholder = 'Search tags...',
  allowCreate = false,
  onCreate,
}: TagAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if query exactly matches any tag name (case-insensitive)
  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === query.toLowerCase()
  );

  // Show create option if allowCreate is true, query has content, and no exact match
  const showCreateOption = allowCreate && onCreate && query.trim().length >= 2 && !exactMatch && !isLoading;

  // Total options count for keyboard navigation
  const totalOptions = tags.length + (showCreateOption ? 1 : 0);

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

          if (excludeTagIds.length > 0) {
            params.append('excludeIds', excludeTagIds.join(','));
          }

          if (tagTypeId) {
            params.append('tagTypeId', tagTypeId);
          }

          const response = await fetch(`/api/tags?${params}`);
          const data = await response.json();
          setTags(data.tags || []);
          setIsOpen(true);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Error fetching tags:', error);
          setTags([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setTags([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, bakeryId, excludeTagIds, tagTypeId]);

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

  const handleSelect = (tag: Tag) => {
    onSelect(tag);
    setQuery('');
    setTags([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!onCreate || !query.trim()) return;

    setIsCreating(true);
    try {
      const newTag = await onCreate(query.trim());
      if (newTag) {
        handleSelect(newTag);
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
        if (selectedIndex < tags.length) {
          // Selected a tag
          if (tags[selectedIndex]) {
            handleSelect(tags[selectedIndex]);
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
              setTags([]);
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
              {tags.map((tag, index) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(tag)}
                    className={`w-full text-left px-4 py-2 hover:bg-base-200 ${
                      index === selectedIndex ? 'bg-base-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tag.name}</span>
                      {tag.tagType && (
                        <span className="text-xs text-base-content/50">
                          {tag.tagType.name}
                        </span>
                      )}
                    </div>
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
                      selectedIndex === tags.length ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Plus className="h-4 w-4" />
                      Add &quot;{query.trim()}&quot;
                    </div>
                  </button>
                </li>
              )}
              {tags.length === 0 && !showCreateOption && (
                <li className="p-3 text-center text-base-content/60">
                  No tags found
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
