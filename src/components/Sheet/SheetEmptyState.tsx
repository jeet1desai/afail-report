import React from 'react';

interface SheetEmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Action button or any content below description */
  action?: React.ReactNode;
}

/**
 * SheetEmptyState — Shown when a data sheet has no data.
 * Centered layout with icon, title, description, and optional action.
 */
export function SheetEmptyState({ icon, title, description, action }: SheetEmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__desc">{description}</p>
      {action}
    </div>
  );
}
