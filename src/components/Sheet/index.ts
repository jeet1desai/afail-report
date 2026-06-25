/**
 * Sheet Component Library
 *
 * A Twenty-style spreadsheet UI component system.
 * Copy this entire `Sheet/` folder + the CSS to reuse in any React project.
 *
 * Components:
 *   Sheet          — Root layout container
 *   SheetToolbar   — Toolbar with view name, count, and action buttons
 *   DataSheet      — Data grid with columns, selection, row numbers
 *   SheetEmptyState— Empty state placeholder
 *   SearchInput    — Search field for toolbar
 *   CellBadge      — Badge/chip renderer for cells
 *   CellLink       — Link renderer for cells
 *   ToolbarButton  — Styled button for toolbar actions
 *
 * Usage:
 * ```tsx
 * import {
 *   Sheet, SheetToolbar, DataSheet, SheetEmptyState,
 *   SearchInput, CellBadge, ToolbarButton
 * } from './components/Sheet';
 *
 * <Sheet>
 *   <SheetToolbar viewName="All Users" count={users.length}>
 *     <SearchInput value={search} onChange={setSearch} />
 *     <ToolbarButton variant="primary" onClick={add}>+ New</ToolbarButton>
 *   </SheetToolbar>
 *   <DataSheet
 *     columns={[
 *       { key: 'name', label: 'Name', width: '30%' },
 *       { key: 'email', label: 'Email', render: (row) => <CellBadge>{row.email}</CellBadge> },
 *     ]}
 *     data={users}
 *     selectedRows={selected}
 *     onSelectionChange={setSelected}
 *     emptyState={<SheetEmptyState title="No users" description="Add users to get started" />}
 *   />
 * </Sheet>
 * ```
 */

export { Sheet } from './Sheet';
export { SheetToolbar } from './SheetToolbar';
export { DataSheet } from './DataSheet';
export type { ColumnDef } from './DataSheet';
export { SheetEmptyState } from './SheetEmptyState';
export { SearchInput, CellBadge, CellLink, ToolbarButton } from './SheetParts';
export { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from './SheetTable';

