export interface CsvColumnMapping {
  teamId: string;
  teamName: string;
  domain: string;
  paymentUtr: string;
  paymentStatus: string;
  teamStatus: string;
  registrationTimestamp: string;
  participantName: string;
  email: string;
  phone: string;
  usn: string;
  college: string;
  state: string;
  gender: string;
  role: string;
  accommodationRequired: string;
  portalPassword: string;
  accessPassword: string;
}

export interface CsvRowValidation {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: Record<string, string>;
}

export interface CsvPreviewResult {
  totalRows: number;
  headerRow: string[];
  validRows: number;
  invalidRows: number;
  validations: CsvRowValidation[];
  sampleRows: (Record<string, string> | null)[];
  suggestedMappings: Partial<CsvColumnMapping> | null;
}

export interface CsvImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  teamIds: string[];
}

export const HEADER_ALIASES: Record<string, string[]> = {
  team_id: ['team_id', 'team id', 'teamid', 'team', 'team no', 'teamno', 'registration_id', 'reg_id', 'id'],
  team_name: ['team_name', 'team name', 'teamname', 'name', 'team title', 'teamtitle'],
  domain: ['domain', 'track', 'preferred_track', 'preferred track', 'track_name', 'trackname', 'category'],
  payment_utr: ['payment_utr', 'payment utr', 'paymentutr', 'utr', 'transaction_id', 'transactionid', 'transaction reference', 'transactionreference'],
  payment_status: ['payment_status', 'payment status', 'paymentstatus', 'payment'],
  team_status: ['team_status', 'team status', 'teamstatus', 'status'],
  registration_timestamp: ['registration_timestamp', 'registration timestamp', 'registrationtimestamp', 'created_at', 'createdat', 'date', 'timestamp', 'reg_date', 'regdate'],
  participant_name: ['participant_name', 'participant name', 'participantname', 'name', 'full_name', 'full name', 'fullname', 'student_name', 'student name'],
  email: ['email', 'email address', 'emailaddress', 'e-mail', 'mail'],
  phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'contact', 'contact number', 'contactnumber', 'telephone'],
  usn: ['usn', 'roll_number', 'roll number', 'rollno', 'roll', 'student_id', 'student id', 'studentid', 'enrollment', 'enrollment_no'],
  college: ['college', 'college name', 'collegename', 'institution', 'institution name', 'school', 'university', 'dept', 'department'],
  state: ['state', 'state name', 'statename', 'location'],
  gender: ['gender', 'sex'],
  role: ['role', 'designation', 'position', 'leader_role', 'leader role'],
  accommodation_required: ['accommodation_required', 'accommodation required', 'accommodation', 'accom', 'needs_accommodation', 'needs accom', 'room_required', 'room required'],
  portal_password: ['portal_password', 'portal password', 'portalpass', 'password', 'pass'],
  access_password: ['access_password', 'access password', 'accesspass', 'admin_password', 'admin password'],
};

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

export function detectDelimiter(content: string): ',' | ';' | '\t' | '|' {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
    '|': (firstLine.match(/\|/g) || []).length,
  };
  let maxDelim = ',' as ',' | ';' | '\t' | '|';
  let maxCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelim = delim as ',' | ';' | '\t' | '|';
    }
  }
  return maxDelim;
}

export function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const delimiter = detectDelimiter(content);
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }
  return { headers, rows };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function buildColumnMapping(headers: string[]): Partial<CsvColumnMapping> {
  const mapping: Partial<CsvColumnMapping> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  const findCol = (aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias);
      if (idx >= 0) return headers[idx];
    }
    return '';
  };

  const mappingPairs: [keyof CsvColumnMapping, string[]][] = [
    ['teamId', HEADER_ALIASES.team_id],
    ['teamName', HEADER_ALIASES.team_name],
    ['domain', HEADER_ALIASES.domain],
    ['paymentUtr', HEADER_ALIASES.payment_utr],
    ['paymentStatus', HEADER_ALIASES.payment_status],
    ['teamStatus', HEADER_ALIASES.team_status],
    ['registrationTimestamp', HEADER_ALIASES.registration_timestamp],
    ['participantName', HEADER_ALIASES.participant_name],
    ['email', HEADER_ALIASES.email],
    ['phone', HEADER_ALIASES.phone],
    ['usn', HEADER_ALIASES.usn],
    ['college', HEADER_ALIASES.college],
    ['state', HEADER_ALIASES.state],
    ['gender', HEADER_ALIASES.gender],
    ['role', HEADER_ALIASES.role],
    ['accommodationRequired', HEADER_ALIASES.accommodation_required],
    ['portalPassword', HEADER_ALIASES.portal_password],
    ['accessPassword', HEADER_ALIASES.access_password],
  ];

  for (const [key, aliases] of mappingPairs) {
    const found = findCol(aliases);
    if (found) mapping[key] = found;
  }

  return mapping;
}

