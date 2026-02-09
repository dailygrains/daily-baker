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

// Helper to determine if text should be light or dark based on background color
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  // Handle shorthand hex colors
  const fullHex = hex.length === 3
    ? hex.split('').map(c => c + c).join('')
    : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function TagBadges({
  tags,
  size = 'sm',
  onRemove,
  isRemoving = false,
}: TagBadgesProps) {
  if (tags.length === 0) {
    return null;
  }

  const sizeClass = size === 'sm' ? 'badge-sm' : 'text-sm';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const isHexColor = tag.color?.startsWith('#');
        const style = isHexColor
          ? {
              backgroundColor: tag.color!,
              color: getContrastColor(tag.color!),
            }
          : undefined;

        return (
          <span
            key={tag.id}
            className={`badge ${!isHexColor ? 'badge-ghost' : ''} ${sizeClass} ${onRemove ? 'gap-1' : ''}`}
            style={style}
          >
            {tag.name}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(tag.id)}
                disabled={isRemoving}
                className="hover:opacity-70 transition-opacity"
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
