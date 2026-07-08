import type { MainSheetEntry } from "../types/mainSheet";

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
}

export interface ReportSnapshot {
  id: string; // ISO date string or unique ID
  timestamp: number;
  label: string; // e.g. "Jun 25, 2026 - 2:00 PM"
  tabs: {
    Secondary: ReportRow[];
    DLSecondary: ReportRow[];
    Sanghi: ReportRow[];
    Dahej: ReportRow[];
    Surat: ReportRow[];
    SOW: ReportRow[];
  };
}

function formatDateWithSuffix(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const y = parseInt(parts[0], 10);
  const mIndex = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(mIndex) || isNaN(d)) return dateStr;

  const dateObj = new Date(y, mIndex, d);
  const m = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(dateObj);

  let suffix = "th";
  if (d % 10 === 1 && d !== 11) suffix = "st";
  if (d % 10 === 2 && d !== 12) suffix = "nd";
  if (d % 10 === 3 && d !== 13) suffix = "rd";

  return `${d}${suffix} ${m} ${y}`;
}

export function computeReportSnapshot(entries: MainSheetEntry[], dateStr: string): ReportSnapshot {
  const tabs = ["Secondary", "DLSecondary", "Sanghi", "Dahej", "Surat", "SOW"] as const;
  type TabName = (typeof tabs)[number];

  const resultTabs: Record<TabName, ReportRow[]> = {
    Secondary: [],
    DLSecondary: [],
    Sanghi: [],
    Dahej: [],
    Surat: [],
    SOW: [],
  };

  const primaryTabs = ["Sanghi", "Dahej", "Surat", "SOW"];

  for (const activeTab of tabs) {
    const filtered = entries.filter((e) => {
      const mode = e.mode?.trim().toLowerCase() || "";
      const region = e.shipToRegion?.trim().toUpperCase() || "";

      if (activeTab === "Secondary") {
        if (mode !== "secondary") return false;
        if (region !== "DN" && region !== "GJ") return false;
        return true;
      }
      if (activeTab === "DLSecondary") {
        if (mode !== "secondary") return false;
        if (region !== "DL") return false;
        return true;
      }
      if (primaryTabs.includes(activeTab)) {
        if (mode !== "primary") return false;

        const pn = e.plantName?.trim().toLowerCase() || "";
        if (activeTab === "SOW") {
          if (!["adalaj - sow", "moraiya - sow", "sarkhej - sow"].includes(pn)) return false;
        } else {
          if (pn !== activeTab.toLowerCase()) return false;
        }

        if (region !== "DN" && region !== "GJ") return false;
        if (e.ctFlag && e.ctFlag.trim() !== "") return false;
        return true;
      }
      return false;
    });

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
      }
    > = {};

    for (const e of filtered) {
      const dateStr = e.actGdsMvmntDate || "(blank)";

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {
          totalInvoices: 0,
          billedQty: 0,
          customerNotFound: 0,
          freightSlabNotMaintained: 0,
          truckNotFound: 0,
          freightNotFound: 0,
          resolved: 0,
        };
      }

      const hasInvoice = e.billingDocument ? 1 : 0;
      const qty = parseFloat(e.billedQty) || 0;

      const msg2 = e.messageText2?.toLowerCase().trim() || "";
      // Fallback: if messageText2 is empty, check raw messageText directly
      const msgRaw = msg2 || e.messageText?.toLowerCase().trim() || "";

      const isCustomerNotFound = msgRaw.startsWith("customer not found") || msgRaw.includes(":customer not found") ? 1 : 0;
      const isFreightSlab = msgRaw.startsWith("secondary freight lookup not found for key") || msgRaw.includes(":secondary freight lookup not found for key") ? 1 : 0;
      const isTruckNotFound = msgRaw.startsWith("truck details not found for truck number") || msgRaw.includes(":truck details not found for truck number") ? 1 : 0;
      const isFreightNotFound = msgRaw.startsWith("primary freight lookup not found for key") || msgRaw.includes(":primary freight lookup not found for key") || msgRaw.includes("freight not found") ? 1 : 0;

      dateMap[dateStr].totalInvoices += hasInvoice;
      dateMap[dateStr].billedQty += qty;
      dateMap[dateStr].customerNotFound += isCustomerNotFound;
      dateMap[dateStr].freightSlabNotMaintained += isFreightSlab;
      dateMap[dateStr].truckNotFound += isTruckNotFound;
      dateMap[dateStr].freightNotFound += isFreightNotFound;
    }

    const sortedDates = Object.keys(dateMap).sort((a, b) => {
      if (a === "(blank)") return 1;
      if (b === "(blank)") return -1;
      const tA = new Date(a).getTime();
      const tB = new Date(b).getTime();
      if (isNaN(tA) || isNaN(tB)) return a.localeCompare(b);
      return tA - tB;
    });

    const computedRows = sortedDates.map((date) => {
      const row = dateMap[date];
      let failureCount = 0;

      if (activeTab === "Secondary" || activeTab === "DLSecondary") {
        failureCount = row.customerNotFound + row.freightSlabNotMaintained;
      } else if (primaryTabs.includes(activeTab)) {
        failureCount = row.customerNotFound + row.truckNotFound + row.freightNotFound;
      }

      const formattedDate = date === "(blank)" ? date : formatDateWithSuffix(date);

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
      };
    });

    resultTabs[activeTab] = computedRows;
  }

  const ts = new Date(dateStr).getTime();
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));

  return {
    id: dateStr,
    timestamp: ts,
    label,
    tabs: resultTabs,
  };
}
