import * as XLSX from 'xlsx';

export interface ExcelParsedData {
  headers: string[];
  rows: string[][];
}

export function excelToCsvData(buffer: Buffer): ExcelParsedData {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }

  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const range = ws['!ref'];
  if (!range) {
    throw new Error('Selected sheet appears to be empty');
  }

  const jsonData: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: true,
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const allHeaders = Array.from(new Set(
    jsonData.flatMap((row) => Object.keys(row).filter((k) => k && String(k).trim()))
  ));

  const headers = allHeaders.map((h) => String(h).trim());

  const rows: string[][] = jsonData.map((row) => {
    return headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return String(val);
    });
  });

  return { headers, rows };
}
