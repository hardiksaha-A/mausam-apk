import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  as?: 'div' | 'section' | 'article';
  ariaLabel?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hoverEffect = false, as: Tag = 'div', ariaLabel }) => {
  return (
    <Tag
      aria-label={ariaLabel}
      className={`rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 sm:p-5 transition-colors duration-200 ${
        hoverEffect ? 'hover:bg-[var(--color-panel-hover)] hover:border-[var(--color-accent-teal)]/40' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; icon?: React.ElementType; action?: React.ReactNode }> = ({
  title,
  subtitle,
  icon: Icon,
  action,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="flex items-center gap-2.5">
      {Icon && (
        <span className="grid place-items-center size-9 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-accent-teal)] shrink-0">
          <Icon size={17} />
        </span>
      )}
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] tracking-wide">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
