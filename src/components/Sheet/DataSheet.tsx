import React, { useState, useEffect, useRef } from "react";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from "./SheetTable";

/* ===== Column Definition ===== */
export interface ColumnDef<T> {
  /** Unique key for the column (used as React key) */
  key: string;
  /** Column header label */
  label: string;
  /** Optional icon to show in the column header */
  icon?: React.ReactNode;
  /** CSS width (e.g. "22%", "200px"). Defaults to auto. */
  width?: string;
  /**
   * Render function for the cell content.
   * Receives the full row data and row index.
   * If not provided, tries to access row[key] as string.
   */
  render?: (row: T, index: number) => React.ReactNode;
}

/* ===== Props ===== */
interface DataSheetProps<T extends { id: string }> {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Data rows */
  data: T[];
  /** Currently selected row IDs */
  selectedRows?: Set<string>;
  /** Called when selection changes */
  onSelectionChange?: (selected: Set<string>) => void;
  /** Show row numbers (default: true) */
  showRowNumbers?: boolean;
  /** Show checkboxes (default: true) */
  showCheckboxes?: boolean;
  /** Content to show when data is empty */
  emptyState?: React.ReactNode;
  /** Called when a cell's value is modified */
  onCellChange?: (rowId: string, columnKey: string, newValue: string) => void;
}

/**
 * DataSheet — A spreadsheet-like data grid with:
 * - Checkbox column for row selection
 * - Row numbers
 * - Column headers with icons
 * - Hover states and selection highlighting
 * - Single-click cell selection & Arrow Key Navigation
 * - Double-click / Enter cell editing & Tab navigation
 * - Custom DOM Virtualization (Windowing) for handling 50,000+ rows without browser lag/crashes
 */
