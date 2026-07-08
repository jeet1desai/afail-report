import * as XLSX from 'xlsx';

// 1. Normalized matcher
function findColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalized === normalizedPattern) {
        return header;
      }
    }
  }
  return null;
}

// 2. Date Formatter
function formatDateValue(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(val).trim();
  if (str === '#####') {
    return '';
  }
  // Check ISO format
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(str)) {
    return str.slice(0, 10);
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})(?:\s+.*)?$/);
  if (dmyMatch) {
    const num1 = parseInt(dmyMatch[1], 10);
    const num2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];

    const month = String(num1).padStart(2, '0');
    const day = String(num2).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
  // Convert Excel serial number
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Final Catch-All Fallback: Let JavaScript try to parse it
  const fallbackDate = new Date(str);
  if (!isNaN(fallbackDate.getTime())) {
    const yyyy = fallbackDate.getFullYear();
    const mm = String(fallbackDate.getMonth() + 1).padStart(2, '0');
    const dd = String(fallbackDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

// 3. Plant Extract Config & Function
const PLANT_COLUMN_MAP = [
  { field: 'plantCode', label: 'plant_code', patterns: ['plant code', 'plantcode', 'plant_code'] },
  { field: 'mode', label: 'mode', patterns: ['mode'] },
  { field: 'plantDigi6', label: 'plant_digi6', patterns: ['plant digi6', 'plant_digi6', 'plantdigi6'] },
  { field: 'digipinPlantLocation', label: 'digipin_plant_location', patterns: ['digipin plant location', 'digipin_plant_location', 'digipinplantlocation'] },
  { field: 'digipinFacility', label: 'digipin_facility', patterns: ['digipin facility', 'digipin_facility', 'digipinfacility'] },
];

function extractPlantData(rows: any[]) {
  if (rows.length === 0) {
    return { success: false, data: [], errors: ['Empty rows in Excel sheet.'], totalRows: 0, skippedRows: 0 };
  }
  const headers = Object.keys(rows[0]);
  const missingColumns: string[] = [];
  const columnMapping: Record<string, string> = {};

  for (const col of PLANT_COLUMN_MAP) {
    const found = findColumn(headers, col.patterns);
    if (!found) missingColumns.push(col.label);
    else columnMapping[col.field] = found;
  }

  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing columns: ${missingColumns.join(', ')}`],
      totalRows: rows.length,
      skippedRows: rows.length,
    };
  }

  const data: any[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const plantCode = String(row[columnMapping['plantCode']] ?? '').trim();
    const mode = String(row[columnMapping['mode']] ?? '').trim();
    const plantDigi6 = String(row[columnMapping['plantDigi6']] ?? '').trim();
    const digipinPlantLocation = String(row[columnMapping['digipinPlantLocation']] ?? '').trim();
    const digipinFacility = String(row[columnMapping['digipinFacility']] ?? '').trim();

    if (!plantCode && !mode && !plantDigi6 && !digipinPlantLocation && !digipinFacility) {
      skippedRows++;
      continue;
    }
    data.push({ plantCode, mode, plantDigi6, digipinPlantLocation, digipinFacility });
  }

  return { success: true, data, errors: [], totalRows: rows.length, skippedRows };
}

/* Required columns — parser will fail if these are missing */
const MAIN_SHEET_COLUMN_MAP = [
  { field: 'delivery', label: 'Delivery', patterns: ['delivery', 'deliveryno', 'delivery_no'] },
  { field: 'billingDocument', label: 'Billing Document', patterns: ['billing document', 'billingdocument', 'billing_document', 'billing doc', 'bill doc'] },
  { field: 'createdBy', label: 'Created by', patterns: ['created by', 'createdby', 'created_by'] },
  { field: 'actGdsMvmntDate', label: 'Act. Gds Mvmnt Date', patterns: ['act gds mvmnt date', 'actgdsmvmntdate', 'act_gds_mvmnt_date', 'act gds mvmnt', 'actual goods movement date', 'ac gi date', 'acgidate'] },
  { field: 'deliveryType', label: 'Delivery Type', patterns: ['delivery type', 'deliverytype', 'delivery_type', 'dlvty'] },
  { field: 'billingType', label: 'Billing Type', patterns: ['billing type', 'billingtype', 'billing_type', 'billt'] },
  { field: 'billedQty', label: 'Billed Qty', patterns: ['billed qty', 'billedqty', 'billed_qty', 'billed quantity', 'bill qty in sku', 'billqtyinsku'] },
  { field: 'salesOrganization', label: 'Sales Organization', patterns: ['sales organization', 'salesorganization', 'salesorg', 'sales_org', 'sorg'] },
  { field: 'distributionChannel', label: 'Distribution Channel', patterns: ['distribution channel', 'distributionchannel', 'dist channel', 'distchannel', 'dchl'] },
  { field: 'division', label: 'Division', patterns: ['division', 'dv'] },
  { field: 'soldToParty', label: 'Sold-to party', patterns: ['sold to party', 'soldtoparty', 'sold_to_party', 'sold to pt'] },
  { field: 'shipToParty', label: 'Ship-to party', patterns: ['ship to party', 'shiptoparty', 'ship_to_party', 'ship to'] },
  { field: 'regionOfDlvPlant', label: 'Region of dlv.plant', patterns: ['region of dlv plant', 'regionofdlvplant', 'region of dlv.plant', 'region of delivery plant', 'reg'] },
  { field: 'soldToRegion', label: 'Sold To Region', patterns: ['sold to region', 'soldtoregion', 'sold_to_region', 'so reg', 'soreg'] },
  { field: 'shipToRegion', label: 'Ship To Region', patterns: ['ship to region', 'shiptoregion', 'ship_to_region', 'sh reg', 'shreg'] },
  { field: 'incoterms', label: 'Incoterms', patterns: ['incoterms', 'incoterm', 'incot'] },
  { field: 'shipDigi10', label: 'SHIP DIGI10', patterns: ['ship digi10', 'shipdigi10', 'ship_digi10', 'ship digi 10'] },
  { field: 'sourceDigi10', label: 'SOURCE DIGI10', patterns: ['source digi10', 'sourcedigi10', 'source_digi10', 'source digi 10'] },
  { field: 'shippingType', label: 'Shipping type', patterns: ['shipping type', 'shippingtype', 'shipping_type', 'st'] },
  { field: 'specialProcIndicator', label: 'Special proc. indicator', patterns: ['special proc indicator', 'specialprocindicator', 'special_proc_indicator', 'special proc. indicator', 'sppi'] },
  { field: 'contractType', label: 'Contract Type', patterns: ['contract type', 'contracttype', 'contract_type', 'contract typ'] },
  { field: 'materialGroup1', label: 'Material group 1', patterns: ['material group 1', 'materialgroup1', 'material_group_1', 'mg 1'] },
  { field: 'productHierarchy', label: 'Product hierarchy', patterns: ['product hierarchy', 'producthierarchy', 'product_hierarchy'] },
  { field: 'geoDistrict', label: 'Geo District', patterns: ['geo district', 'geodistrict', 'geo_district', 'gd'] },
  { field: 'plant', label: 'Plant', patterns: ['plant', 'plnt'] },
  { field: 'storageLocation', label: 'Storage Location', patterns: ['storage location', 'storagelocation', 'storage_location', 'sloc'] },
  { field: 'meansOfTransId', label: 'Means of Trans. ID', patterns: ['means of trans id', 'meansoftransid', 'means_of_trans_id', 'means of trans. id'] },
  { field: 'cancelled', label: 'Cancelled', patterns: ['cancelled', 'cancel', 'can'] },
  { field: 'postingStatus', label: 'Posting Status', patterns: ['posting status', 'postingstatus', 'posting_status', 'psst'] },
  { field: 'time', label: 'Time', patterns: ['time'] },
  { field: 'baseFreight', label: 'Base Freight', patterns: ['base freight', 'basefreight', 'base_freight'] },
  { field: 'waraiCharges', label: 'Warai Charges', patterns: ['warai charges', 'waraicharges', 'warai_charges', 'warai'] },
  { field: 'unloadingCharges', label: 'Unloading Charges', patterns: ['unloading charges', 'unloadingcharges', 'unloading_charges'] },
  { field: 'otherFreightCharge', label: 'Other Freight Charge', patterns: ['other freight charge', 'otherfreightcharge', 'other_freight_charge'] },
  { field: 'tollCharges', label: 'Toll Charges', patterns: ['toll charges', 'tollcharges', 'toll_charges'] },
  { field: 'additionalGoodsTax', label: 'Additional Goods Tax', patterns: ['additional goods tax', 'additionalgoodstax', 'additional_goods_tax'] },
  { field: 'distance', label: 'Distance', patterns: ['distance'] },
  { field: 'minimumFreight', label: 'Minimum Freight', patterns: ['minimum freight', 'minimumfreight', 'minimum_freight', 'min frt', 'minfrt'] },
  { field: 'totalFreight', label: 'Total Freight', patterns: ['total freight', 'totalfreight', 'total_freight'] },
  { field: 'messageType', label: 'Message type', patterns: ['message type', 'messagetype', 'message_type', 'msgtype'] },
  { field: 'messageText', label: 'Message text', patterns: ['message text', 'messagetext', 'message_text', 'message'] },
  { field: 'aopReceivedFlag', label: 'AOP Received Flag', patterns: ['aop received flag', 'aopreceivedflag', 'aop_received_flag', 'zsd freight aop aop recvd'] },
  { field: 'aopReceivedDate', label: 'AOP Received Date', patterns: ['aop received date', 'aopreceiveddate', 'aop_received_date', 'zsd freight aop aopdt'] },
  { field: 'aopReceivedTime', label: 'AOP Received Time', patterns: ['aop received time', 'aopreceivedtime', 'aop_received_time', 'zsd freight aop aopet'] },
];

/* Optional columns — parser won't fail if these are missing */
const MAIN_SHEET_OPTIONAL_COLUMN_MAP = [
  { field: 'newShippingType', label: 'New Shipping Type', patterns: ['new shipping type', 'newshippingtype', 'new_shipping_type'] },
  { field: 'billedQtyUnit', label: 'BUn', patterns: ['bun', 'billing unit', 'base unit'] },
];

function extractMainSheetData(rows: any[]) {
  if (rows.length === 0) {
    return { success: false, data: [], errors: ['Empty rows in Excel sheet.'], totalRows: 0, skippedRows: 0 };
  }
  const headers = Object.keys(rows[0]);

  const allItemHeaders = headers.filter(h => h.toLowerCase().includes('item'));
  const itemHeader1 = findColumn(headers, ['item']);
  const itemHeader2 = findColumn(headers, ['item_1', 'item 1', 'billing item', 'billingitem']) || 
                      allItemHeaders.find(h => h !== itemHeader1);

  const allCreatedOnHeaders = headers.filter(h => h.toLowerCase().replace(/[\s_]+/g, '').includes('createdon'));
  const createdOnHeader1 = findColumn(headers, ['created on', 'createdon']);
  const createdOnHeader2 = findColumn(headers, ['created on_1', 'created on 1', 'billing created on', 'billingcreatedon']) ||
                           allCreatedOnHeaders.find(h => h !== createdOnHeader1);

  const missingColumns: string[] = [];
  const columnMapping: Record<string, string> = {};

  if (!itemHeader1) missingColumns.push('Item (Delivery)');
  else columnMapping['item'] = itemHeader1;

  if (itemHeader2) columnMapping['billingItem'] = itemHeader2;

  if (!createdOnHeader1) missingColumns.push('Created on (Delivery)');
  else columnMapping['createdOn'] = createdOnHeader1;

  if (createdOnHeader2) columnMapping['billingCreatedOn'] = createdOnHeader2;

  for (const col of MAIN_SHEET_COLUMN_MAP) {
    const found = findColumn(headers, col.patterns);
    if (!found) missingColumns.push(col.label);
    else columnMapping[col.field] = found;
  }

  // Map optional columns (don't add to missingColumns if not found)
  for (const col of MAIN_SHEET_OPTIONAL_COLUMN_MAP) {
    const found = findColumn(headers, col.patterns);
    if (found) columnMapping[col.field] = found;
  }

  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [
        `Missing columns: ${missingColumns.join(', ')}`,
        `Expected 47 columns.`,
      ],
      totalRows: rows.length,
      skippedRows: rows.length,
    };
  }

  const data: any[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const entry: any = {};
    let hasAnyData = false;

    for (const col of [...MAIN_SHEET_COLUMN_MAP, ...MAIN_SHEET_OPTIONAL_COLUMN_MAP]) {
      if (!columnMapping[col.field]) {
        entry[col.field] = '';
        continue;
      }
      let val = String(row[columnMapping[col.field]] ?? '').trim();
      if (['createdOn', 'billingCreatedOn', 'actGdsMvmntDate', 'aopReceivedDate'].includes(col.field)) {
        val = formatDateValue(row[columnMapping[col.field]]);
      }
      entry[col.field] = val;
      if (val) hasAnyData = true;
    }

    const itemVal = columnMapping['item'] ? String(row[columnMapping['item']] ?? '').trim() : '';
    const billingItemVal = columnMapping['billingItem'] ? String(row[columnMapping['billingItem']] ?? '').trim() : '';
    const createdOnVal = columnMapping['createdOn'] ? formatDateValue(row[columnMapping['createdOn']]) : '';
    const billingCreatedOnVal = columnMapping['billingCreatedOn'] ? formatDateValue(row[columnMapping['billingCreatedOn']]) : '';

    entry['item'] = itemVal;
    entry['billingItem'] = billingItemVal;
    entry['createdOn'] = createdOnVal;
    entry['billingCreatedOn'] = billingCreatedOnVal;

    if (itemVal || billingItemVal || createdOnVal || billingCreatedOnVal) {
      hasAnyData = true;
    }

    if (!hasAnyData) {
      skippedRows++;
      continue;
    }
    data.push(entry);
  }

  return { success: true, data, errors: [], totalRows: rows.length, skippedRows };
}

// 5. Worker Message Handler
self.onmessage = (e: MessageEvent) => {
  const { arrayBuffer, type } = e.data;
  try {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, defval: '' });

    if (type === 'plants') {
      const result = extractPlantData(jsonData);
      self.postMessage({ success: true, result });
    } else if (type === 'main_sheet') {
      const result = extractMainSheetData(jsonData);
      self.postMessage({ success: true, result });
    }
  } catch (err) {
    self.postMessage({ success: false, error: String(err) });
  }
};
