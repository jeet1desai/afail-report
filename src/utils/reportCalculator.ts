import type { MainSheetEntry } from '../types/mainSheet';
import type { CustomSheetConfig } from '../types/customSheet';

export interface ReportRow {
  date: string;
  rawDate: string;
  totalInvoices: number;
  billedQty: number;
  failureCount: number;
  customerNotFound: number;
  freightSlabNotMaintained: number;
  truckNotFound: number;
  freightNotFound: number;
  resolved: number;
  customErrorCounts?: Record<string, number>;
}

export interface ReportSnapshot {
  id: string; // ISO date string or unique ID
  timestamp: number;
  label: string; // e.g. "Jun 25, 2026 - 2:00 PM"
  tabs: Record<string, ReportRow[]>;
}

function formatDateWithSuffix(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const y = parseInt(parts[0], 10);
  const mIndex = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(mIndex) || isNaN(d)) return dateStr;

  const dateObj = new Date(y, mIndex, d);
  const m = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(dateObj);

  let suffix = 'th';
  if (d % 10 === 1 && d !== 11) suffix = 'st';
  if (d % 10 === 2 && d !== 12) suffix = 'nd';
  if (d % 10 === 3 && d !== 13) suffix = 'rd';

  return `${d}${suffix} ${m} ${y}`;
}

export function computeReportSnapshot(entries: MainSheetEntry[], dateStr: string, configs: CustomSheetConfig[]): ReportSnapshot {
  const resultTabs: Record<string, ReportRow[]> = {};

  for (const config of configs) {
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

    const activeCustomErrors = config.customErrors?.filter((ce) => ce.enabled) || [];

    const dateMap: Record<
      string,
      {
        totalInvoices: number;
        billedQty: number;
        customerNotFound: number;
        freightSlabNotMaintained: number;
        truckNotFound: number;
        freightNotFound: number;
        resolved: number;
        customErrors: Record<string, number>;
      }
    > = {};

    for (const e of filtered) {
      const dateStr = e.actGdsMvmntDate || '(blank)';

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {
          totalInvoices: 0,
          billedQty: 0,
          customerNotFound: 0,
          freightSlabNotMaintained: 0,
          truckNotFound: 0,
          freightNotFound: 0,
          resolved: 0,
          customErrors: {},
        };
        for (const ce of activeCustomErrors) {
          dateMap[dateStr].customErrors[ce.id] = 0;
        }
      }

      const hasInvoice = e.billingDocument ? 1 : 0;
      const qty = parseFloat(e.billedQty) || 0;

      const msg2 = e.messageText2?.toLowerCase().trim() || '';
      const msgRaw = msg2 || e.messageText?.toLowerCase().trim() || '';

      const isCustomerNotFound = msgRaw.includes('customer not found') ? 1 : 0;
      const isFreightSlab = msgRaw.includes('secondary freight lookup not found') ? 1 : 0;
      const isTruckNotFound = msgRaw.includes('truck details not found') ? 1 : 0;
      const isFreightNotFound = msgRaw.includes('primary freight lookup not found') || msgRaw.includes('freight not found') ? 1 : 0;

      let matchedAnyCustomError = false;
      for (const ce of activeCustomErrors) {
        const isMatch = ce.keywords.some((keyword) => msgRaw.includes(keyword.trim().toLowerCase()));
        if (isMatch) {
          dateMap[dateStr].customErrors[ce.id] = (dateMap[dateStr].customErrors[ce.id] || 0) + 1;
          matchedAnyCustomError = true;
        }
      }

      dateMap[dateStr].totalInvoices += hasInvoice;
      dateMap[dateStr].billedQty += qty;
      dateMap[dateStr].customerNotFound += isCustomerNotFound;
      dateMap[dateStr].freightSlabNotMaintained += isFreightSlab;
      dateMap[dateStr].truckNotFound += isTruckNotFound;
      dateMap[dateStr].freightNotFound += isFreightNotFound;

      const hasConfiguredError =
        (config.failureErrors.customerNotFound && isCustomerNotFound) ||
        (config.failureErrors.freightSlabNotMaintained && isFreightSlab) ||
        (config.failureErrors.truckNotFound && isTruckNotFound) ||
        (config.failureErrors.freightNotFound && isFreightNotFound) ||
        matchedAnyCustomError;

      const isFailure = hasConfiguredError ? 1 : 0;
      const isResolved = isFailure && e.aopReceivedFlag?.trim().toUpperCase() === 'X' ? 1 : 0;
      dateMap[dateStr].resolved += isResolved;
    }

    const sortedDates = Object.keys(dateMap).sort((a, b) => {
      if (a === '(blank)') return 1;
      if (b === '(blank)') return -1;
      const tA = new Date(a).getTime();
      const tB = new Date(b).getTime();
      if (isNaN(tA) || isNaN(tB)) return a.localeCompare(b);
      return tA - tB;
    });

    const computedRows = sortedDates.map((date) => {
      const row = dateMap[date];
      let failureCount = 0;

      if (config.failureErrors.customerNotFound) failureCount += row.customerNotFound;
      if (config.failureErrors.freightSlabNotMaintained) failureCount += row.freightSlabNotMaintained;
      if (config.failureErrors.truckNotFound) failureCount += row.truckNotFound;
      if (config.failureErrors.freightNotFound) failureCount += row.freightNotFound;

      for (const ce of activeCustomErrors) {
        failureCount += row.customErrors[ce.id] || 0;
      }

      const formattedDate = date === '(blank)' ? date : formatDateWithSuffix(date);

      return {
        date: formattedDate,
        rawDate: date,
        totalInvoices: row.totalInvoices,
        billedQty: row.billedQty,
        failureCount,
        customerNotFound: row.customerNotFound,
        freightSlabNotMaintained: row.freightSlabNotMaintained,
        truckNotFound: row.truckNotFound,
        freightNotFound: row.freightNotFound,
        resolved: row.resolved,
        customErrorCounts: row.customErrors,
      };
    });

    resultTabs[config.id] = computedRows;
  }

  const ts = new Date(dateStr).getTime();
  const label = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));

  return {
    id: dateStr,
    timestamp: ts,
    label,
    tabs: resultTabs,
  };
}
