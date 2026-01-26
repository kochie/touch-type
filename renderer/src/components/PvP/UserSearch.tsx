"use client";

import { SearchUser, usePvP } from "@/lib/pvp-provider";
import { faSearch, faSpinner, faUser } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

interface UserSearchProps {
  onSelect: (user: SearchUser) => void;
  selectedUser?: SearchUser | null;
  placeholder?: string;
  className?: string;
}

export default function UserSearch({
  onSelect,
  selectedUser,
  placeholder = "Search for a user...",
  className,
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { searchUsers } = usePvP();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const users = await searchUsers(searchQuery);
    setResults(users);
    setIsSearching(false);
  }, [searchUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelect = (user: SearchUser) => {
    onSelect(user);
    setQuery("");
    setResults([]);
    setIsFocused(false);
  };

  const handleClear = () => {
    onSelect(null as unknown as SearchUser);
    setQuery("");
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedUser) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between p-3 rounded-lg",
          "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {selectedUser.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedUser.username}
            </p>
            {selectedUser.emailHint && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedUser.emailHint}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <div className="relative">
        <FontAwesomeIcon
          icon={isSearching ? faSpinner : faSearch}
          className={clsx(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400",
            isSearching && "animate-spin"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={clsx(
            "w-full pl-10 pr-4 py-3 rounded-lg",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "text-gray-900 dark:text-white placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "transition-all"
          )}
        />
      </div>

      {/* Results dropdown */}
      {isFocused && (results.length > 0 || (query.length >= 2 && !isSearching)) && (
        <div
          className={clsx(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-lg shadow-lg overflow-hidden"
          )}
        >
          {results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user)}
                    className={clsx(
                      "w-full flex items-center gap-3 p-3",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      "transition-colors text-left"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.username}
                      </p>
                      {user.displayName && user.displayName !== user.username && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.displayName}
                        </p>
                      )}
                    </div>
                    {user.emailHint && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {user.emailHint}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <FontAwesomeIcon icon={faUser} className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No users found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* Hint text */}
      {!isFocused && query.length === 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Search by username or email. Minimum 2 characters.
        </p>
      )}
    </div>
  );
}
