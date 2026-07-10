import { storageService } from '../services/storage';
import type { CustomSheetConfig } from '../types/customSheet';

export const DEFAULT_SHEETS: CustomSheetConfig[] = [
  {
    id: 'gj_secondary',
    name: 'GJ Secondary',
    mode: 'secondary',
    regions: ['GJ', 'DN'],
    plants: [],
    ctFlag: 'all',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: true,
      truckNotFound: false,
      freightNotFound: false,
    },
    showInStateReport: true,
    showInSummary: true,
  },
  {
    id: 'dl_secondary',
    name: 'DL Secondary',
    mode: 'secondary',
    regions: ['DL'],
    plants: [],
    ctFlag: 'all',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: true,
      truckNotFound: false,
      freightNotFound: false,
    },
    showInStateReport: true,
    showInSummary: true,
  },
  {
    id: 'ka_secondary',
    name: 'KA Secondary',
    mode: 'secondary',
    regions: ['KA'],
    plants: [],
    ctFlag: 'all',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: true,
      truckNotFound: false,
      freightNotFound: false,
    },
    showInStateReport: true,
    showInSummary: true,
  },
  {
    id: 'ga_secondary',
    name: 'GA Secondary',
    mode: 'secondary',
    regions: ['GA'],
    plants: [],
    ctFlag: 'all',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: true,
      truckNotFound: false,
      freightNotFound: false,
    },
    showInStateReport: true,
    showInSummary: true,
  },
  {
    id: 'sanghi_primary',
    name: 'Sanghi',
    mode: 'primary',
    regions: ['GJ', 'DN'],
    plants: ['sanghi'],
    ctFlag: 'empty',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: false,
      truckNotFound: true,
      freightNotFound: true,
    },
    showInStateReport: true,
    showInSummary: false,
  },
  {
    id: 'dahej_primary',
    name: 'Dahej',
    mode: 'primary',
    regions: ['GJ', 'DN'],
    plants: ['dahej'],
    ctFlag: 'empty',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: false,
      truckNotFound: true,
      freightNotFound: true,
    },
    showInStateReport: true,
    showInSummary: false,
  },
  {
    id: 'sow_primary',
    name: 'SOW',
    mode: 'primary',
    regions: ['GJ', 'DN'],
    plants: ['adalaj - sow', 'moraiya - sow', 'sarkhej - sow'],
    ctFlag: 'empty',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: false,
      truckNotFound: true,
      freightNotFound: true,
    },
    showInStateReport: true,
    showInSummary: false,
  },
  {
    id: 'surat_primary',
    name: 'Surat',
    mode: 'primary',
    regions: ['GJ', 'DN'],
    plants: ['surat'],
    ctFlag: 'empty',
    failureErrors: {
      customerNotFound: true,
      freightSlabNotMaintained: false,
      truckNotFound: true,
      freightNotFound: true,
    },
    showInStateReport: true,
    showInSummary: false,
  },
];

export async function getCustomSheets(): Promise<CustomSheetConfig[]> {
  const stored = await storageService.getAll<CustomSheetConfig>('custom_sheets');
  if (stored.length === 0) {
    await storageService.bulkReplace('custom_sheets', DEFAULT_SHEETS);
    return DEFAULT_SHEETS;
  }
  return stored;
}
