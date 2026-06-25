import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * SearchInput — Search field with magnifying glass icon.
 * Use inside SheetToolbar's children for the right-side actions.
 */
export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="search-input-wrapper">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ===== Cell Renderers ===== */

interface CellBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * CellBadge — Render cell content as a styled badge/chip.
 *
 * Usage:
 * ```tsx
 * render: (row) => <CellBadge variant="info">{row.code}</CellBadge>
 * ```
 */
export function CellBadge({ children, variant = 'default' }: CellBadgeProps) {
  const className = variant === 'default' ? 'cell-badge' : `badge badge--${variant}`;
  return <span className={className}>{children}</span>;
}

interface CellLinkProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * CellLink — Render cell content as a clickable link.
 */
export function CellLink({ href, onClick, children }: CellLinkProps) {
  return (
    <a className="cell-link" href={href} onClick={onClick}>
      {children}
    </a>
  );
}

/* ===== Toolbar Button ===== */

interface ToolbarButtonProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  id?: string;
}

/**
 * ToolbarButton — Button styled for use in the SheetToolbar.
 */
export function ToolbarButton({
  icon,
  children,
  onClick,
  variant = 'default',
  size = 'sm',
  disabled = false,
  id,
}: ToolbarButtonProps) {
  const variantClass = variant === 'default' ? 'sheet-toolbar__btn' : `btn btn--${variant}`;
  const sizeClass = size === 'sm' ? 'btn--sm' : '';

  return (
    <button
      className={`${variantClass} ${sizeClass}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      id={id}
    >
      {icon}
      {children}
    </button>
  );
}
