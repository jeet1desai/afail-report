import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Modal } from './Modal';
import { DEFAULT_SHEETS } from '../utils/defaultSheets';
import type { CustomSheetConfig, CustomErrorConfig } from '../types/customSheet';

interface ConfigureSheetsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ConfigureSheetsModal({ open, onClose, onSave }: ConfigureSheetsModalProps) {
  const [configs, setConfigs] = useState<CustomSheetConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<CustomSheetConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formMode, setFormMode] = useState<'primary' | 'secondary' | 'all'>('all');
  const [formRegions, setFormRegions] = useState('');
  const [formPlants, setFormPlants] = useState('');
  const [formCtFlag, setFormCtFlag] = useState<'all' | 'empty' | 'non-empty'>('all');
  const [formCustomerNotFound, setFormCustomerNotFound] = useState(true);
  const [formFreightSlab, setFormFreightSlab] = useState(false);
  const [formTruckNotFound, setFormTruckNotFound] = useState(false);
  const [formFreightNotFound, setFormFreightNotFound] = useState(false);
  const [formCustomErrors, setFormCustomErrors] = useState<CustomErrorConfig[]>([]);
  const [newErrorName, setNewErrorName] = useState('');
  const [newErrorKeywords, setNewErrorKeywords] = useState('');
  const [formShowInStateReport, setFormShowInStateReport] = useState(true);
  const [formShowInSummary, setFormShowInSummary] = useState(true);

  const loadConfigs = async () => {
    const stored = await storageService.getAll<CustomSheetConfig>('custom_sheets');
    if (stored.length === 0) {
      setConfigs(DEFAULT_SHEETS);
    } else {
      setConfigs(stored);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfigs();
      setIsFormOpen(false);
      setEditingConfig(null);
    }
  }, [open]);

  const openAddForm = () => {
    setEditingConfig(null);
    setFormName('');
    setFormMode('all');
    setFormRegions('');
    setFormPlants('');
    setFormCtFlag('all');
    setFormCustomerNotFound(true);
    setFormFreightSlab(false);
    setFormTruckNotFound(false);
    setFormFreightNotFound(false);
    setFormCustomErrors([]);
    setNewErrorName('');
    setNewErrorKeywords('');
    setFormShowInStateReport(true);
    setFormShowInSummary(true);
    setIsFormOpen(true);
  };

  const openEditForm = (config: CustomSheetConfig) => {
    setEditingConfig(config);
    setFormName(config.name);
    setFormMode(config.mode);
    setFormRegions(config.regions.join(', '));
    setFormPlants(config.plants.join(', '));
    setFormCtFlag(config.ctFlag || 'all');
    setFormCustomerNotFound(config.failureErrors.customerNotFound);
    setFormFreightSlab(config.failureErrors.freightSlabNotMaintained);
    setFormTruckNotFound(config.failureErrors.truckNotFound);
    setFormFreightNotFound(config.failureErrors.freightNotFound);
    setFormCustomErrors(config.customErrors || []);
    setNewErrorName('');
    setNewErrorKeywords('');
    setFormShowInStateReport(config.showInStateReport);
    setFormShowInSummary(config.showInSummary);
    setIsFormOpen(true);
  };

  const handleAddCustomError = () => {
    if (!newErrorName.trim() || !newErrorKeywords.trim()) return;
    const keywordsArray = newErrorKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    if (keywordsArray.length === 0) return;

    const newCE: CustomErrorConfig = {
      id: `ce_${Date.now()}`,
      name: newErrorName.trim(),
      keywords: keywordsArray,
      enabled: true,
    };

    setFormCustomErrors((prev) => [...prev, newCE]);
    setNewErrorName('');
    setNewErrorKeywords('');
  };

  const handleToggleCustomError = (id: string, enabled: boolean) => {
    setFormCustomErrors((prev) => prev.map((ce) => (ce.id === id ? { ...ce, enabled } : ce)));
  };

  const handleDeleteCustomError = (id: string) => {
    setFormCustomErrors((prev) => prev.filter((ce) => ce.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const regionsArray = formRegions
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter((r) => r.length > 0);

    const plantsArray = formPlants
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const updatedConfig: CustomSheetConfig = {
      id: editingConfig?.id || `custom_${Date.now()}`,
      name: formName.trim(),
      mode: formMode,
      regions: regionsArray,
      plants: plantsArray,
      ctFlag: formCtFlag,
      failureErrors: {
        customerNotFound: formCustomerNotFound,
        freightSlabNotMaintained: formFreightSlab,
        truckNotFound: formTruckNotFound,
        freightNotFound: formFreightNotFound,
      },
      customErrors: formCustomErrors,
      showInStateReport: formShowInStateReport,
      showInSummary: formShowInSummary,
    };

    const stored = await storageService.getAll<CustomSheetConfig>('custom_sheets');
    const existingIndex = stored.findIndex((item) => item.id === updatedConfig.id);

    if (existingIndex !== -1) {
      stored[existingIndex] = updatedConfig;
    } else {
      stored.push(updatedConfig);
    }

    await storageService.bulkReplace('custom_sheets', stored);
    await loadConfigs();
    setIsFormOpen(false);
    onSave();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sheet configuration?')) {
      const stored = await storageService.getAll<CustomSheetConfig>('custom_sheets');
      const filtered = stored.filter((item) => item.id !== id);
      await storageService.bulkReplace('custom_sheets', filtered);
      await loadConfigs();
      onSave();
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('This will delete all custom modifications and restore default configurations. Continue?')) {
      await storageService.bulkReplace('custom_sheets', DEFAULT_SHEETS);
      await loadConfigs();
      onSave();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isFormOpen ? (editingConfig ? `Edit: ${editingConfig.name}` : 'Create New Sheet') : 'Configure Failure Report Sheets'}
      footer={
        isFormOpen ? (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="btn btn--secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="sheet-config-form" className="btn btn--primary">
              Save Configuration
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button type="button" className="btn btn--secondary" onClick={handleResetToDefaults} style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
              Reset to Defaults
            </button>
            <button type="button" className="btn btn--primary" onClick={openAddForm}>
              + Add New Sheet
            </button>
          </div>
        )
      }
    >
      <style>{`
        .config-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .config-table th {
          padding: 10px 12px;
          border-bottom: 2px solid var(--border-color);
          background: var(--bg-secondary);
          font-weight: 600;
          color: var(--text-secondary);
          text-align: left;
        }
        .config-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
        }
        .config-table tr:hover {
          background: var(--bg-hover);
        }
      `}</style>
      {isFormOpen ? (
        <form id="sheet-config-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Sheet Name
            </label>
            <input
              type="text"
              className="form-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. KA Secondary"
              required
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Distribution Mode
              </label>
              <select
                value={formMode}
                onChange={(e) => setFormMode(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="all">All Modes</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                CT Flag
              </label>
              <select
                value={formCtFlag}
                onChange={(e) => setFormCtFlag(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="all">Include all (No CT filter)</option>
                <option value="empty">Exclude rows with CT Flag</option>
                <option value="non-empty">Include ONLY rows with CT Flag</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Regions (comma separated)
              </label>
              <input
                type="text"
                className="form-input"
                value={formRegions}
                onChange={(e) => setFormRegions(e.target.value)}
                placeholder="e.g. KA, GA, GJ (leave empty for all)"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Plant names (comma separated)
              </label>
              <input
                type="text"
                className="form-input"
                value={formPlants}
                onChange={(e) => setFormPlants(e.target.value)}
                placeholder="e.g. sanghi, sow (leave empty for all)"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Define Failure Criteria (Select matching errors)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formCustomerNotFound} onChange={(e) => setFormCustomerNotFound(e.target.checked)} />
                Customer not found
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formFreightSlab} onChange={(e) => setFormFreightSlab(e.target.checked)} />
                Freight slab not maintained
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formTruckNotFound} onChange={(e) => setFormTruckNotFound(e.target.checked)} />
                Truck details not found
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formFreightNotFound} onChange={(e) => setFormFreightNotFound(e.target.checked)} />
                Freight rate not found
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Custom Failure Criteria (Match additional errors)
            </label>

            {formCustomErrors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                {formCustomErrors.map((ce) => (
                  <div key={ce.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '4px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', flex: 1 }}>
                      <input type="checkbox" checked={ce.enabled} onChange={(e) => handleToggleCustomError(ce.id, e.target.checked)} />
                      <span style={{ fontWeight: 500 }}>{ce.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({ce.keywords.join(', ')})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomError(ce.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '2px 6px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Error Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Pricing Error"
                  value={newErrorName}
                  onChange={(e) => setNewErrorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Keywords (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. price, rate, tariff"
                  value={newErrorKeywords}
                  onChange={(e) => setNewErrorKeywords(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAddCustomError}
                style={{ padding: '6px 12px', fontSize: '0.85rem', height: '31px', display: 'flex', alignItems: 'center' }}
              >
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', flex: 1 }}>
              <input type="checkbox" checked={formShowInStateReport} onChange={(e) => setFormShowInStateReport(e.target.checked)} />
              Show in State Report Tabs
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', flex: 1 }}>
              <input type="checkbox" checked={formShowInSummary} onChange={(e) => setFormShowInSummary(e.target.checked)} />
              Show in Executive Summary
            </label>
          </div>
        </form>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table className="config-table">
            <tbody>
              {configs.map((config) => {
                return (
                  <tr key={config.id}>
                    <td style={{ fontWeight: 600 }}>{config.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn--secondary btn--sm" onClick={() => openEditForm(config)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                          Edit
                        </button>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => handleDelete(config.id)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default ConfigureSheetsModal;
