import React, { useState, useEffect, useMemo, useRef, memo } from "react";
import { storageService } from "../services/storage";
import type { MainSheetEntry } from "../types/mainSheet";

const MultiSelectDropdown = memo(
  ({
    label,
    options,
    selected,
    onChange,
  }: {
    label: string;
    options: string[];
    selected: Set<string> | null;
    onChange: (s: Set<string>) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const filteredOptions = useMemo(() => {
      if (!search) return options;
      return options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const activeSelected = selected || new Set(options);
    const allSelected = filteredOptions.every((o) => activeSelected.has(o)) && filteredOptions.length > 0;

    const toggleAll = () => {
      const next = new Set(activeSelected);
      if (allSelected) {
        filteredOptions.forEach((o) => next.delete(o));
      } else {
        filteredOptions.forEach((o) => next.add(o));
      }
      onChange(next);
    };

    const toggleOne = (val: string) => {
      const next = new Set(activeSelected);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      onChange(next);
    };

    return (
      <div className="filter-group" ref={ref} style={{ position: "relative" }}>
        <label>{label}</label>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            background: "var(--bg-primary)",
            textAlign: "left",
            cursor: "pointer",
            minWidth: "180px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--text-primary)",
            fontSize: "0.85rem",
          }}
        >
          <span>
            {activeSelected.size === options.length
              ? "All Selected"
              : activeSelected.size === 0
                ? "None Selected"
                : `${activeSelected.size} Selected`}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="filter-popover" style={{ top: "100%", left: 0, marginTop: "4px" }}>
            <div className="filter-popover__search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="filter-popover__list">
              {filteredOptions.length > 0 && (
                <label className="filter-popover__item">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span style={{ fontWeight: 900 }}>Select All</span>
                </label>
              )}
              {filteredOptions.map((o) => (
                <label key={o} className="filter-popover__item">
                  <input type="checkbox" checked={activeSelected.has(o)} onChange={() => toggleOne(o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default function PivotReportPage() {
  const [entries, setEntries] = useState<MainSheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion states
  const [showTable1, setShowTable1] = useState(true);
  const [showTable2, setShowTable2] = useState(true);
  const [collapsedYears1, setCollapsedYears1] = useState<Set<string>>(new Set());
  const [collapsedYears2, setCollapsedYears2] = useState<Set<string>>(new Set());

  const toggleYear1 = (year: string) => {
    const next = new Set(collapsedYears1);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setCollapsedYears1(next);
  };

  const toggleYear2 = (year: string) => {
    const next = new Set(collapsedYears2);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setCollapsedYears2(next);
  };

  // Filters
  const [modeFilter, setModeFilter] = useState<Set<string> | null>(null);
  const [ctFlagFilter, setCtFlagFilter] = useState<Set<string> | null>(null);
  const [plantNameFilter, setPlantNameFilter] = useState<Set<string> | null>(null);
  const [shipToRegionFilter, setShipToRegionFilter] = useState<Set<string> | null>(null);

  useEffect(() => {
    async function load() {
      const data = await storageService.getAll<MainSheetEntry>("main_sheet");
      setEntries(data);
      setLoading(false);
    }
    load();
  }, []);

  // Unique filter options
  const modeOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.mode || "(blank)"))).sort(), [entries]);
  const ctFlagOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.ctFlag || "(blank)"))).sort(), [entries]);
  const plantNameOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.plantName || "(blank)"))).sort(), [entries]);
  const shipToRegionOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.shipToRegion || "(blank)"))).sort(), [entries]);

  // Filtered data
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (modeFilter && !modeFilter.has(e.mode || "(blank)")) return false;
      if (ctFlagFilter && !ctFlagFilter.has(e.ctFlag || "(blank)")) return false;
      if (plantNameFilter && !plantNameFilter.has(e.plantName || "(blank)")) return false;
      if (shipToRegionFilter && !shipToRegionFilter.has(e.shipToRegion || "(blank)")) return false;
      return true;
    });
  }, [entries, modeFilter, ctFlagFilter, plantNameFilter, shipToRegionFilter]);

  // Pivot 1: Year -> Act. Gds Mvmnt Date
  const pivot1 = useMemo(() => {
    const data: Record<string, { qty: number; count: number; dates: Record<string, { qty: number; count: number }> }> = {};
    let grandTotalQty = 0;
    let grandTotalCount = 0;

    for (const entry of filteredEntries) {
      const dateStr = entry.actGdsMvmntDate || "(blank)";
      const year = dateStr !== "(blank)" ? dateStr.substring(0, 4) : "(blank)";

      const qty = parseFloat(entry.billedQty) || 0;
      const docCount = entry.billingDocument ? 1 : 0;

      if (!data[year]) {
        data[year] = { qty: 0, count: 0, dates: {} };
      }
      if (!data[year].dates[dateStr]) {
        data[year].dates[dateStr] = { qty: 0, count: 0 };
      }

      data[year].qty += qty;
      data[year].count += docCount;
      data[year].dates[dateStr].qty += qty;
      data[year].dates[dateStr].count += docCount;

      grandTotalQty += qty;
      grandTotalCount += docCount;
    }

    // Sort years ascending
    const sortedYears = Object.keys(data).sort((a, b) => a.localeCompare(b));
    return { data, sortedYears, grandTotalQty, grandTotalCount };
  }, [filteredEntries]);

  // Pivot 2: Year -> Act. Gds Mvmnt Date -> columns: messageText2 -> Values: Count of Billing Document
  const pivot2 = useMemo(() => {
    const data: Record<string, { dates: Record<string, Record<string, number>> }> = {};
    const columnsSet = new Set<string>();

    // Total for columns across all rows
    const colGrandTotals: Record<string, number> = {};
    let overallGrandTotal = 0;

    for (const entry of filteredEntries) {
      if (!entry.billingDocument) continue; // Only count if billingDocument exists

      const dateStr = entry.actGdsMvmntDate || "(blank)";
      const year = dateStr !== "(blank)" ? dateStr.substring(0, 4) : "(blank)";
      const msgText2 = entry.messageText2 || "(blank)";

      columnsSet.add(msgText2);

      if (!data[year]) data[year] = { dates: {} };
      if (!data[year].dates[dateStr]) data[year].dates[dateStr] = {};

      data[year].dates[dateStr][msgText2] = (data[year].dates[dateStr][msgText2] || 0) + 1;

      colGrandTotals[msgText2] = (colGrandTotals[msgText2] || 0) + 1;
      overallGrandTotal++;
    }

    // Sort years ascending
    const sortedYears = Object.keys(data).sort((a, b) => a.localeCompare(b));
    const sortedCols = Array.from(columnsSet).sort();

    return { data, sortedYears, sortedCols, colGrandTotals, overallGrandTotal };
  }, [filteredEntries]);

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  return (
    <div className="pivot-report">
      {/* Filters Section */}
      <div className="pivot-report__filters">
        <MultiSelectDropdown label="Mode" options={modeOptions} selected={modeFilter} onChange={setModeFilter} />
        <MultiSelectDropdown label="Plant Name" options={plantNameOptions} selected={plantNameFilter} onChange={setPlantNameFilter} />
        <MultiSelectDropdown label="Ship To Region" options={shipToRegionOptions} selected={shipToRegionFilter} onChange={setShipToRegionFilter} />
        <MultiSelectDropdown label="CT Flag" options={ctFlagOptions} selected={ctFlagFilter} onChange={setCtFlagFilter} />
      </div>

      <div className="pivot-report__tables">
        {/* Table 1 */}
        <div className="pivot-table-container">
          <h2 className="pivot-table__title" onClick={() => setShowTable1(!showTable1)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", userSelect: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTable1 ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Delivery by Date
          </h2>
          {showTable1 && (
            <table className="pivot-table">
              <thead>
                <tr>
                  <th>Row Labels</th>
                  <th className="num-col">Sum of Billed Qty</th>
                  <th className="num-col">Count of Billing Document</th>
                </tr>
              </thead>
              <tbody>
                {pivot1.sortedYears.map((year) => {
                  const yearData = pivot1.data[year];
                  const sortedDates = Object.keys(yearData.dates).sort((a, b) => {
                    if (a === "(blank)") return 1;
                    if (b === "(blank)") return -1;
                    const tA = new Date(a).getTime();
                    const tB = new Date(b).getTime();
                    if (isNaN(tA) || isNaN(tB)) return a.localeCompare(b);
                    return tA - tB;
                  });
                  const isCollapsed = collapsedYears1.has(year);
                  return (
                    <React.Fragment key={year}>
                      <tr className="pivot-table__row--group" onClick={() => toggleYear1(year)} style={{ cursor: "pointer", userSelect: "none" }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: !isCollapsed ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <strong>{year}</strong>
                          </div>
                        </td>
                      <td className="num-col">
                        <strong>{Math.round(yearData.qty)}</strong>
                      </td>
                      <td className="num-col">
                        <strong>{yearData.count}</strong>
                      </td>
                    </tr>
                    {!isCollapsed && sortedDates.map((date) => (
                      <tr key={date} className="pivot-table__row--detail">
                        <td className="indent">{date}</td>
                        <td className="num-col">{Math.round(yearData.dates[date].qty)}</td>
                        <td className="num-col">{yearData.dates[date].count}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pivot-table__row--total">
                <td>Grand Total</td>
                <td className="num-col">{Math.round(pivot1.grandTotalQty)}</td>
                <td className="num-col">{pivot1.grandTotalCount}</td>
              </tr>
            </tfoot>
            </table>
          )}
        </div>

        {/* Table 2 */}
        <div className="pivot-table-container">
          <h2 className="pivot-table__title" onClick={() => setShowTable2(!showTable2)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", userSelect: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTable2 ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Count of Billing Document by Message Text 2
          </h2>
          {showTable2 && (
            <table className="pivot-table">
              <thead>
                <tr>
                  <th>Row Labels</th>
                  {pivot2.sortedCols.map((col) => (
                    <th key={col} className="num-col">
                      {col}
                    </th>
                  ))}
                  <th className="num-col">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {pivot2.sortedYears.map((year) => {
                  const yearData = pivot2.data[year];
                  const sortedDates = Object.keys(yearData.dates).sort((a, b) => {
                    if (a === "(blank)") return 1;
                    if (b === "(blank)") return -1;
                    const tA = new Date(a).getTime();
                    const tB = new Date(b).getTime();
                    if (isNaN(tA) || isNaN(tB)) return a.localeCompare(b);
                    return tA - tB;
                  });
  
                  // Calculate year totals
                  const yearTotals: Record<string, number> = {};
                  let yearGrandTotal = 0;
  
                  for (const d of sortedDates) {
                    for (const c of pivot2.sortedCols) {
                      const val = yearData.dates[d][c] || 0;
                      yearTotals[c] = (yearTotals[c] || 0) + val;
                      yearGrandTotal += val;
                    }
                  }
  
                  const isCollapsed = collapsedYears2.has(year);

                  return (
                    <React.Fragment key={year}>
                      <tr className="pivot-table__row--group" onClick={() => toggleYear2(year)} style={{ cursor: "pointer", userSelect: "none" }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: !isCollapsed ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <strong>{year}</strong>
                          </div>
                        </td>
                      {pivot2.sortedCols.map((col) => (
                        <td key={col} className="num-col">
                          <strong>{yearTotals[col] || ""}</strong>
                        </td>
                      ))}
                      <td className="num-col">
                        <strong>{yearGrandTotal || ""}</strong>
                      </td>
                    </tr>
                    {!isCollapsed && sortedDates.map((date) => {
                      let dateTotal = 0;
                      for (const c of pivot2.sortedCols) {
                        dateTotal += yearData.dates[date][c] || 0;
                      }
                      return (
                        <tr key={date} className="pivot-table__row--detail">
                          <td className="indent">{date}</td>
                          {pivot2.sortedCols.map((col) => (
                            <td key={col} className="num-col">
                              {yearData.dates[date][col] || ""}
                            </td>
                          ))}
                          <td className="num-col">{dateTotal || ""}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pivot-table__row--total">
                <td>Grand Total</td>
                {pivot2.sortedCols.map((col) => (
                  <td key={col} className="num-col">
                    {pivot2.colGrandTotals[col] || ""}
                  </td>
                ))}
                <td className="num-col">{pivot2.overallGrandTotal || ""}</td>
              </tr>
            </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
