import { useState, useEffect, useCallback } from "react";
import { storageService } from "../services/storage";
import { parseExcelInWorker } from "../utils/excelParser";
import { generateId } from "../utils/helpers";
import type { Plant } from "../types/plant";
import { Sheet, SheetToolbar, DataSheet, SheetEmptyState, SearchInput, CellBadge, ToolbarButton } from "../components/Sheet";
import type { ColumnDef } from "../components/Sheet";
import { Modal } from "../components/Modal";
import { UploadZone } from "../components/UploadZone";

const COLLECTION = "plants";

/* ===== Column Definitions ===== */
const plantColumns: ColumnDef<Plant>[] = [
  {
    key: "plantCode",
    label: "Plant Code",
    width: "15%",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    key: "mode",
    label: "Mode",
    width: "10%",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    key: "plantDigi6",
    label: "Plant Digi6",
    width: "15%",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "digipinPlantLocation",
    label: "Digipin Plant Location",
    width: "25%",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "digipinFacility",
    label: "Digipin Facility",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
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

function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    errors: string[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const loadPlants = useCallback(async () => {
    const data = await storageService.getAll<Plant>(COLLECTION);
    setPlants(data);
  }, []);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  // Filter data by search
  const filteredPlants = plants.filter((plant) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      plant.plantCode.toLowerCase().includes(term) ||
      plant.mode.toLowerCase().includes(term) ||
      plant.plantDigi6.toLowerCase().includes(term) ||
      plant.digipinPlantLocation.toLowerCase().includes(term) ||
      plant.digipinFacility.toLowerCase().includes(term)
    );
  });

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
      const result = await parseExcelInWorker<Plant>(selectedFile, 'plants');

      if (!result.success) {
        setUploadResult({ success: false, message: "Failed to process the file.", errors: result.errors });
        setIsProcessing(false);
        return;
      }

      const newPlants: Plant[] = result.data.map((row: any) => ({
        id: generateId(),
        plantCode: row.plantCode,
        mode: row.mode,
        plantDigi6: row.plantDigi6,
        digipinPlantLocation: row.digipinPlantLocation,
        digipinFacility: row.digipinFacility,
        createdAt: new Date().toISOString(),
      }));

      await storageService.bulkReplace(COLLECTION, newPlants);
      await loadPlants();
      setSelectedRows(new Set());
      setUploadResult({
        success: true,
        message: `Successfully imported ${newPlants.length} plants.`,
        errors: result.skippedRows > 0 ? [`${result.skippedRows} empty row(s) skipped.`] : [],
      });
    } catch (error) {
      setUploadResult({ success: false, message: "Failed to read the file.", errors: [String(error)] });
    }

    setIsProcessing(false);
  };

  const handleClearData = async () => {
    if (window.confirm("Clear all plant data?")) {
      await storageService.clear(COLLECTION);
      await loadPlants();
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} selected plant(s)?`)) return;
    const remaining = plants.filter((p) => !selectedRows.has(p.id));
    await storageService.bulkReplace(COLLECTION, remaining);
    await loadPlants();
    setSelectedRows(new Set());
  };

  const handleCellChange = async (rowId: string, columnKey: string, newValue: string) => {
    const updatedPlants = plants.map((p) => {
      if (p.id === rowId) {
        return {
          ...p,
          [columnKey]: newValue,
        };
      }
      return p;
    });
    await storageService.bulkReplace(COLLECTION, updatedPlants);
    setPlants(updatedPlants);
  };

  return (
    <Sheet>
      {/* Toolbar */}
      <SheetToolbar viewName="All Plants" count={plants.length}>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search plants..." />
        {selectedRows.size > 0 && (
          <ToolbarButton variant="danger" icon={TrashIcon} onClick={handleDeleteSelected}>
            Delete ({selectedRows.size})
          </ToolbarButton>
        )}
        {plants.length > 0 && (
          <ToolbarButton variant="ghost" onClick={handleClearData}>
            Clear all
          </ToolbarButton>
        )}
        <ToolbarButton variant="primary" icon={PlusIcon} onClick={openModal} id="upload-plants-btn">
          Upload
        </ToolbarButton>
      </SheetToolbar>

      {/* Data Grid */}
      <DataSheet
        columns={plantColumns}
        data={filteredPlants}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onCellChange={handleCellChange}
        emptyState={
          <SheetEmptyState
            icon={UploadIcon}
            title="No plants data"
            description="Upload an Excel file to import plant data. The file should contain plant_code, mode, plant_digi6, digipin_plant_location, and digipin_facility columns."
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
        title="Upload Plant Data"
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
              File <strong>must</strong> have columns: <strong>plant_code</strong>, <strong>mode</strong>, <strong>plant_digi6</strong>, <strong>digipin_plant_location</strong>, <strong>digipin_facility</strong>
            </li>
            <li>Column names are case-insensitive</li>
            <li>Extra columns will be ignored</li>
            <li>
              This will <strong>replace</strong> all existing plant data
            </li>
          </ul>
        </div>

        {/* Expected format preview */}
        <div className="preview-section">
          <div className="preview-section__title">Expected Format</div>
          <table className="preview-table">
            <thead>
              <tr>
                <th>
                  plant_code <span className="preview-table__required">Required</span>
                </th>
                <th>
                  mode <span className="preview-table__required">Required</span>
                </th>
                <th>
                  plant_digi6 <span className="preview-table__required">Required</span>
                </th>
                <th>
                  digipin_plant_location <span className="preview-table__required">Required</span>
                </th>
                <th>
                  digipin_facility <span className="preview-table__required">Required</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>P001</td>
                <td>Road</td>
                <td>3J7-96K</td>
                <td>3J7-96K</td>
                <td>Mundra Port Facility</td>
              </tr>
              <tr>
                <td>P002</td>
                <td>Rail</td>
                <td>4M2-X8P</td>
                <td>4M2-X8P</td>
                <td>Dahej Terminal</td>
              </tr>
            </tbody>
          </table>
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
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Sheet>
  );
}

export default PlantsPage;
