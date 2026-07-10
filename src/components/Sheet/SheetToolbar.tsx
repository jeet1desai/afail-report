import React from 'react';

interface SheetToolbarProps {
  /** Display name for the current view (e.g. "All Plants") */
  viewName: string;
  /** Total item count shown next to view name */
  count: number;
  /** Left-side extra content (after view name) */
  leftContent?: React.ReactNode;
  /** Right-side content (buttons, search, etc.) */
  children?: React.ReactNode;
}

/**
 * SheetToolbar — Toolbar bar above the data grid.
 * Shows "All Items · count" on left, action buttons on right.
 */
export function SheetToolbar({ viewName, count, leftContent, children }: SheetToolbarProps) {
  return (
    <div className="sheet-toolbar">
      <div className="sheet-toolbar__left">
        <div className="sheet-toolbar__view">
          <svg className="sheet-toolbar__view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          {viewName}
          <span className="sheet-toolbar__count">· {count}</span>
        </div>
        {leftContent}
      </div>
      <div className="sheet-toolbar__right">{children}</div>
    </div>
  );
}
