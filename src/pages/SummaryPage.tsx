import { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import type { MainSheetEntry } from '../types/mainSheet';
import { Sheet } from '../components/Sheet';
import { getCustomSheets } from '../utils/defaultSheets';
import type { CustomSheetConfig } from '../types/customSheet';
import { ConfigureSheetsModal } from '../components/ConfigureSheetsModal';

interface CategorySummary {
  name: string;
  totalShipments: number;
  totalVolume: number;
  failureCount: number;
  resolvedCount: number;
  pendingCount: number;
  failureRate: number;
  resolvedRate: number;
  pendingRate: number;
}

export default function SummaryPage() {
  const [entries, setEntries] = useState<MainSheetEntry[]>([]);
  const [configs, setConfigs] = useState<CustomSheetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);

  const loadData = async () => {
    const data = await storageService.getAll<MainSheetEntry>('main_sheet');
    setEntries(data);

    const sheetConfigs = await getCustomSheets();
    setConfigs(sheetConfigs);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const summaries = useMemo(() => {
    if (entries.length === 0 || configs.length === 0) return [];

    const summaryConfigs = configs.filter((c) => c.showInSummary);

    const results: CategorySummary[] = summaryConfigs.map((config) => {
      const filtered = entries.filter((e) => {
        const mode = e.mode?.trim().toLowerCase() || '';
        const region = e.shipToRegion?.trim().toUpperCase() || '';
        const plant = e.plantName?.trim().toLowerCase() || '';
        const hasCt = e.ctFlag && e.ctFlag.trim() !== '';

        // 1. Mode Filter
        if (config.mode === 'primary' && mode !== 'primary') return false;
        if (config.mode === 'secondary' && mode !== 'secondary') return false;

        // 2. Region Filter
        if (config.regions.length > 0) {
          const matched = config.regions.some((r) => r.trim().toUpperCase() === region);
          if (!matched) return false;
        }

        // 3. Plant Filter
        if (config.plants.length > 0) {
          const matched = config.plants.some((p) => {
            const filterP = p.trim().toLowerCase();
            return plant.includes(filterP);
          });
          if (!matched) return false;
        }

        // 4. CT Flag Filter
        if (config.ctFlag === 'empty' && hasCt) return false;
        if (config.ctFlag === 'non-empty' && !hasCt) return false;

        return true;
      });

      let totalShipments = 0;
      let totalVolume = 0;
      let failureCount = 0;
      let resolvedCount = 0;

      filtered.forEach((e) => {
        // Only count entries with a billing document as processed
        if (!e.billingDocument) return;

        totalShipments += 1;
        totalVolume += parseFloat(e.billedQty) || 0;

        const msg2 = e.messageText2?.toLowerCase().trim() || '';
        const msgRaw = msg2 || e.messageText?.toLowerCase().trim() || '';

        const isCustomerNotFound = msgRaw.includes('customer not found') ? 1 : 0;
        const isFreightSlab = msgRaw.includes('secondary freight lookup not found') ? 1 : 0;
        const isTruckNotFound = msgRaw.includes('truck details not found') ? 1 : 0;
        const isFreightNotFound = msgRaw.includes('primary freight lookup not found') || msgRaw.includes('freight not found') ? 1 : 0;

        const activeCustomErrors = config.customErrors?.filter((ce) => ce.enabled) || [];
        const matchedAnyCustomError = activeCustomErrors.some((ce) => ce.keywords.some((keyword) => msgRaw.includes(keyword.trim().toLowerCase())));

        const hasConfiguredError =
          (config.failureErrors.customerNotFound && isCustomerNotFound) ||
          (config.failureErrors.freightSlabNotMaintained && isFreightSlab) ||
          (config.failureErrors.truckNotFound && isTruckNotFound) ||
          (config.failureErrors.freightNotFound && isFreightNotFound) ||
          matchedAnyCustomError;

        const isFailure = hasConfiguredError ? 1 : 0;

        if (isFailure) {
          failureCount += 1;
          if (e.aopReceivedFlag?.trim().toUpperCase() === 'X') {
            resolvedCount += 1;
          }
        }
      });

      const pendingCount = failureCount - resolvedCount;
      const failureRate = totalShipments > 0 ? (failureCount / totalShipments) * 100 : 0;
      const resolvedRate = totalShipments > 0 ? (resolvedCount / totalShipments) * 100 : 0;
      const pendingRate = totalShipments > 0 ? (pendingCount / totalShipments) * 100 : 0;

      return {
        name: config.name,
        totalShipments,
        totalVolume,
        failureCount,
        resolvedCount,
        pendingCount,
        failureRate,
        resolvedRate,
        pendingRate,
      };
    });

    return results;
  }, [entries, configs]);

  const totals = useMemo(() => {
    if (summaries.length === 0) {
      return {
        totalShipments: 0,
        totalVolume: 0,
        failureRate: 0,
        resolvedRate: 0,
        pendingRate: 0,
      };
    }

    const totalShipments = summaries.reduce((acc, s) => acc + s.totalShipments, 0);
    const totalVolume = summaries.reduce((acc, s) => acc + s.totalVolume, 0);
    const totalFailures = summaries.reduce((acc, s) => acc + s.failureCount, 0);
    const totalResolved = summaries.reduce((acc, s) => acc + s.resolvedCount, 0);
    const totalPending = summaries.reduce((acc, s) => acc + s.pendingCount, 0);

    const failureRate = totalShipments > 0 ? (totalFailures / totalShipments) * 100 : 0;
    const resolvedRate = totalShipments > 0 ? (totalResolved / totalShipments) * 100 : 0;
    const pendingRate = totalShipments > 0 ? (totalPending / totalShipments) * 100 : 0;

    return {
      totalShipments,
      totalVolume,
      failureRate,
      resolvedRate,
      pendingRate,
    };
  }, [summaries]);

  if (loading) {
    return <div className="loading">Loading summary data...</div>;
  }

  return (
    <Sheet>
      <div className="pivot-report" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="pivot-table__title" style={{ margin: 0 }}>
            Executive Failure Summary
          </h2>
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
        </div>

        <table className="pivot-table">
          <thead>
            <tr>
              <th></th>
              <th className="num-col">Total shipments processed</th>
              <th className="num-col">Total volume processed</th>
              <th className="num-col">Shipment failure %</th>
              <th className="num-col">Failure resolved %</th>
              <th className="num-col">Pending failure %</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.name}>
                <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                <td className="num-col">{s.totalShipments.toLocaleString()}</td>
                <td className="num-col">{Math.round(s.totalVolume).toLocaleString()}</td>
                <td className="num-col">{s.failureRate.toFixed(1)}%</td>
                <td className="num-col">{s.resolvedRate.toFixed(1)}%</td>
                <td className="num-col">{s.pendingRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="pivot-table__row--total">
              <td>Total</td>
              <td className="num-col">{totals.totalShipments.toLocaleString()}</td>
              <td className="num-col">{Math.round(totals.totalVolume).toLocaleString()}</td>
              <td className="num-col">{totals.failureRate.toFixed(1)}%</td>
              <td className="num-col">{totals.resolvedRate.toFixed(1)}%</td>
              <td className="num-col">{totals.pendingRate.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfigureSheetsModal open={isConfigureOpen} onClose={() => setIsConfigureOpen(false)} onSave={loadData} />
    </Sheet>
  );
}
