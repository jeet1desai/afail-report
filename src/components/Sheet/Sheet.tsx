import React from 'react';

interface SheetProps {
  children: React.ReactNode;
}

/**
 * Sheet — Root container for the spreadsheet-like layout.
 * Wraps toolbar + data grid into a full-height flex column.
 */
export function Sheet({ children }: SheetProps) {
  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>{children}</div>;
}
