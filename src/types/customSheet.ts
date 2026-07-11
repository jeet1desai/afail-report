export interface CustomErrorConfig {
  id: string;
  name: string;
  keywords: string[];
  enabled: boolean;
}

export interface CustomSheetConfig {
  id: string;
  name: string;
  mode: 'primary' | 'secondary' | 'all';
  regions: string[]; // e.g. ["GJ", "DN"]
  plants: string[]; // e.g. ["sanghi"]
  ctFlag: 'all' | 'empty' | 'non-empty';
  failureErrors: {
    customerNotFound: boolean;
    freightSlabNotMaintained: boolean;
    truckNotFound: boolean;
    freightNotFound: boolean;
  };
  customErrors?: CustomErrorConfig[];
  showInStateReport: boolean;
  showInSummary: boolean;
}
