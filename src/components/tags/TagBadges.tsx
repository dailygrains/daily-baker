'use client';

import { X } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface TagBadgesProps {
  tags: Tag[];
  size?: 'sm' | 'md';
  onRemove?: (tagId: string) => void;
  isRemoving?: boolean;
}

const colorClasses: Record<string, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

export function TagBadges({
  tags,
  size = 'sm',
  onRemove,
  isRemoving = false,
}: TagBadgesProps) {
  if (tags.length === 0) {
    return null;
  }

  const sizeClass = size === 'sm' ? 'badge-sm' : '';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const colorClass = tag.color && colorClasses[tag.color] ? colorClasses[tag.color] : 'badge-ghost';

        return (
          <span
            key={tag.id}
            className={`badge ${colorClass} ${sizeClass} ${onRemove ? 'gap-1' : ''}`}
          >
            {tag.name}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(tag.id)}
                disabled={isRemoving}
                className="hover:text-base-content/70 transition-colors"
                aria-label={`Remove ${tag.name} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
