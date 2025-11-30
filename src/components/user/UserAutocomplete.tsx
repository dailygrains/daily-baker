'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  bakery: {
    id: string;
    name: string;
  } | null;
  role: {
    id: string;
    name: string;
  } | null;
}

interface UserAutocompleteProps {
  value?: string | null; // Selected user ID
  onSelect: (userId: string | null, userName?: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  excludeUserIds?: string[]; // Users to exclude from search (e.g., already assigned)
}

export function UserAutocomplete({
  value,
  onSelect,
  onError,
  disabled = false,
  placeholder = "Search users...",
  className = "",
  excludeUserIds = [],
}: UserAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected user when value changes externally
  useEffect(() => {
    if (value && value !== selectedUser?.id) {
      loadUser(value);
    } else if (!value && selectedUser) {
      setSelectedUser(null);
      setInputValue('');
    }
  }, [value, selectedUser]);

  // Load user by ID for initial state
  const loadUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedUser(result.data);
        setInputValue(result.data.name || result.data.email);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Debounced search function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success && result.data) {
        // Filter out excluded users
        const filteredUsers = result.data.filter(
          (user: User) => !excludeUserIds.includes(user.id)
        );
        setSearchResults(filteredUsers);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      onError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear selected user if input doesn't match
    if (selectedUser && newValue !== selectedUser.name && newValue !== selectedUser.email) {
      setSelectedUser(null);
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
      searchUsers(newValue);
    }, 300);
  };

  // Handle user selection
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setInputValue(user.name || user.email);
    setIsOpen(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
    onSelect(user.id, user.name || user.email);
  };

  // Handle clear selection
  const handleClear = () => {
    setSelectedUser(null);
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
          handleSelectUser(searchResults[highlightedIndex]);
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
    if (inputValue && !selectedUser) {
      searchUsers(inputValue);
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
      <legend className="fieldset-legend">Assign User</legend>

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
            aria-controls={isOpen ? "user-listbox" : undefined}
          />

          {/* Clear Button */}
          {(selectedUser || inputValue) && !disabled && (
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
            id="user-listbox"
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
          >
            {isLoading ? (
              <div className="p-3 text-center">
                <span className="loading loading-spinner loading-xs"></span>
                <span className="ml-2 text-sm">Searching users...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-3 hover:bg-base-200 transition-colors ${
                    index === highlightedIndex ? 'bg-base-200' : ''
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === searchResults.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                  role="option"
                  aria-selected={selectedUser?.id === user.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base-content truncate">
                        {user.name || user.email}
                      </div>
                      {user.name && (
                        <div className="text-sm text-base-content/60 truncate">
                          {user.email}
                        </div>
                      )}
                      <div className="text-xs text-base-content/50 truncate mt-1">
                        {user.bakery ? (
                          <span>Primary bakery: {user.bakery.name}</span>
                        ) : (
                          <span>No bakery assignments</span>
                        )}
                      </div>
                    </div>
                    {user.role && (
                      <span className="text-xs text-base-content/50 flex-shrink-0">
                        {user.role.name}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : inputValue.trim() ? (
              <div className="p-3 text-center text-base-content/60">
                <Search className="w-4 h-4 mx-auto mb-2" />
                <span className="text-sm">No users found</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <label className="label">
        <span className="label-text-alt">Search by name or email</span>
      </label>
    </fieldset>
  );
}
