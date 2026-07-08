import { useState, useEffect, useMemo } from "react";
import { storageService } from "../services/storage";
import type { MainSheetEntry } from "../types/mainSheet";
import { computeReportSnapshot, type ReportSnapshot, type ReportRow } from "../utils/reportCalculator";

const tabs = ["DLSecondary", "Secondary", "Sanghi", "Dahej", "SOW", "Surat"] as const;
type TabName = (typeof tabs)[number];

const tabDisplayNames: Record<TabName, string> = {
  Secondary: "GJ Secondary",
  DLSecondary: "DL Secondary",
  Sanghi: "Sanghi",
  Dahej: "Dahej",
  SOW: "SOW",
  Surat: "Surat",
};

export default function FailureReportStatePage() {
  const [history, setHistory] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>("Secondary");
  const [viewDate, setViewDate] = useState<string>("");

  useEffect(() => {
    async function load() {
      // Always recompute snapshot from main_sheet to ensure all tabs are fresh
      await storageService.clear("report_history");

      const entries = await storageService.getAll<MainSheetEntry>("main_sheet");
      if (entries.length > 0) {
        const dateStr = new Date().toISOString().split("T")[0];
        const snapshot = computeReportSnapshot(entries, dateStr);
        await storageService.create("report_history", snapshot);
        setHistory([snapshot]);
        setViewDate(dateStr);
      } else {
        setHistory([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const currentSnapshot = useMemo(() => history.find((h) => h.id === viewDate), [history, viewDate]);

  // Baseline is the most recent snapshot that is strictly OLDER than currentSnapshot
  const baselineSnapshot = useMemo(() => {
    if (!currentSnapshot) return null;
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const currentIndex = sorted.findIndex((h) => h.id === currentSnapshot.id);
    if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
    return sorted[currentIndex + 1]; // next oldest
  }, [history, currentSnapshot]);

  const rows = currentSnapshot ? (currentSnapshot.tabs[activeTab] ?? []) : [];

  // Create a map of rawDate -> row for quick baseline lookup
  const baselineMap = useMemo(() => {
    if (!baselineSnapshot) return {};
    const bRows = baselineSnapshot.tabs[activeTab];
    const map: Record<string, ReportRow> = {};
    for (const r of bRows) {
      map[r.rawDate] = r;
    }
    return map;
  }, [baselineSnapshot, activeTab]);

  const getCellColor = (key: keyof ReportRow, currentValue: number, rawDate: string, rowIndex: number) => {
    let baselineRow = baselineMap[rawDate];

    // If exact date match not found, but this is the top row (newest date),
    // compare it against the top row of the baseline report.
    if (!baselineRow && rowIndex === 0 && baselineSnapshot && baselineSnapshot.tabs[activeTab].length > 0) {
      baselineRow = baselineSnapshot.tabs[activeTab][0];
    }

    if (!baselineRow) return undefined;
    const baselineValue = baselineRow[key] as number;

    if (baselineValue === undefined) return undefined;
    if (currentValue > baselineValue) return "lightgreen";
    if (currentValue < baselineValue) return "lightcoral";
    return undefined;
  };

  const isPrimary = ["Sanghi", "Dahej", "Surat", "SOW"].includes(activeTab);
  const isSecondary = activeTab === "Secondary" || activeTab === "DLSecondary";

  if (loading) return <div className="loading">Loading data...</div>;

  return (
    <div className="pivot-report" style={{ height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="pivot-table__title" style={{ margin: 0 }}>
            Failure Report State
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
        </div>

        {!currentSnapshot ? (
          <div
            style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "8px" }}
          >
            No report found for this date.
          </div>
        ) : rows.length > 0 ? (
          <table className="pivot-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num-col">Total Invoices</th>
                <th className="num-col">Billed QTY</th>
                <th className="num-col">Shipment Failure Count</th>
                <th className="num-col">Customer not Found</th>
                {isSecondary && <th className="num-col">Freight slab not maintained</th>}
                {isPrimary && <th className="num-col">Truck not found</th>}
                {isPrimary && <th className="num-col">Freight not found</th>}
                <th className="num-col">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td className="num-col" style={{ backgroundColor: getCellColor("totalInvoices", row.totalInvoices, row.rawDate, i) }}>
                    {row.totalInvoices.toLocaleString()}
                  </td>
                  <td className="num-col" style={{ backgroundColor: getCellColor("billedQty", row.billedQty, row.rawDate, i) }}>
                    {Math.round(row.billedQty).toLocaleString()}
                  </td>
                  <td className="num-col">{row.failureCount || "-"}</td>
                  <td className="num-col" style={{ backgroundColor: getCellColor("customerNotFound", row.customerNotFound, row.rawDate, i) }}>
                    {row.customerNotFound || "-"}
                  </td>
                  {isSecondary && (
                    <td
                      className="num-col"
                      style={{ backgroundColor: getCellColor("freightSlabNotMaintained", row.freightSlabNotMaintained, row.rawDate, i) }}
                    >
                      {row.freightSlabNotMaintained || "-"}
                    </td>
                  )}
                  {isPrimary && (
                    <td className="num-col" style={{ backgroundColor: getCellColor("truckNotFound", row.truckNotFound, row.rawDate, i) }}>
                      {row.truckNotFound || "-"}
                    </td>
                  )}
                  {isPrimary && (
                    <td className="num-col" style={{ backgroundColor: getCellColor("freightNotFound", row.freightNotFound, row.rawDate, i) }}>
                      {row.freightNotFound || "-"}
                    </td>
                  )}
                  <td className="num-col" style={{ backgroundColor: getCellColor("resolved", row.resolved, row.rawDate, i) }}>
                    {row.resolved || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "8px" }}
          >
            No data available for {activeTab}.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{ display: "flex", gap: "2px", borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)", padding: "8px 16px" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab ? "var(--accent-blue)" : "var(--text-secondary)",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {tabDisplayNames[tab]}
          </button>
        ))}
      </div>
    </div>
  );
}
