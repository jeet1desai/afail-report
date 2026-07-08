import { useState, useEffect, useCallback, useRef } from "react";
import { storageService } from "../services/storage";
import { parseExcelInWorker } from "../utils/excelParser";
import { computeReportSnapshot } from "../utils/reportCalculator";
import { generateId } from "../utils/helpers";
import type { MainSheetEntry } from "../types/mainSheet";
import type { Plant } from "../types/plant";
import { Sheet, SheetToolbar, DataSheet, SheetEmptyState, SearchInput, ToolbarButton } from "../components/Sheet";
import type { ColumnDef } from "../components/Sheet";
import { Modal } from "../components/Modal";
import { UploadZone } from "../components/UploadZone";

const COLLECTION = "main_sheet";

/* ===== Column Definitions (47 Columns) ===== */
const mainSheetColumns: ColumnDef<MainSheetEntry>[] = [
  { key: "delivery", label: "Delivery", width: "150px" },
  { key: "item", label: "Item (Delivery)", width: "120px" },
  { key: "billingDocument", label: "Billing Document", width: "160px" },
  { key: "billingItem", label: "Item (Billing)", width: "120px" },
  { key: "createdOn", label: "Created on (Delivery)", width: "160px" },
  { key: "createdBy", label: "Created by", width: "160px" },
  { key: "actGdsMvmntDate", label: "Act. Gds Mvmnt Date", width: "180px" },
  { key: "deliveryType", label: "Delivery Type", width: "140px" },
  { key: "billingType", label: "Billing Type", width: "140px" },
  { key: "billedQty", label: "Billed Qty", width: "120px" },
  { key: "salesOrganization", label: "Sales Org", width: "140px" },
  { key: "distributionChannel", label: "Dist Channel", width: "140px" },
  { key: "division", label: "Division", width: "120px" },
  { key: "soldToParty", label: "Sold-to party", width: "160px" },
  { key: "shipToParty", label: "Ship-to party", width: "160px" },
  { key: "regionOfDlvPlant", label: "Region of dlv.plant", width: "160px" },
  { key: "soldToRegion", label: "Sold To Region", width: "150px" },
  { key: "shipToRegion", label: "Ship To Region", width: "150px" },
  { key: "incoterms", label: "Incoterms", width: "120px" },
  { key: "shipDigi10", label: "SHIP DIGI10", width: "150px" },
  { key: "sourceDigi10", label: "SOURCE DIGI10", width: "160px" },
  { key: "shippingType", label: "Shipping type", width: "150px" },
  { key: "newShippingType", label: "New Shipping Type", width: "170px" },
  { key: "specialProcIndicator", label: "Special proc. indicator", width: "180px" },
  { key: "contractType", label: "Contract Type", width: "150px" },
  { key: "materialGroup1", label: "Material group 1", width: "160px" },
  { key: "productHierarchy", label: "Product hierarchy", width: "170px" },
  { key: "geoDistrict", label: "Geo District", width: "150px" },
  { key: "plant", label: "Plant", width: "120px" },
  { key: "mode", label: "Mode", width: "120px" },
  { key: "digipinL6", label: "Digipin L6", width: "140px" },
  { key: "plantName", label: "Plant Name", width: "180px" },
  { key: "storageLocation", label: "Storage Location", width: "160px" },
  { key: "meansOfTransId", label: "Means of Trans. ID", width: "180px" },
  { key: "cancelled", label: "Cancelled", width: "120px" },
  { key: "postingStatus", label: "Posting Status", width: "150px" },
  { key: "billingCreatedOn", label: "Created on (Billing)", width: "160px" },
  { key: "time", label: "Time", width: "120px" },
  { key: "baseFreight", label: "Base Freight", width: "150px" },
  { key: "waraiCharges", label: "Warai Charges", width: "155px" },
  { key: "unloadingCharges", label: "Unloading Charges", width: "160px" },
  { key: "otherFreightCharge", label: "Other Freight Charge", width: "170px" },
  { key: "tollCharges", label: "Toll Charges", width: "140px" },
  { key: "additionalGoodsTax", label: "Additional Goods Tax", width: "180px" },
  { key: "distance", label: "Distance", width: "120px" },
  { key: "minimumFreight", label: "Minimum Freight", width: "155px" },
  { key: "totalFreight", label: "Total Freight", width: "150px" },
  { key: "messageType", label: "Message type", width: "150px" },
  { key: "messageText", label: "Message text", width: "250px" },
  { key: "messageText2", label: "Message test2", width: "250px" },
  { key: "ctFlag", label: "CT Flag", width: "150px" },
  { key: "aopReceivedFlag", label: "AOP Received Flag", width: "160px" },
  { key: "aopReceivedDate", label: "AOP Received Date", width: "160px" },
  { key: "aopReceivedTime", label: "AOP Received Time", width: "160px" },
];