export function DataSheet<T extends { id: string }>({
  columns,
  data,
  selectedRows = new Set(),
  onSelectionChange,
  showRowNumbers = true,
  showCheckboxes = true,
  emptyState,
  onCellChange,
}: DataSheetProps<T>) {
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isReverting = useRef<boolean>(false);

  const rowHeight = 36; // --row-height value from index.css (36px)
  const bufferCount = 8; // buffer rows above and below the viewport for smooth scrolling

  // Filter & Sort state
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [tempChecked, setTempChecked] = useState<Set<string>>(new Set());
  
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Close filter popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setActiveFilterKey(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Processed data (filtered and sorted)
  const processedData = React.useMemo(() => {
    let filtered = data;
    for (const [colKey, activeSet] of Object.entries(filters)) {
      if (activeSet && activeSet.size > 0) {
        filtered = filtered.filter((row) => {
          const val = String((row as Record<string, unknown>)[colKey] ?? "");
          return activeSet.has(val);
        });
      }
    }

    if (sortConfig) {
      return [...filtered].sort((a, b) => {
        const valA = String((a as Record<string, unknown>)[sortConfig.key] ?? "");
        const valB = String((b as Record<string, unknown>)[sortConfig.key] ?? "");
        
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }
        return sortConfig.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }
    return filtered;
  }, [data, filters, sortConfig]);

  // Monitor scroll container height dynamically
  useEffect(() => {
    if (tableContainerRef.current) {
      setContainerHeight(tableContainerRef.current.clientHeight);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      observer.observe(tableContainerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Auto-focus input and select all text inside when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Keep selected cell visible (scroll into view if navigated with arrow keys)
  useEffect(() => {
    if (selectedCell && tableContainerRef.current) {
      const container = tableContainerRef.current;
      const { rowIndex } = selectedCell;
      const rowTop = rowIndex * rowHeight;
      const rowBottom = rowTop + rowHeight;
      const stickyHeaderHeight = rowHeight;

      if (container.scrollTop > rowTop - stickyHeaderHeight) {
        container.scrollTop = rowTop - stickyHeaderHeight;
      } else if (container.scrollTop < rowBottom - container.clientHeight) {
        container.scrollTop = rowBottom - container.clientHeight;
      }
    }
  }, [selectedCell]);

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedRows.size === processedData.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(processedData.map((row) => row.id)));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const saveEdit = (rowIndex: number, colIndex: number, val: string) => {
    if (!onCellChange) return;
    const row = processedData[rowIndex];
    const col = columns[colIndex];
    if (row && col) {
      onCellChange(row.id, col.key, val);
    }
  };

  const handleEscape = () => {
    isReverting.current = true;
    setEditingCell(null);
    tableContainerRef.current?.focus();
  };

  const handleBlur = () => {
    if (isReverting.current) {
      isReverting.current = false;
      return;
    }
    if (editingCell) {
      saveEdit(editingCell.rowIndex, editingCell.colIndex, editValue);
      setEditingCell(null);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    tableContainerRef.current?.focus();
    if (selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex) {
      // Clicked already selected cell -> enter edit mode
      setEditingCell({ rowIndex, colIndex });
      const row = processedData[rowIndex];
      const col = columns[colIndex];
      setEditValue(String((row as Record<string, unknown>)[col.key] ?? ""));
    } else {
      setSelectedCell({ rowIndex, colIndex });
      setEditingCell(null);
    }
  };

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    setEditingCell({ rowIndex, colIndex });
    const row = processedData[rowIndex];
    const col = columns[colIndex];
    setEditValue(String((row as Record<string, unknown>)[col.key] ?? ""));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Handlers when in Edit Mode
    if (editingCell) {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(editingCell.rowIndex, editingCell.colIndex, editValue);
        setEditingCell(null);
        // Move focus down
        const nextRowIndex = Math.min(processedData.length - 1, editingCell.rowIndex + 1);
        setSelectedCell({ rowIndex: nextRowIndex, colIndex: editingCell.colIndex });
        tableContainerRef.current?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleEscape();
      } else if (e.key === "Tab") {
        e.preventDefault();
        saveEdit(editingCell.rowIndex, editingCell.colIndex, editValue);
        setEditingCell(null);
        // Move selection right/left
        if (e.shiftKey) {
          const nextColIndex = Math.max(0, editingCell.colIndex - 1);
          setSelectedCell({ rowIndex: editingCell.rowIndex, colIndex: nextColIndex });
        } else {
          const nextColIndex = Math.min(columns.length - 1, editingCell.colIndex + 1);
          setSelectedCell({ rowIndex: editingCell.rowIndex, colIndex: nextColIndex });
        }
        tableContainerRef.current?.focus();
      }
      return; // Ignore other grid navigation keys when editing
    }

    // 2. Handlers when in View Mode (Selection only)
    if (!selectedCell) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedCell({ rowIndex: 0, colIndex: 0 });
      }
      return;
    }

    const { rowIndex, colIndex } = selectedCell;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCell({ rowIndex: Math.max(0, rowIndex - 1), colIndex });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedCell({ rowIndex: Math.min(processedData.length - 1, rowIndex + 1), colIndex });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedCell({ rowIndex, colIndex: Math.max(0, colIndex - 1) });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedCell({ rowIndex, colIndex: Math.min(columns.length - 1, colIndex + 1) });
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedCell({ rowIndex, colIndex: Math.max(0, colIndex - 1) });
      } else {
        setSelectedCell({ rowIndex, colIndex: Math.min(columns.length - 1, colIndex + 1) });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      setEditingCell({ rowIndex, colIndex });
      const row = processedData[rowIndex];
      const col = columns[colIndex];
      setEditValue(String((row as Record<string, unknown>)[col.key] ?? ""));
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      saveEdit(rowIndex, colIndex, "");
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Excel-style quick edit (typing a character starts edit mode with that character)
      e.preventDefault();
      setEditingCell({ rowIndex, colIndex });
      setEditValue(e.key);
    }
  };
  // Cache unique values of the active column to avoid recalculating on typing search or scroll
  const activeColUniqueValues = React.useMemo(() => {
    if (!activeFilterKey) return [];
    const allUnique = Array.from(new Set(data.map((row) => String((row as Record<string, unknown>)[activeFilterKey] ?? ""))));
    allUnique.sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    return allUnique;
  }, [data, activeFilterKey]);

  const toggleFilterMenu = (colKey: string) => {
    if (activeFilterKey === colKey) {
      setActiveFilterKey(null);
      return;
    }
    const allUnique = Array.from(new Set(data.map((row) => String((row as Record<string, unknown>)[colKey] ?? ""))));
    const activeFilter = filters[colKey];
    if (activeFilter && activeFilter.size > 0) {
      setTempChecked(new Set(activeFilter));
    } else {
      setTempChecked(new Set(allUnique));
    }
    setFilterSearch("");
    setActiveFilterKey(colKey);
  };

  const getVisibleUniqueValues = () => {
    if (!filterSearch) return activeColUniqueValues;
    const search = filterSearch.toLowerCase();
    return activeColUniqueValues.filter((v) => v.toLowerCase().includes(search));
  };

  const applyColumnFilter = (colKey: string) => {
    const allUnique = activeColUniqueValues;
    const nextFilters = { ...filters };
    if (tempChecked.size === allUnique.length) {
      delete nextFilters[colKey];
    } else {
      nextFilters[colKey] = new Set(tempChecked);
    }
    setFilters(nextFilters);
    setActiveFilterKey(null);
  };
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Calculate virtualization variables
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferCount);
  const endIndex = Math.min(processedData.length - 1, Math.floor((scrollTop + containerHeight) / rowHeight) + bufferCount);

  const visibleData = processedData.slice(startIndex, endIndex + 1);
  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (processedData.length - endIndex - 1) * rowHeight);

  const totalCols = columns.length + (showCheckboxes ? 1 : 0) + (showRowNumbers ? 1 : 0);

  return (
    <>
      {Object.keys(filters).length > 0 && (
        <div style={{
          background: "var(--accent-blue-light)",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--accent-blue)", fontWeight: 500 }}>
            {Object.keys(filters).length} active filter(s) applied
          </span>
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={() => {
              setFilters({});
              setActiveFilterKey(null);
            }}
            style={{ background: "#fff" }}
          >
            Clear All Filters
          </button>
        </div>
      )}
      <div
        className="sheet"
        ref={tableContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        style={{ outline: "none", position: "relative" }}
      >
        <Table style={{ width: "max-content", minWidth: "100%" }}>
        <TableHead>
          <TableRow>
            {showCheckboxes && (
              <th className="col-checkbox">
                <input type="checkbox" checked={selectedRows.size === processedData.length && processedData.length > 0} onChange={toggleSelectAll} />
              </th>
            )}
            {showRowNumbers && <th className="col-rownum">#</th>}
            {columns.map((col) => {
              const isFilterActive = filters[col.key] && filters[col.key].size > 0;
              const isSortedActive = sortConfig?.key === col.key;
              const isMenuOpen = activeFilterKey === col.key;
              const visibleVals = isMenuOpen ? getVisibleUniqueValues() : [];

              return (
                <TableHeaderCell
                  key={col.key}
                  icon={col.icon}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="th-content">
                    <span style={{ marginRight: "12px" }}>{col.label}</span>
                    
                    {/* Filter Trigger Button */}
                    <button
                      className={`th-filter-btn ${isFilterActive || isSortedActive || isMenuOpen ? 'th-filter-btn--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFilterMenu(col.key);
                      }}
                      title="Filter / Sort"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </span>
                  
                  {/* Excel Filter Popover Overlay */}
                  {isMenuOpen && (
                    <div className="filter-popover" ref={filterPopoverRef} onClick={(e) => e.stopPropagation()}>
                      {/* Sort Section */}
                      <div className="filter-popover__sort-section">
                        <button
                          className="filter-popover__sort-btn"
                          onClick={() => {
                            setSortConfig({ key: col.key, direction: "asc" });
                            setActiveFilterKey(null);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <polyline points="19 12 12 19 5 12" />
                          </svg>
                          Sort A to Z (Asc)
                        </button>
                        <button
                          className="filter-popover__sort-btn"
                          onClick={() => {
                            setSortConfig({ key: col.key, direction: "desc" });
                            setActiveFilterKey(null);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                          </svg>
                          Sort Z to A (Desc)
                        </button>
                        {isSortedActive && (
                          <button
                            className="filter-popover__sort-btn"
                            style={{ color: "var(--accent-red)", fontWeight: 500 }}
                            onClick={() => {
                              setSortConfig(null);
                              setActiveFilterKey(null);
                            }}
                          >
                            Clear Sort
                          </button>
                        )}
                        {isFilterActive && (
                          <button
                            className="filter-popover__sort-btn"
                            style={{ color: "var(--accent-red)", fontWeight: 500 }}
                            onClick={() => {
                              const nextFilters = { ...filters };
                              delete nextFilters[col.key];
                              setFilters(nextFilters);
                              setActiveFilterKey(null);
                            }}
                          >
                            Clear Filter
                          </button>
                        )}
                      </div>
                      
                      {/* Search box */}
                      <div className="filter-popover__search">
                        <input
                          type="text"
                          placeholder="Search unique values..."
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                        />
                      </div>
                      
                      {/* Scrollable list of checkboxes */}
                      <div className="filter-popover__list">
                        <label className="filter-popover__item">
                          <input
                            type="checkbox"
                            checked={visibleVals.length > 0 && visibleVals.every(v => tempChecked.has(v))}
                            onChange={(e) => {
                              const nextTemp = new Set(tempChecked);
                              if (e.target.checked) {
                                visibleVals.forEach(v => nextTemp.add(v));
                              } else {
                                visibleVals.forEach(v => nextTemp.delete(v));
                              }
                              setTempChecked(nextTemp);
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>Select All</span>
                        </label>
                        
                        {visibleVals.map((val) => (
                          <label key={val} className="filter-popover__item" title={val || "(Blank)"}>
                            <input
                              type="checkbox"
                              checked={tempChecked.has(val)}
                              onChange={() => {
                                const nextTemp = new Set(tempChecked);
                                if (nextTemp.has(val)) {
                                  nextTemp.delete(val);
                                } else {
                                  nextTemp.add(val);
                                }
                                setTempChecked(nextTemp);
                              }}
                            />
                            <span>{val || "(Blank)"}</span>
                          </label>
                        ))}
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="filter-popover__footer">
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => setActiveFilterKey(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => {
                            applyColumnFilter(col.key);
                          }}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {topSpacerHeight > 0 && (
            <tr style={{ height: `${topSpacerHeight}px` }}>
              <td colSpan={totalCols} style={{ padding: 0, height: `${topSpacerHeight}px`, border: "none", background: "transparent" }} />
            </tr>
          )}
          {visibleData.map((row, relativeIndex) => {
            const index = startIndex + relativeIndex;
            const isRowSelected = selectedRows.has(row.id);
            return (
              <TableRow key={row.id} isSelected={isRowSelected}>
                {showCheckboxes && (
                  <td className="col-checkbox">
                    <input type="checkbox" checked={isRowSelected} onChange={() => toggleRow(row.id)} />
                  </td>
                )}
                {showRowNumbers && <td className="col-rownum">{index + 1}</td>}
                {columns.map((col, colIndex) => {
                  const isCellSelected = selectedCell?.rowIndex === index && selectedCell?.colIndex === colIndex;
                  const isCellEditing = editingCell?.rowIndex === index && editingCell?.colIndex === colIndex;

                  return (
                    <TableCell
                      key={col.key}
                      isSelected={isCellSelected}
                      isEditing={isCellEditing}
                      onClick={() => handleCellClick(index, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(index, colIndex)}
                    >
                      {isCellEditing ? (
                        <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleBlur} />
                      ) : col.render ? (
                        col.render(row, index)
                      ) : (
                        String((row as Record<string, unknown>)[col.key] ?? "")
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          {bottomSpacerHeight > 0 && (
            <tr style={{ height: `${bottomSpacerHeight}px` }}>
              <td colSpan={totalCols} style={{ padding: 0, height: `${bottomSpacerHeight}px`, border: "none", background: "transparent" }} />
            </tr>
          )}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