export function validateCsvRow(
  row: string[],
  headers: string[],
  headerIndexMap: Map<string, number>,
  rowIndex: number,
  seenEmails: Set<string>,
  seenUsns: Set<string>,
  seenPhones: Set<string>,
  existingTeamIds: Set<string>,
  existingTeamNames: Set<string>
): CsvRowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Record<string, string> = {};

  let hasParticipantName = false;
  let hasEmail = false;
  let hasUsn = false;
  let hasPhone = false;

  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    const value = row[i] !== undefined ? row[i].trim() : '';
    data[headers[i]] = value;
    data[normalized] = value;

    if (normalized === 'participant_name' || normalized === 'name' || normalized === 'full_name') hasParticipantName = true;
    if (normalized === 'email' || normalized === 'email address') hasEmail = true;
    if (normalized === 'usn' || normalized === 'roll_number') hasUsn = true;
    if (normalized === 'phone' || normalized === 'phone number') hasPhone = true;
  }

  const teamId = data['team_id'] || '';
  const teamName = data['team_name'] || '';

  if (!teamId && !teamName) {
    errors.push('Missing team ID and team name');
  } else {
    if (!teamId) warnings.push('Missing team ID — teams will be assigned auto-generated IDs');
    if (!teamName) errors.push('Missing team name (required)');
  }

  if (hasEmail) {
    const email = data['email'] || '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format: "${email}"`);
    }
    if (email) {
      const lowerEmail = email.toLowerCase();
      if (seenEmails.has(lowerEmail)) {
        errors.push(`Duplicate email: "${email}"`);
      } else if (!email.endsWith('@gmail.com')) {
        warnings.push(`Email is not @gmail.com: "${email}"`);
      }
      seenEmails.add(lowerEmail);
    }
  }

  if (hasUsn) {
    const usn = data['usn'] || '';
    if (usn && seenUsns.has(usn.toUpperCase())) {
      errors.push(`Duplicate USN: "${usn}"`);
    }
    if (usn) seenUsns.add(usn.toUpperCase());
  }

  if (hasPhone) {
    const phone = data['phone'] || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      warnings.push(`Phone number may be invalid: "${phone}"`);
    }
    if (cleanPhone) {
      if (seenPhones.has(cleanPhone)) {
        errors.push(`Duplicate phone number: "${phone}"`);
      }
      seenPhones.add(cleanPhone);
    }
  }

  const status = (data['team_status'] || data['status'] || '').trim();
  if (status && !['Registered', 'Shortlisted', 'Confirmed', 'Checked-In', 'Submitted', 'Waitlist', 'Disqualified', 'PENDING_PAYMENT_AUDIT', 'APPROVED', 'REJECTED'].includes(status)) {
    warnings.push(`Unrecognized team status: "${status}" — defaulting to "Registered"`);
  }

  if (teamId && existingTeamIds.has(teamId)) {
    errors.push(`Duplicate team ID: "${teamId}" (already exists in system)`);
  }
  if (teamName && existingTeamNames.has(teamName.toLowerCase())) {
    errors.push(`Duplicate team name: "${teamName}" (already exists in system)`);
  }

  if (hasParticipantName && !hasEmail && !hasUsn && !hasPhone) {
    errors.push('Participant row has name but no contact info (email, USN, or phone)');
  }

  return {
    rowIndex,
    valid: errors.length === 0,
    errors,
    warnings,
    data,
  };
}

export interface CsvParsedData {
  headers: string[];
  rows: string[][];
}

export function previewCsv(content: string, existingTeams: Array<{ id: string; teamName: string }>): CsvPreviewResult {
  const { headers, rows } = parseCsv(content);
  return previewCsvFromData(headers, rows, existingTeams);
}

export function previewCsvFromData(headers: string[], rows: string[][], existingTeams: Array<{ id: string; teamName: string }>): CsvPreviewResult {
  const validations: CsvRowValidation[] = [];
  const sampleRows: (Record<string, string> | null)[] = [];
  const headerIndexMap = new Map<string, number>();

  if (headers.length === 0) {
    return {
      totalRows: 0,
      headerRow: [],
      validRows: 0,
      invalidRows: 0,
      validations: [],
      sampleRows: [],
      suggestedMappings: null,
    };
  }

  headers.forEach((h, i) => headerIndexMap.set(normalizeHeader(h), i));

  const suggestedMappings = buildColumnMapping(headers);

  const seenEmails = new Set<string>();
  const seenUsns = new Set<string>();
  const seenPhones = new Set<string>();
  const existingTeamIds = new Set(existingTeams.map((t) => t.id));
  const existingTeamNames = new Set(existingTeams.map((t) => t.teamName.toLowerCase()));

  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateCsvRow(
      row, headers, headerIndexMap, i + 1,
      seenEmails, seenUsns, seenPhones, existingTeamIds, existingTeamNames
    );
    validations.push(validation);

    if (validation.valid) {
      validCount++;
    } else {
      invalidCount++;
    }

    if (i < 20) {
      const rowData: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = row[j] !== undefined ? row[j] : '';
      }
      sampleRows.push(validation.valid || validation.errors.length === 0 ? rowData : null);
    }
  }

  return {
    totalRows: rows.length,
    headerRow: headers,
    validRows: validCount,
    invalidRows: invalidCount,
    validations,
    sampleRows,
    suggestedMappings,
  };
}