/* ===== Icons ===== */
const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const UploadIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const MagicIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 5.2l-1.4 1.4" />
    <path d="M12.2 10.8l-1.4 1.4" />
    <path d="M17.8 12.8l-1.4-1.4" />
    <path d="M12.2 7.2l-1.4-1.4" />
    <path d="M3 21l9-9" />
  </svg>
);

const ChevronDownIcon = (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginLeft: "6px" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SettingsIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const DatabaseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

function MainSheetPage() {
  const [entries, setEntries] = useState<MainSheetEntry[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    errors: string[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadEntries = useCallback(async () => {
    const data = await storageService.getAll<MainSheetEntry>(COLLECTION);
    setEntries(data);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Filter data by search
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.delivery.toLowerCase().includes(term) ||
      entry.plant.toLowerCase().includes(term) ||
      entry.soldToParty.toLowerCase().includes(term) ||
      entry.billingDocument.toLowerCase().includes(term)
    );
  });

  const upsertSnapshot = async (entriesToUse: MainSheetEntry[]) => {
    const snapshot = computeReportSnapshot(entriesToUse, uploadDate);
    const existing = await storageService.getAll<{ id: string }>("report_history");
    const found = existing.find((h) => h.id === snapshot.id);
    if (found) {
      await storageService.update("report_history", snapshot.id, snapshot as any);
    } else {
      await storageService.create("report_history", snapshot);
    }
  };

  const openModal = () => {
    setShowUploadModal(true);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setUploadResult(null);

    try {
      const result = await parseExcelInWorker<MainSheetEntry>(selectedFile, "main_sheet");

      if (!result.success) {
        setUploadResult({ success: false, message: "Failed to process the file.", errors: result.errors });
        setIsProcessing(false);
        return;
      }

      const plants = await storageService.getAll<Plant>("plants");
      const plantMap = new Map<string, Plant>();
      for (const p of plants) {
        if (p.plantCode) {
          plantMap.set(p.plantCode.trim().toUpperCase(), p);
        }
      }

      const newEntries: MainSheetEntry[] = result.data.map((row) => {
        // 1. Message Text 2
        let msg2 = "";
        const originalText = row.messageText ? String(row.messageText) : "";
        if (originalText) {
          const parts = originalText.split(":");
          if (parts.length > 1) {
            msg2 = parts.slice(1).join(":").trim();
          } else {
            // No ":" separator — use the full message text directly
            msg2 = originalText.trim();
          }
        }

        // 2. CT Flag
        const partsCT = originalText.split(":");
        const secondPartCT = partsCT[1] || "";
        const subPartsCT = secondPartCT.split("_");
        let ctFlagValue = subPartsCT[3] ? subPartsCT[3].trim() : "";
        const EXCLUDED_CT_FLAGS = ["DE", "DC", "IT", "MTK"];
        if (EXCLUDED_CT_FLAGS.includes(ctFlagValue)) {
          ctFlagValue = "";
        }

        // 3. Plant Lookup
        const plantCode = row.plant ? String(row.plant).trim().toUpperCase() : "";
        const matchedPlant = plantMap.get(plantCode);
        let mode = "";
        let digipinL6 = "";
        let plantName = "";
        if (matchedPlant) {
          mode = matchedPlant.mode || "";
          digipinL6 = matchedPlant.plantDigi6 || "";
          if (mode === "Primary") {
            plantName = matchedPlant.digipinPlantLocation || "";
          } else {
            plantName = matchedPlant.digipinFacility || "";
          }
        }

        return {
          ...row,
          id: generateId(),
          messageText2: msg2,
          ctFlag: ctFlagValue,
          mode,
          digipinL6,
          plantName,
          createdAt: new Date().toISOString(),
        };
      });

      await storageService.bulkReplace(COLLECTION, newEntries);
      await upsertSnapshot(newEntries);
      await loadEntries();
      setSelectedRows(new Set());
      setUploadResult({
        success: true,
        message: `Successfully imported ${newEntries.length} shipment entries.`,
        errors: result.skippedRows > 0 ? [`${result.skippedRows} empty row(s) skipped.`] : [],
      });
    } catch (error) {
      setUploadResult({ success: false, message: "Failed to read the file.", errors: [String(error)] });
    }

    setIsProcessing(false);
  };

  const handleClearData = async () => {
    if (window.confirm("Clear all main sheet data?")) {
      await storageService.clear(COLLECTION);
      await loadEntries();
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} selected entry/entries?`)) return;
    const remaining = entries.filter((e) => !selectedRows.has(e.id));
    await storageService.bulkReplace(COLLECTION, remaining);
    await loadEntries();
    setSelectedRows(new Set());
  };

  const handleCellChange = async (rowId: string, columnKey: string, newValue: string) => {
    const updatedEntries = entries.map((e) => {
      if (e.id === rowId) {
        return {
          ...e,
          [columnKey]: newValue,
        };
      }
      return e;
    });
    await storageService.bulkReplace(COLLECTION, updatedEntries);
    await upsertSnapshot(updatedEntries);
    setEntries(updatedEntries);
  };

  const handleSplitMessageText = async () => {
    if (entries.length === 0) return;
    setIsProcessing(true);
    try {
      const updatedEntries = entries.map((entry) => {
        const originalText = entry.messageText ? String(entry.messageText).trim() : "";
        let splitVal = "";
        if (!originalText) {
          splitVal = "Processed Successfully";
        } else {
          const parts = originalText.split(":");
          const firstPart = parts[0] ? parts[0].trim() : "";
          splitVal = firstPart || "Processed Successfully";
        }
        return {
          ...entry,
          messageText2: splitVal,
        };
      });

      await storageService.bulkReplace(COLLECTION, updatedEntries);
      await upsertSnapshot(updatedEntries);
      setEntries(updatedEntries);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlantLookup = async () => {
    if (entries.length === 0) return;
    setIsProcessing(true);
    try {
      const plants = await storageService.getAll<Plant>("plants");
      const plantMap = new Map<string, Plant>();
      for (const p of plants) {
        if (p.plantCode) {
          plantMap.set(p.plantCode.trim().toUpperCase(), p);
        }
      }

      const updatedEntries = entries.map((entry) => {
        const plantCode = entry.plant ? entry.plant.trim().toUpperCase() : "";
        const matchedPlant = plantMap.get(plantCode);

        let mode = "";
        let digipinL6 = "";
        let plantName = "";

        if (matchedPlant) {
          mode = matchedPlant.mode || "";
          digipinL6 = matchedPlant.plantDigi6 || "";
          if (mode === "Primary") {
            plantName = matchedPlant.digipinPlantLocation || "";
          } else {
            plantName = matchedPlant.digipinFacility || "";
          }
        }

        return {
          ...entry,
          mode,
          digipinL6,
          plantName,
        };
      });

      await storageService.bulkReplace(COLLECTION, updatedEntries);
      await upsertSnapshot(updatedEntries);
      setEntries(updatedEntries);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchCTFlag = async () => {
    if (entries.length === 0) return;
    setIsProcessing(true);
    try {
      const updatedEntries = entries.map((entry) => {
        const originalText = entry.messageText ? String(entry.messageText) : "";
        const parts = originalText.split(":");
        const secondPart = parts[1] || "";
        const subParts = secondPart.split("_");
        let ctFlagValue = subParts[3] ? subParts[3].trim() : "";

        const EXCLUDED_CT_FLAGS = ["DE", "DC", "IT", "MTK"];
        if (EXCLUDED_CT_FLAGS.includes(ctFlagValue)) {
          ctFlagValue = "";
        }

        return {
          ...entry,
          ctFlag: ctFlagValue,
        };
      });

      await storageService.bulkReplace(COLLECTION, updatedEntries);
      await upsertSnapshot(updatedEntries);
      setEntries(updatedEntries);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet>
      {/* Toolbar */}
      <SheetToolbar viewName="All Entries" count={entries.length}>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search shipments..." />
        {selectedRows.size > 0 && (
          <ToolbarButton variant="danger" icon={TrashIcon} onClick={handleDeleteSelected}>
            Delete ({selectedRows.size})
          </ToolbarButton>
        )}
        {entries.length > 0 && (
          <>
            <div className="dropdown-wrapper" ref={dropdownRef}>
              <ToolbarButton variant="default" icon={SettingsIcon} onClick={() => setShowActionsDropdown(!showActionsDropdown)}>
                Actions
                {ChevronDownIcon}
              </ToolbarButton>
              {showActionsDropdown && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handleSplitMessageText();
                    }}
                  >
                    {MagicIcon}
                    <span>Split Message Text (:)</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handlePlantLookup();
                    }}
                  >
                    {DatabaseIcon}
                    <span>Lookup Plant Info</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handleFetchCTFlag();
                    }}
                  >
                    {MagicIcon}
                    <span>Fetch CT Flag</span>
                  </button>
                </div>
              )}
            </div>
            <ToolbarButton variant="ghost" onClick={handleClearData}>
              Clear all
            </ToolbarButton>
          </>
        )}
        <ToolbarButton variant="primary" icon={PlusIcon} onClick={openModal} id="upload-mainsheet-btn">
          Upload File
        </ToolbarButton>
      </SheetToolbar>

      {/* Data Grid */}
      <DataSheet
        columns={mainSheetColumns}
        data={filteredEntries}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onCellChange={handleCellChange}
        emptyState={
          <SheetEmptyState
            icon={UploadIcon}
            title="No sheet data"
            description="The main sheet is empty. Import an Excel file containing all the 47 shipment columns to get started."
            action={
              <button className="btn btn--primary" onClick={openModal}>
                {PlusIcon} Upload File
              </button>
            }
          />
        }
      />

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={closeModal}
        title="Upload Shipment Data"
        footer={
          <>
            <button className="btn btn--secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing}
              style={{ opacity: !selectedFile || isProcessing ? 0.5 : 1 }}
            >
              {isProcessing ? "Processing..." : "Upload & Process"}
            </button>
          </>
        }
      >
        {/* Instructions */}
        <div className="instructions">
          <div className="instructions__title">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Instructions
          </div>
          <ul className="instructions__list">
            <li>Upload an Excel (.xlsx, .xls) or CSV file</li>
            <li>
              File <strong>must</strong> contain all 47 shipment columns (Delivery, Item, Billing Document, Created on, etc.)
            </li>
            <li>Columns are matched case-insensitively. Extra columns will be ignored</li>
            <li>
              This will <strong>replace</strong> all existing main sheet data
            </li>
          </ul>
        </div>

        {/* Expected format preview */}
        <div className="preview-section" style={{ maxHeight: "200px", overflow: "auto" }}>
          <div className="preview-section__title">Expected Format (Partial Preview)</div>
          <table className="preview-table">
            <thead>
              <tr>
                <th>
                  Delivery <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Item <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Billing Document <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Item <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Created on <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Created by <span className="preview-table__required">Req</span>
                </th>
                <th>
                  Act. Gds Mvmnt Date <span className="preview-table__required">Req</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>80092812</td>
                <td>10</td>
                <td>90028127</td>
                <td>10</td>
                <td>2026-06-01</td>
                <td>SYSTEM_GEN</td>
                <td>2026-06-02</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Date Selection */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Report Date</label>
          <input
            type="date"
            value={uploadDate}
            onChange={(e) => setUploadDate(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", width: "100%", outline: "none" }}
          />
        </div>

        {/* Upload zone */}
        <UploadZone selectedFile={selectedFile} onFileSelect={setSelectedFile} />

        {/* Result messages */}
        {uploadResult && (
          <div style={{ marginTop: "12px" }}>
            <div className={`alert alert--${uploadResult.success ? "success" : "error"}`}>
              <div className="alert__content">
                <p>
                  <strong>{uploadResult.message}</strong>
                </p>
                {uploadResult.errors.map((err, i) => (
                  <p key={i} style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                    {err}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Sheet>
  );
}

export default MainSheetPage;
