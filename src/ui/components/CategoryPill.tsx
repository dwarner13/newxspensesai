/**
 * CategoryPill Component
 *
 * Displays and allows editing of transaction categories with confidence scores.
 *
 * Features:
 * - Confidence color coding (red < 60% < yellow < 85% < green)
 * - Hierarchical category display (Parent > Child)
 * - Responsive design for mobile/desktop
 * - Accessible dropdown with keyboard support
 *
 * @example
 * <CategoryPill
 *   value={categoryId}
 *   onChange={handleCategoryChange}
 *   confidence={0.92}
 *   editable={true}
 * />
 */

import React, { useEffect, useState, useRef } from 'react';
import type { Category, CategoryPillProps } from '@/types/tag';
import { fetchCategoriesTree, fetchCategoryById, getCategoryPath } from '@/lib/categories';

export const CategoryPill: React.FC<
  CategoryPillProps & {
    value?: string | null;
    onChange?: (categoryId: string | null) => void;
  }
> = ({
  categoryId: propCategoryId,
  value = propCategoryId,
  categoryName: propCategoryName,
  confidence,
  editable = true,
  onEdit,
  onChange,
  compact = false,
  userId,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load categories on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchCategoriesTree(userId)
      .then((cats) => {
        if (mounted) setCategories(cats);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Load selected category details when value changes
  useEffect(() => {
    let mounted = true;

    if (value) {
      fetchCategoryById(value).then((cat) => {
        if (mounted) {
          setSelectedCat(cat);
          if (cat) {
            getCategoryPath(cat.id, userId).then((path) => {
              if (mounted) setCategoryPath(path);
            });
          }
        }
      });
    } else {
      setSelectedCat(null);
      setCategoryPath([]);
    }

    return () => {
      mounted = false;
    };
  }, [value, userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Confidence color
  const confidencePct =
    typeof confidence === 'number' ? Math.round(confidence * 100) : null;
  const getConfidenceColor = () => {
    if (confidencePct === null) return 'bg-slate-300';
    if (confidencePct >= 85) return 'bg-green-500';
    if (confidencePct >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getConfidenceText = () => {
    if (confidencePct === null) return '?';
    if (confidencePct >= 85) return '✓';
    if (confidencePct >= 60) return '⚠';
    return '✗';
  };

  // Display name
  const displayName = categoryPath.length > 0
    ? categoryPath.map((c) => c.name).join(' > ')
    : propCategoryName || selectedCat?.name || 'Uncategorized';

  // Filter categories based on search
  const filteredCategories = searchQuery
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const handleSelectCategory = (catId: string | null) => {
    if (onChange) onChange(catId);
    if (onEdit) onEdit(catId || '');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && searchQuery) {
      const filtered = filteredCategories;
      if (filtered.length > 0) {
        handleSelectCategory(filtered[0].id);
      }
    }
  };

  // Compact view for tables
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        {confidencePct !== null && (
          <div
            className={`h-3 w-3 rounded-full ${getConfidenceColor()} flex-shrink-0`}
            title={`Confidence: ${confidencePct}%`}
          />
        )}
        <span className="text-sm font-medium text-slate-700 truncate">
          {displayName}
        </span>
        {confidencePct !== null && (
          <span className="text-xs text-slate-500">{confidencePct}%</span>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!editable || loading}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border
          transition-all duration-200
          ${
            editable && !loading
              ? 'hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-300'}
        `}
        title={displayName}
      >
        {/* Confidence indicator */}
        <div className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full ${getConfidenceColor()} flex-shrink-0`}
            title={
              confidencePct !== null
                ? `Confidence: ${confidencePct}%`
                : 'No confidence data'
            }
          />
          <span className="text-xs font-semibold text-slate-600">
            {getConfidenceText()}
          </span>
        </div>

        {/* Category name */}
        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
          {displayName}
        </span>

        {/* Confidence %*/}
        {confidencePct !== null && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {confidencePct}%
          </span>
        )}

        {/* Dropdown chevron */}
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category list */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {/* Uncategorized option */}
            <li>
              <button
                onClick={() => handleSelectCategory(null)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors ${
                  !value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'
                }`}
              >
                — Uncategorized —
              </button>
            </li>

            {/* Category options */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 ${
                      value === cat.id
                        ? 'bg-blue-50 font-semibold text-blue-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>
                      {cat.parent_id ? '  └ ' : ''}
                      {cat.name}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500 text-center">
                No categories found
              </li>
            )}
          </ul>

          {/* Footer info */}
          <div className="border-t border-slate-100 px-3 py-1 text-xs text-slate-500">
            {filteredCategories.length} available
          </div>
        </div>
      )}
    </div>
  );
};

CategoryPill.displayName = 'CategoryPill';
