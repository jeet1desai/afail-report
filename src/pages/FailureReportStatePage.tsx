import { useState, useEffect, useMemo, useCallback } from 'react';
import { storageService } from '../services/storage';
import type { MainSheetEntry } from '../types/mainSheet';
import { computeReportSnapshot, type ReportSnapshot, type ReportRow } from '../utils/reportCalculator';
import { getCustomSheets } from '../utils/defaultSheets';
import type { CustomSheetConfig } from '../types/customSheet';
import { ConfigureSheetsModal } from '../components/ConfigureSheetsModal';

export default function FailureReportStatePage() {
  const [history, setHistory] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<CustomSheetConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [viewDate, setViewDate] = useState<string>('');
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);

  const loadData = async () => {
    const sheetConfigs = await getCustomSheets();
    setConfigs(sheetConfigs);

    const stateReportConfigs = sheetConfigs.filter((c) => c.showInStateReport);
    if (stateReportConfigs.length > 0) {
      setActiveTab((prev) => {
        if (stateReportConfigs.some((c) => c.id === prev)) return prev;
        return stateReportConfigs[0].id;
      });
    }

    let existingHistory = await storageService.getAll<ReportSnapshot>('report_history');

    // Safe duplicate cleanup for today's auto-generated snapshot
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySnapshot = existingHistory.find((h) => h.id === todayStr);
    if (todaySnapshot) {
      const isDuplicate = existingHistory.some((h) => h.id !== todayStr && JSON.stringify(h.tabs) === JSON.stringify(todaySnapshot.tabs));
      if (isDuplicate) {
        await storageService.delete('report_history', todayStr);
        existingHistory = await storageService.getAll<ReportSnapshot>('report_history');
      }
    }

    setHistory(existingHistory);

    if (existingHistory.length > 0) {
      const sorted = [...existingHistory].sort((a, b) => b.timestamp - a.timestamp);
      setViewDate((prev) => prev || sorted[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfigs = async () => {
    const sheetConfigs = await getCustomSheets();
    setConfigs(sheetConfigs);

    const stateReportConfigs = sheetConfigs.filter((c) => c.showInStateReport);
    if (stateReportConfigs.length > 0) {
      setActiveTab((prev) => {
        if (stateReportConfigs.some((c) => c.id === prev)) return prev;
        return stateReportConfigs[0].id;
      });
    }

    const rawEntries = await storageService.getAll<MainSheetEntry>('main_sheet');
    const existingHistory = await storageService.getAll<ReportSnapshot>('report_history');

    if (rawEntries.length > 0 && viewDate) {
      const snapshot = computeReportSnapshot(rawEntries, viewDate, sheetConfigs);
      const found = existingHistory.find((h) => h.id === viewDate);
      if (found) {
        await storageService.update('report_history', viewDate, snapshot as any);
      } else {
        await storageService.create('report_history', snapshot);
      }

      const updatedHistory = await storageService.getAll<ReportSnapshot>('report_history');
      setHistory(updatedHistory);
    }
  };

  const currentSnapshot = useMemo(() => history.find((h) => h.id === viewDate), [history, viewDate]);

  // Baseline is the most recent snapshot that is strictly OLDER than currentSnapshot
  const baselineSnapshot = useMemo(() => {
    if (!currentSnapshot) return null;
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const currentIndex = sorted.findIndex((h) => h.id === currentSnapshot.id);
    if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
    return sorted[currentIndex + 1]; // next oldest
  }, [history, currentSnapshot]);

  const activeConfig = useMemo(() => configs.find((c) => c.id === activeTab), [configs, activeTab]);

  const getTabRows = useCallback((snapshot: ReportSnapshot | null | undefined, config: CustomSheetConfig | undefined): ReportRow[] => {
    if (!snapshot || !config) return [];
    if (snapshot.tabs[config.id]) return snapshot.tabs[config.id];
    if (snapshot.tabs[config.name]) return snapshot.tabs[config.name];

    const defaultNameMap: Record<string, string> = {
      gj_secondary: 'GJ Secondary',
      dl_secondary: 'DL Secondary',
      ka_secondary: 'KA Secondary',
      ga_secondary: 'GA Secondary',
      gj_primary: 'GJ Primary',
      sanghi_primary: 'Sanghi',
      dahej_primary: 'Dahej',
      sow_primary: 'SOW',
      surat_primary: 'Surat',
    };
    const defaultName = defaultNameMap[config.id];
    if (defaultName && snapshot.tabs[defaultName]) {
      return snapshot.tabs[defaultName];
    }
    return [];
  }, []);

  const rows = useMemo(() => getTabRows(currentSnapshot, activeConfig), [currentSnapshot, activeConfig, getTabRows]);

  // Create a map of rawDate -> row for quick baseline lookup
  const baselineMap = useMemo(() => {
    if (!baselineSnapshot || !activeConfig) return {};
    const bRows = getTabRows(baselineSnapshot, activeConfig);
    if (!bRows) return {};
    const map: Record<string, ReportRow> = {};
    for (const r of bRows) {
      map[r.rawDate] = r;
    }
    return map;
  }, [baselineSnapshot, activeConfig, getTabRows]);

  const getCellColor = (key: keyof ReportRow, currentValue: number, rawDate: string, rowIndex: number) => {
    let baselineRow = baselineMap[rawDate];

    if (!baselineRow) {
      return 'lightgreen';
    }

    if (!baselineRow && rowIndex === 0 && baselineSnapshot && activeConfig) {
      const bRows = getTabRows(baselineSnapshot, activeConfig);
      if (bRows && bRows.length > 0) {
        baselineRow = bRows[0];
      }
    }

    if (!baselineRow) return undefined;

    const current = Math.abs(Number(currentValue));
    const baseline = Math.abs(Number(baselineRow[key]));

    if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
      return undefined;
    }

    // treat almost-equal values as equal
    if (Math.abs(current - baseline) < 0.0001) {
      return undefined;
    }

    if (current > baseline) return 'lightgreen';
    if (current < baseline) return 'lightcoral';

    return undefined;
  };

  const tabsToDisplay = useMemo(() => configs.filter((c) => c.showInStateReport), [configs]);

  if (loading) return <div className="loading">Loading data...</div>;

  return (
    <div
      className="pivot-report"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}
    >
      <style>{`
        .pivot-table thead th {
          position: sticky;
          top: -22px;
          z-index: 10;
          background: var(--bg-hover);
          box-shadow: 0 1px 0 var(--border-color); 
        }
      `}</style>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 className="pivot-table__title" style={{ margin: 0 }}>
            Failure Report State
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsConfigureOpen(true)}
              className="btn btn--secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Manage Sheets
            </button>

            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {!currentSnapshot ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
            }}
          >
            No report found for this date. Please make sure you have imported the Excel file and clicked "Generate Report" on the Main Sheet page.
          </div>
        ) : rows.length > 0 ? (
          <table className="pivot-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num-col">Total Invoices</th>
                <th className="num-col">Billed QTY</th>
                <th className="num-col">Shipment Failure Count</th>
                {activeConfig?.failureErrors.customerNotFound && <th className="num-col">Customer not Found</th>}
                {activeConfig?.failureErrors.freightSlabNotMaintained && <th className="num-col">Freight slab not maintained</th>}
                {activeConfig?.failureErrors.truckNotFound && <th className="num-col">Truck not found</th>}
                {activeConfig?.failureErrors.freightNotFound && <th className="num-col">Freight not found</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td
                    className="num-col"
                    style={{
                      backgroundColor: getCellColor('totalInvoices', row.totalInvoices, row.rawDate, i),
                    }}
                  >
                    {row.totalInvoices.toLocaleString()}
                  </td>
                  <td
                    className="num-col"
                    style={{
                      backgroundColor: getCellColor('billedQty', row.billedQty, row.rawDate, i),
                    }}
                  >
                    {Math.round(row.billedQty).toLocaleString()}
                  </td>
                  <td className="num-col">{row.failureCount || '-'}</td>
                  {activeConfig?.failureErrors.customerNotFound && (
                    <td
                      className="num-col"
                      style={{
                        backgroundColor: getCellColor('customerNotFound', row.customerNotFound, row.rawDate, i),
                      }}
                    >
                      {row.customerNotFound || '-'}
                    </td>
                  )}
                  {activeConfig?.failureErrors.freightSlabNotMaintained && (
                    <td
                      className="num-col"
                      style={{
                        backgroundColor: getCellColor('freightSlabNotMaintained', row.freightSlabNotMaintained, row.rawDate, i),
                      }}
                    >
                      {row.freightSlabNotMaintained || '-'}
                    </td>
                  )}
                  {activeConfig?.failureErrors.truckNotFound && (
                    <td
                      className="num-col"
                      style={{
                        backgroundColor: getCellColor('truckNotFound', row.truckNotFound, row.rawDate, i),
                      }}
                    >
                      {row.truckNotFound || '-'}
                    </td>
                  )}
                  {activeConfig?.failureErrors.freightNotFound && (
                    <td
                      className="num-col"
                      style={{
                        backgroundColor: getCellColor('freightNotFound', row.freightNotFound, row.rawDate, i),
                      }}
                    >
                      {row.freightNotFound || '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
            }}
          >
            No data available for {activeConfig?.name || activeTab}.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          padding: '8px 16px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {tabsToDisplay.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <ConfigureSheetsModal open={isConfigureOpen} onClose={() => setIsConfigureOpen(false)} onSave={handleSaveConfigs} />
    </div>
  );
}
