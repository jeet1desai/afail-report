import React, { useRef } from 'react';

interface UploadZoneProps {
  /** Currently selected file */
  selectedFile: File | null;
  /** Called when a file is selected (via click or drop) */
  onFileSelect: (file: File) => void;
  /** Accepted file types (e.g. ".xlsx,.xls,.csv") */
  accept?: string;
  /** Label shown when no file is selected */
  label?: string;
  /** Subtitle (e.g. "Supports .xlsx, .xls, .csv") */
  subtitle?: string;
}

/**
 * UploadZone — Drag & drop file upload area.
 *
 * Usage:
 * ```tsx
 * <UploadZone
 *   selectedFile={file}
 *   onFileSelect={setFile}
 *   accept=".xlsx,.xls,.csv"
 * />
 * ```
 */
export function UploadZone({ selectedFile, onFileSelect, accept = '.xlsx,.xls,.csv', label = 'Click to upload or drag & drop', subtitle = '.xlsx, .xls, .csv' }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className={`upload-zone${selectedFile ? ' upload-zone--active' : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="upload-zone__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="upload-zone__title">{selectedFile ? 'File selected' : label}</div>
      <div className="upload-zone__subtitle">{subtitle}</div>
      {selectedFile && (
        <div className="upload-zone__file-info">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </div>
      )}
      <input ref={fileInputRef} type="file" className="hidden-input" accept={accept} onChange={handleChange} />
    </div>
  );
}

export default UploadZone;
