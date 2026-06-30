import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/models';
import { getIconColorClass } from '@/lib/iconColors';

import { twMerge } from 'tailwind-merge';

interface CategoryIconProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-full' | 'rounded-none';
  /** Overrides the category's own color (and the default primary tint). */
  colorClass?: string;
  className?: string;
}

const DEFAULT_COLOR_CLASS = 'bg-dn-primary/10 text-dn-primary';

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 'text-sm', text: 'text-xs' },
  md: { container: 'w-10 h-10', icon: 'text-base', text: 'text-sm' },
  lg: { container: 'w-12 h-12', icon: 'text-xl', text: 'text-base' },
};

export function CategoryIcon({
  category,
  size = 'md',
  shape = 'rounded-2xl',
  colorClass,
  className = '',
}: CategoryIconProps) {
  const { container, icon: iconSize, text: textSize } = sizeMap[size];

  const effectiveColorClass = colorClass ?? getIconColorClass(category.color) ?? DEFAULT_COLOR_CLASS;

  return (
    <div
      className={twMerge(
        `${container} flex items-center justify-center ${shape} shrink-0 font-bold ${textSize}`,
        effectiveColorClass,
        className
      )}
    >
      {category.icon ? (
        <Icon name={category.icon} className={iconSize} />
      ) : (
        <Icon name="question_mark" className={iconSize} />
      )}
    </div>
  );
}
