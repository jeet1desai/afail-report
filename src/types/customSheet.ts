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
  showInStateReport: boolean;
  showInSummary: boolean;
}
