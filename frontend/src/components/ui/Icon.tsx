interface IconProps {
  name: string;
  className?: string;
}

export function Icon({ name, className = '' }: IconProps) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export const TimePeriodIcon = () => <Icon name="calendar_month" />;
export const StarIcon = () => <Icon name="star" />;
export const StarFilledIcon = () => <Icon name="star" className="text-dn-warning" />;
