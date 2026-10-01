import * as XLSX from 'xlsx';

export interface SubjectExportRow {
  siNo: number;
  admissionNo: string;
  name: string;
  mark: string; // Formatted 2 decimal weighted mark out of 30
}

/**
 * Generates and downloads the Subject Excel export
 * Headers must be EXACTLY:
 * SI. No | Ad.No | Name | Mark
 * Mark is the final weighted mark out of 30!
 */
export function exportSubjectMarksExcel(
  className: string,
  subjectName: string,
  rows: SubjectExportRow[]
) {
  // Exact 4 headers as strictly mandated: SI. No, Ad.No, Name, Mark
  const exportData = rows.map((r) => ({
    'SI. No': r.siNo,
    'Ad.No': r.admissionNo,
    Name: r.name,
    Mark: r.mark,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Auto column widths
  worksheet['!cols'] = [
    { wch: 8 },  // SI. No
    { wch: 14 }, // Ad.No
    { wch: 25 }, // Name
    { wch: 12 }, // Mark
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks');

  // Sanitize filename: Class_8A_English_Marks.xlsx
  const safeClass = className.replace(/[^a-zA-Z0-9]/g, '');
  const safeSubject = subjectName.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `Class_${safeClass}_${safeSubject}_Marks.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads Excel templates for data import
 */
export function downloadExcelTemplate(type: 'students' | 'teachers' | 'classes' | 'subjects') {
  const workbook = XLSX.utils.book_new();
  let sheetData: Record<string, any>[] = [];
  let fileName = '';

  switch (type) {
    case 'students':
      sheetData = [
        {
          'Admission Number': '1007',
          'Full Name': 'David Miller',
          'Class Name': 'Class 8 A',
          'Phone': '9876543210',
          'Email': 'david.m@school.edu',
          'Username': 'david1007',
          'Password': 'student123',
        },
        {
          'Admission Number': '1008',
          'Full Name': 'Emma Watson',
          'Class Name': 'Class 8 A',
          'Phone': '9876543211',
          'Email': 'emma.w@school.edu',
          'Username': 'emma1008',
          'Password': 'student123',
        },
      ];
      fileName = 'Template_Students_Import.xlsx';
      break;

    case 'teachers':
      sheetData = [
        {
          'Full Name': 'Mr. Michael Chang',
          'Phone': '9123456780',
          'Email': 'm.chang@school.edu',
          'Username': 'mchang',
          'Password': 'teacher123',
          'Assigned Classes': 'Class 8 A, Class 10 A',
          'Assigned Subjects': 'Mathematics',
          'Class Teacher Of': '',
        },
      ];
      fileName = 'Template_Teachers_Import.xlsx';
      break;

    case 'classes':
      sheetData = [
        {
          'Class Name': 'Class 9 A',
          'Academic Year': '2025-2026',
          'Class Teacher': 'Mr. Robert Vance',
        },
        {
          'Class Name': 'Class 9 B',
          'Academic Year': '2025-2026',
          'Class Teacher': '',
        },
      ];
      fileName = 'Template_Classes_Import.xlsx';
      break;

    case 'subjects':
      sheetData = [
        {
          'Subject Name': 'Computer Science',
          'Subject Code': 'CS101',
          'Class Name': 'Class 8 A',
          'Assigned Teacher': 'Dr. Albert Stone',
        },
        {
          'Subject Name': 'Physical Education',
          'Subject Code': 'PE101',
          'Class Name': 'Class 8 A',
          'Assigned Teacher': '',
        },
      ];
      fileName = 'Template_Subjects_Import.xlsx';
      break;
  }

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, fileName);
}

export interface ValidationResult<T = any> {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRows: T[];
  invalidRows: { rowNumber: number; reason: string; data: any }[];
}

/**
 * Parses and validates an uploaded Excel or CSV file
 */
export async function parseAndValidateExcel(
  file: File,
  type: 'students' | 'teachers' | 'classes' | 'subjects',
  existingContext: {
    admissionNumbers: Set<string>;
    usernames: Set<string>;
    classNames: Set<string>;
  }
): Promise<ValidationResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; reason: string; data: any }[] = [];
  const seenInBatchAdmissions = new Set<string>();
  const seenInBatchUsernames = new Set<string>();

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row
    const errors: string[] = [];

    if (type === 'students') {
      const admissionNumber = String(row['Admission Number'] || '').trim();
      const fullName = String(row['Full Name'] || '').trim();
      const className = String(row['Class Name'] || '').trim();
      const username = String(row['Username'] || '').trim();

      if (!admissionNumber) errors.push('Admission Number is required');
      if (!fullName) errors.push('Full Name is required');
      if (!className) errors.push('Class Name is required');

      if (admissionNumber) {
        if (existingContext.admissionNumbers.has(admissionNumber)) {
          errors.push(`Admission number "${admissionNumber}" already exists in system`);
        } else if (seenInBatchAdmissions.has(admissionNumber)) {
          errors.push(`Duplicate Admission number "${admissionNumber}" within uploaded file`);
        } else {
          seenInBatchAdmissions.add(admissionNumber);
        }
      }

      if (username) {
        if (existingContext.usernames.has(username)) {
          errors.push(`Username "${username}" already taken`);
        } else if (seenInBatchUsernames.has(username)) {
          errors.push(`Duplicate Username "${username}" within uploaded file`);
        } else {
          seenInBatchUsernames.add(username);
        }
      }

      if (className && !existingContext.classNames.has(className)) {
        errors.push(`Class "${className}" does not exist in the system. Create class first.`);
      }

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: rowNum, reason: errors.join('; '), data: row });
      } else {
        validRows.push({
          admissionNumber,
          name: fullName,
          className,
          phone: String(row['Phone'] || '').trim(),
          email: String(row['Email'] || '').trim(),
          username: username || `std_${admissionNumber}`,
          password: String(row['Password'] || 'student123').trim(),
        });
      }
    } else if (type === 'teachers') {
      const fullName = String(row['Full Name'] || '').trim();
      const email = String(row['Email'] || '').trim();
      const username = String(row['Username'] || '').trim();

      if (!fullName) errors.push('Teacher Name is required');
      if (!username) errors.push('Username is required');

      if (username) {
        if (existingContext.usernames.has(username)) {
          errors.push(`Username "${username}" already exists`);
        } else if (seenInBatchUsernames.has(username)) {
          errors.push(`Duplicate Username "${username}" in file`);
        } else {
          seenInBatchUsernames.add(username);
        }
      }

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: rowNum, reason: errors.join('; '), data: row });
      } else {
        validRows.push({
          name: fullName,
          phone: String(row['Phone'] || '').trim(),
          email,
          username,
          password: String(row['Password'] || 'teacher123').trim(),
          assignedClasses: String(row['Assigned Classes'] || '').split(',').map((s) => s.trim()).filter(Boolean),
          assignedSubjects: String(row['Assigned Subjects'] || '').split(',').map((s) => s.trim()).filter(Boolean),
        });
      }
    } else if (type === 'classes') {
      const className = String(row['Class Name'] || '').trim();
      const academicYear = String(row['Academic Year'] || '').trim();

      if (!className) errors.push('Class Name is required');
      if (!academicYear) errors.push('Academic Year is required');

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: rowNum, reason: errors.join('; '), data: row });
      } else {
        validRows.push({
          name: className,
          academicYear,
          classTeacher: String(row['Class Teacher'] || '').trim(),
        });
      }
    } else if (type === 'subjects') {
      const subjectName = String(row['Subject Name'] || '').trim();
      const subjectCode = String(row['Subject Code'] || '').trim();
      const className = String(row['Class Name'] || '').trim();

      if (!subjectName) errors.push('Subject Name is required');
      if (!subjectCode) errors.push('Subject Code is required');
      if (!className) errors.push('Class Name is required');

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: rowNum, reason: errors.join('; '), data: row });
      } else {
        validRows.push({
          name: subjectName,
          code: subjectCode,
          className,
          assignedTeacher: String(row['Assigned Teacher'] || '').trim(),
        });
      }
    }
  });

  return {
    totalRows: rawRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
  };
}

/**
 * Generic Excel export helper
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string = 'Export.xlsx',
  sheetName: string = 'Data'
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Subject Final Marks Export (SI. No | Ad.No | Name | Mark)
 */
export function exportSubjectFinalMarksExcel(
  rows: any[],
  fileName: string = 'Subject_CCE_Marks.xlsx',
  sheetName: string = 'Subject Marks'
) {
  exportToExcel(rows, fileName, sheetName);
}

/**
 * Subject Full Breakdown Export
 */
export function exportSubjectFullBreakdownExcel(
  rows: any[],
  fileName: string = 'Subject_CCE_Full_Breakdown.xlsx',
  sheetName: string = 'CCE Breakdown'
) {
  exportToExcel(rows, fileName, sheetName);
}

/**
 * Helper to safely extract a value from a row using flexible case-insensitive header aliases
 */
export function extractValue(row: Record<string, any>, possibleKeys: string[]): string {
  if (!row || typeof row !== 'object') return '';

  // 1. Direct key lookup
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }

  // 2. Normalized check (ignoring casing, spaces, underscores, periods, hyphens)
  const normPossible = possibleKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (strVal === '') continue;
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normPossible.includes(normKey)) {
      return strVal;
    }
  }

  return '';
}

/**
 * Check if an imported spreadsheet row is completely blank
 */
export function isRowEmpty(row: Record<string, any>): boolean {
  if (!row || typeof row !== 'object') return true;
  return Object.values(row).every((val) => val === null || val === undefined || String(val).trim() === '');
}

/**
 * Asynchronously parse any Excel file into JSON rows
 */
export async function parseExcelFile(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in the uploaded workbook.');
  }
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Filter out trailing or completely blank rows
  return rawRows.filter((r) => !isRowEmpty(r));
}

export function generateStudentTemplate() {
  downloadExcelTemplate('students');
}

export function generateTeacherTemplate() {
  downloadExcelTemplate('teachers');
}

export function generateClassTemplate() {
  downloadExcelTemplate('classes');
}

export function generateSubjectTemplate() {
  downloadExcelTemplate('subjects');
}

export function validateStudentRows(rows: any[], existingContext: any) {
  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; field: string; reason: string; data: any }[] = [];
  const seenAdmissions = new Set<string>();
  const seenUsernames = new Set<string>();

  // Prepare normalized class lookup
  const classNamesNormalized = new Set<string>();
  if (existingContext?.classNames) {
    existingContext.classNames.forEach((cn: string) => {
      classNamesNormalized.add(cn.trim().toLowerCase());
      classNamesNormalized.add(cn.replace(/\s+/g, '').toLowerCase());
    });
  }

  // Filter out empty rows first
  const nonEmptyRows = rows.filter((r) => !isRowEmpty(r));

  nonEmptyRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const admissionNumber = extractValue(row, [
      'Admission Number',
      'Admission No',
      'Admission No.',
      'Ad.No',
      'Ad No',
      'AdmissionNumber',
      'AdNo',
      'admission_no',
      'Student ID',
      'ID',
      'admission',
    ]);

    const name = extractValue(row, [
      'Full Name',
      'Name',
      'Student Name',
      'StudentName',
      'FullName',
      'student_name',
      'Student',
    ]);

    const className = extractValue(row, [
      'Class Name',
      'Class',
      'ClassName',
      'Grade',
      'Standard',
      'class_name',
      'Section',
    ]);

    const username = extractValue(row, [
      'Username',
      'User Name',
      'Login ID',
      'user_name',
      'User',
    ]);

    const phone = extractValue(row, ['Phone', 'Phone Number', 'Mobile', 'Contact', 'phone_number', 'Cell']);
    const email = extractValue(row, ['Email', 'Email Address', 'Email ID', 'Mail', 'email_address']);
    const password = extractValue(row, ['Password', 'Pass', 'temp_password', 'pwd']);

    if (!admissionNumber) errors.push('Admission Number is required');
    if (!name) errors.push('Student Name is required');
    if (!className) errors.push('Class Name is required');

    if (admissionNumber) {
      const cleanAdm = admissionNumber.toLowerCase();
      if (existingContext?.admissionNumbers?.has(cleanAdm)) {
        errors.push(`Admission number "${admissionNumber}" already exists in system`);
      } else if (seenAdmissions.has(cleanAdm)) {
        errors.push(`Duplicate admission number "${admissionNumber}" in file`);
      } else {
        seenAdmissions.add(cleanAdm);
      }
    }

    if (username) {
      const cleanUser = username.toLowerCase();
      if (existingContext?.usernames?.has(cleanUser)) {
        errors.push(`Username "${username}" already taken`);
      } else if (seenUsernames.has(cleanUser)) {
        errors.push(`Duplicate username "${username}" in file`);
      } else {
        seenUsernames.add(cleanUser);
      }
    }

    // Class existence check (flexible matching)
    if (className && classNamesNormalized.size > 0) {
      const normClass = className.trim().toLowerCase();
      const normNoSpace = className.replace(/\s+/g, '').toLowerCase();
      if (!classNamesNormalized.has(normClass) && !classNamesNormalized.has(normNoSpace)) {
        // If class not in system, note that it will be auto-created upon import
        // or check if we want to treat it as non-blocking
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        field: !admissionNumber ? 'Admission Number' : !name ? 'Name' : 'Class Name',
        reason: errors.join('; '),
        data: row,
      });
    } else {
      validRows.push({
        admissionNumber,
        name,
        className,
        phone,
        email,
        username: username || admissionNumber,
        password: password || `${admissionNumber}${admissionNumber}${admissionNumber}`,
      });
    }
  });

  return {
    totalRows: nonEmptyRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
    errors: invalidRows.map((inv) => ({
      row: inv.rowNumber,
      field: inv.field || 'Student Row',
      message: inv.reason,
    })),
  };
}

export function validateTeacherRows(rows: any[], existingContext: any) {
  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; field: string; reason: string; data: any }[] = [];
  const seenUsernames = new Set<string>();

  const nonEmptyRows = rows.filter((r) => !isRowEmpty(r));

  nonEmptyRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const name = extractValue(row, [
      'Full Name',
      'Name',
      'Teacher Name',
      'TeacherName',
      'Faculty Name',
      'Teacher',
    ]);

    const username = extractValue(row, [
      'Username',
      'User Name',
      'Login ID',
      'user_name',
      'User',
    ]);

    const phone = extractValue(row, ['Phone', 'Phone Number', 'Mobile', 'Contact', 'phone_number']);
    const email = extractValue(row, ['Email', 'Email Address', 'Email ID', 'Mail']);
    const password = extractValue(row, ['Password', 'Pass', 'pwd']);
    const assignedClassesRaw = extractValue(row, ['Assigned Classes', 'Classes', 'Class', 'Assigned Class']);
    const assignedSubjectsRaw = extractValue(row, ['Assigned Subjects', 'Subjects', 'Subject', 'Assigned Subject']);

    if (!name) errors.push('Teacher Name is required');

    // Auto-generate username from email or name if not provided
    const effectiveUsername =
      username ||
      (email ? email.split('@')[0] : name.toLowerCase().replace(/[^a-z0-9]/g, ''));

    if (effectiveUsername) {
      const cleanUser = effectiveUsername.toLowerCase();
      if (existingContext?.usernames?.has(cleanUser)) {
        errors.push(`Username "${effectiveUsername}" already exists`);
      } else if (seenUsernames.has(cleanUser)) {
        errors.push(`Duplicate username "${effectiveUsername}" in file`);
      } else {
        seenUsernames.add(cleanUser);
      }
    } else {
      errors.push('Username is required');
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        field: !name ? 'Teacher Name' : 'Username',
        reason: errors.join('; '),
        data: row,
      });
    } else {
      validRows.push({
        name,
        phone,
        email,
        username: effectiveUsername,
        password: password || 'teacher123',
        assignedClasses: assignedClassesRaw ? assignedClassesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        assignedSubjects: assignedSubjectsRaw ? assignedSubjectsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
    }
  });

  return {
    totalRows: nonEmptyRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
    errors: invalidRows.map((inv) => ({
      row: inv.rowNumber,
      field: inv.field || 'Teacher Row',
      message: inv.reason,
    })),
  };
}

export function validateClassRows(rows: any[], existingContext: any) {
  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; field: string; reason: string; data: any }[] = [];
  const seenClassNames = new Set<string>();

  const nonEmptyRows = rows.filter((r) => !isRowEmpty(r));

  nonEmptyRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const name = extractValue(row, ['Class Name', 'Class', 'Name', 'Grade', 'Standard']);
    const academicYear = extractValue(row, ['Academic Year', 'Year', 'Session', 'AcademicYear']);
    const classTeacher = extractValue(row, ['Class Teacher', 'Teacher', 'Class In Charge', 'Faculty']);

    if (!name) errors.push('Class Name is required');

    if (name) {
      const normName = name.toLowerCase();
      if (seenClassNames.has(normName)) {
        errors.push(`Duplicate class "${name}" in file`);
      } else {
        seenClassNames.add(normName);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        field: !name ? 'Class Name' : 'Academic Year',
        reason: errors.join('; '),
        data: row,
      });
    } else {
      validRows.push({
        name,
        academicYear: academicYear || '2025-2026',
        classTeacher,
      });
    }
  });

  return {
    totalRows: nonEmptyRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
    errors: invalidRows.map((inv) => ({
      row: inv.rowNumber,
      field: inv.field || 'Class Row',
      message: inv.reason,
    })),
  };
}

export function validateSubjectRows(rows: any[], existingContext: any) {
  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; field: string; reason: string; data: any }[] = [];

  const nonEmptyRows = rows.filter((r) => !isRowEmpty(r));

  nonEmptyRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const name = extractValue(row, ['Subject Name', 'Subject', 'Name', 'Course']);
    const code = extractValue(row, ['Subject Code', 'Code', 'SubjectCode', 'Course Code']);
    const className = extractValue(row, ['Class Name', 'Class', 'Grade']);
    const assignedTeacher = extractValue(row, ['Assigned Teacher', 'Teacher', 'Faculty', 'Instructor']);

    if (!name) errors.push('Subject Name is required');
    if (!code) errors.push('Subject Code is required');
    if (!className) errors.push('Class Name is required');

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        field: !name ? 'Subject Name' : !code ? 'Subject Code' : 'Class Name',
        reason: errors.join('; '),
        data: row,
      });
    } else {
      validRows.push({
        name,
        code,
        className,
        assignedTeacher,
      });
    }
  });

  return {
    totalRows: nonEmptyRows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
    errors: invalidRows.map((inv) => ({
      row: inv.rowNumber,
      field: inv.field || 'Subject Row',
      message: inv.reason,
    })),
  };
}
