import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className = '', ...props }: TableProps) {
  return (
    <table className={`${className}`.trim()} {...props}>
      {children}
    </table>
  );
}

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHead({ children, className = '', ...props }: TableHeadProps) {
  return (
    <thead className={`${className}`.trim()} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className = '', ...props }: TableBodyProps) {
  return (
    <tbody className={`${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  isSelected?: boolean;
}

export function TableRow({ children, isSelected, className = '', ...props }: TableRowProps) {
  const rowClass = `${isSelected ? 'selected' : ''} ${className}`.trim();
  return (
    <tr className={rowClass || undefined} {...props}>
      {children}
    </tr>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  isSelected?: boolean;
  isEditing?: boolean;
}

export function TableCell({ children, isSelected, isEditing, className = '', ...props }: TableCellProps) {
  const cellClass = `${isSelected ? 'cell-selected' : ''} ${isEditing ? 'cell-editing' : ''} ${className}`.trim();
  return (
    <td className={cellClass || undefined} {...props}>
      {children}
    </td>
  );
}

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function TableHeaderCell({ children, icon, className = '', ...props }: TableHeaderCellProps) {
  return (
    <th className={`${className}`.trim()} {...props}>
      <span className="th-content">
        {icon && <span className="th-icon">{icon}</span>}
        {children}
      </span>
    </th>
  );
}
