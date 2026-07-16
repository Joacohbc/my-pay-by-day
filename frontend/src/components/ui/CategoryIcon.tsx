import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/models';

import { twMerge } from 'tailwind-merge';

interface CategoryIconProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-full' | 'rounded-none';
  /** Tailwind color classes applied to the container. Defaults to primary tint. */
  colorClass?: string;
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 'text-sm', text: 'text-xs' },
  md: { container: 'w-10 h-10', icon: 'text-base', text: 'text-sm' },
  lg: { container: 'w-12 h-12', icon: 'text-xl', text: 'text-base' },
};

export function CategoryIcon({
  category,
  size = 'md',
  shape = 'rounded-2xl',
  colorClass = 'bg-dn-primary/10 text-dn-primary',
  className = '',
}: CategoryIconProps) {
  const { container, icon: iconSize, text: textSize } = sizeMap[size];

  const customColorStyle = category.color
    ? { color: category.color, backgroundColor: `${category.color}1A` }
    : undefined;

  return (
    <div
      className={twMerge(
        `${container} flex items-center justify-center ${shape} shrink-0 font-bold ${textSize}`,
        customColorStyle ? '' : colorClass,
        className
      )}
      style={customColorStyle}
    >
      {category.icon ? (
        <Icon name={category.icon} className={iconSize} />
      ) : (
        <Icon name="question_mark" className={iconSize} />
      )}
    </div>
  );
}
