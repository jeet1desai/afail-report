import { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import type { MainSheetEntry } from '../types/mainSheet';
import { Sheet } from '../components/Sheet';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await storageService.getAll<MainSheetEntry>('main_sheet');
      setEntries(data);
      setLoading(false);
    }
    load();
  }, []);

  const summaries = useMemo(() => {
    if (entries.length === 0) return [];

    const categories = [
      {
        name: 'GJ secondary',
        filter: (e: MainSheetEntry) => {
          const mode = e.mode?.trim().toLowerCase() || '';
          const region = e.shipToRegion?.trim().toUpperCase() || '';
          return mode === 'secondary' && (region === 'DN' || region === 'GJ');
        },
      },
      {
        name: 'GJ Primary',
        filter: (e: MainSheetEntry) => {
          const mode = e.mode?.trim().toLowerCase() || '';
          const region = e.shipToRegion?.trim().toUpperCase() || '';
          const hasCt = e.ctFlag && e.ctFlag.trim() !== '';
          return mode === 'primary' && (region === 'DN' || region === 'GJ') && !hasCt;
        },
      },
      {
        name: 'DL Secondary',
        filter: (e: MainSheetEntry) => {
          const mode = e.mode?.trim().toLowerCase() || '';
          const region = e.shipToRegion?.trim().toUpperCase() || '';
          return mode === 'secondary' && region === 'DL';
        },
      },
      {
        name: 'KA Secondary',
        filter: (e: MainSheetEntry) => {
          const mode = e.mode?.trim().toLowerCase() || '';
          const region = e.shipToRegion?.trim().toUpperCase() || '';
          return mode === 'secondary' && region === 'KA';
        },
      },
      {
        name: 'GA Secondary',
        filter: (e: MainSheetEntry) => {
          const mode = e.mode?.trim().toLowerCase() || '';
          const region = e.shipToRegion?.trim().toUpperCase() || '';
          return mode === 'secondary' && region === 'GA';
        },
      },
    ];

    const results: CategorySummary[] = categories.map((cat) => {
      const filtered = entries.filter(cat.filter);

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

        const isCustomerNotFound = msgRaw.includes('customer not found');
        const isFreightSlab = msgRaw.includes('secondary freight lookup not found');
        const isTruckNotFound = msgRaw.includes('truck details not found');
        const isFreightNotFound = msgRaw.includes('primary freight lookup not found') || msgRaw.includes('freight not found');

        let isFailure = false;
        if (cat.name.toLowerCase().includes('secondary')) {
          isFailure = isCustomerNotFound || isFreightSlab;
        } else {
          isFailure = isCustomerNotFound || isTruckNotFound || isFreightNotFound;
        }

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
        name: cat.name,
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
  }, [entries]);

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
        <h2 className="pivot-table__title">Executive Failure Summary</h2>

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
    </Sheet>
  );
}
