import React, { useState, useRef } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  generateStudentTemplate,
  generateTeacherTemplate,
  generateClassTemplate,
  generateSubjectTemplate,
  parseExcelFile,
  validateStudentRows,
  validateTeacherRows,
  validateClassRows,
  validateSubjectRows,
} from '../../utils/excel';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Badge } from '../common/Badge';

type ImportType = 'students' | 'teachers' | 'classes' | 'subjects';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationState {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRows: any[];
  invalidRows: { rowNumber: number; field?: string; reason: string; data: any }[];
  errors: ValidationError[];
}

export const ExcelImportView: React.FC = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<ImportType>('students');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationState | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Step 2: Download Template
  const handleDownloadTemplate = () => {
    try {
      if (importType === 'students') {
        generateStudentTemplate();
      } else if (importType === 'teachers') {
        generateTeacherTemplate();
      } else if (importType === 'classes') {
        generateClassTemplate();
      } else if (importType === 'subjects') {
        generateSubjectTemplate();
      }
    } catch (err: any) {
      console.error('Download template error:', err);
      alert(`Could not download template: ${err?.message || 'Unknown error'}`);
    }
  };

  // Step 3: Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setImportSuccessMsg(null);
    setValidationResult(null);

    try {
      const rawData = await parseExcelFile(file);

      if (!Array.isArray(rawData) || rawData.length === 0) {
        alert('The uploaded spreadsheet contains no data rows. Please ensure your file has valid rows and headers.');
        setIsProcessing(false);
        return;
      }

      setParsedRows(rawData);

      // Fetch state context for validation
      const state = dataService.getState();
      const existingContext = {
        admissionNumbers: new Set(state.students.map((s) => String(s.admissionNumber).trim().toLowerCase())),
        usernames: new Set(state.users.map((u) => String(u.username).trim().toLowerCase())),
        classNames: new Set(state.classes.map((c) => String(c.name).trim().toLowerCase())),
        classes: state.classes,
      };

      let res: any;
      if (importType === 'students') {
        res = validateStudentRows(rawData, existingContext);
      } else if (importType === 'teachers') {
        res = validateTeacherRows(rawData, existingContext);
      } else if (importType === 'classes') {
        res = validateClassRows(rawData, existingContext);
      } else {
        res = validateSubjectRows(rawData, existingContext);
      }

      // Format validation object to guarantee all expected properties exist
      const formattedResult: ValidationState = {
        totalRows: res.totalRows ?? rawData.length,
        validCount: res.validCount ?? (res.validRows?.length || 0),
        invalidCount: res.invalidCount ?? (res.invalidRows?.length || res.errors?.length || 0),
        validRows: res.validRows || [],
        invalidRows: res.invalidRows || [],
        errors: res.errors || (res.invalidRows || []).map((inv: any) => ({
          row: inv.rowNumber || 1,
          field: inv.field || 'Row',
          message: inv.reason || inv.message || 'Validation issue',
        })),
      };

      setValidationResult(formattedResult);
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Error reading file: ${err?.message || 'Invalid or unreadable Excel file'}`);
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 6: Confirm Import
  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.validRows || validationResult.validRows.length === 0) {
      alert('No valid records found to import.');
      return;
    }

    setIsImporting(true);

    try {
      const actor = currentUser
        ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        : { id: 'admin', name: 'Administrator', role: 'super_admin' };

      let count = 0;
      if (importType === 'students') {
        count = dataService.importStudents(validationResult.validRows, actor);
      } else if (importType === 'teachers') {
        count = dataService.importTeachers(validationResult.validRows, actor);
      } else if (importType === 'classes') {
        count = dataService.importClasses(validationResult.validRows, actor);
      } else if (importType === 'subjects') {
        count = dataService.importSubjects(validationResult.validRows, actor);
      }

      setImportSuccessMsg(
        `Successfully imported ${count} ${importType} records into the system! All records have been persisted to database and local cache.`
      );
      setParsedRows([]);
      setValidationResult(null);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Import confirmation error:', err);
      alert(`Import failed: ${err?.message || 'An unexpected error occurred during database commit.'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetWizard = () => {
    setFileName(null);
    setParsedRows([]);
    setValidationResult(null);
    setImportSuccessMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalErrors = validationResult?.errors?.length ?? 0;
  const validRowsCount = validationResult?.validRows?.length ?? 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          Bulk Excel Import Wizard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Step-by-step import pipeline for Students, Teachers, Classes, and Subjects with pre-flight schema validation
        </p>
      </div>

      {importSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-sm shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{importSuccessMsg}</span>
          </div>
          <button
            onClick={resetWizard}
            className="text-xs bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-3 py-1.5 rounded-lg font-medium transition"
          >
            Import More Records
          </button>
        </div>
      )}

      {/* Wizard Steps Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration & Upload */}
        <div className="space-y-5">
          {/* Step 1: Select Import Type */}
          <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Select Entity Type
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'students', label: 'Students' },
                  { id: 'teachers', label: 'Teachers' },
                  { id: 'classes', label: 'Classes' },
                  { id: 'subjects', label: 'Subjects' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setImportType(item.id);
                    resetWizard();
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                    importType === item.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Download Template */}
          <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Download Standard Template
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Get an Excel spreadsheet with pre-formatted headers and sample records for {importType}.
            </p>

            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              Download {importType.toUpperCase()} Template (.xlsx)
            </button>
          </div>

          {/* Step 3: Upload Excel */}
          <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Upload Populated Excel File
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Supports .xlsx and .xls formats with automatic header detection and casing tolerance.
            </p>

            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition">
              {isProcessing ? (
                <div className="flex flex-col items-center py-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Parsing and validating spreadsheet...
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {fileName ? fileName : 'Click to select or drop Excel file'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">.xlsx or .xls file</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Validation & Preview (Steps 4, 5, 6) */}
        <div className="lg:col-span-2 space-y-5">
          {validationResult ? (
            <div className="space-y-5">
              {/* Step 5: Validation Summary Cards */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                      4 & 5
                    </span>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Validation Summary & Health Check
                    </h2>
                  </div>
                  <Badge variant={totalErrors === 0 ? 'success' : 'warning'}>
                    {totalErrors === 0
                      ? '100% Ready to Import'
                      : `${totalErrors} Issues Detected`}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Rows</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {parsedRows.length}
                    </span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                      Valid Rows
                    </span>
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {validRowsCount}
                    </span>
                  </div>
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-800">
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-medium">
                      Invalid Rows
                    </span>
                    <span className="text-xl font-bold text-rose-700 dark:text-rose-300">
                      {totalErrors}
                    </span>
                  </div>
                </div>

                {/* Detailed Error Descriptions with exact Row Numbers */}
                {totalErrors > 0 && (
                  <div className="mt-4 p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Row Validation Errors (These rows will be skipped):
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs text-rose-700 dark:text-rose-400">
                      {(validationResult.errors || []).map((err, i) => (
                        <div key={i} className="flex items-start gap-2 font-mono bg-rose-100/50 dark:bg-rose-900/30 p-1.5 rounded-md">
                          <span className="font-bold shrink-0 text-rose-900 dark:text-rose-200">Row {err.row}:</span>
                          <span>
                            [{err.field}] {err.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 6: Confirm Import Button */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={resetWizard}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={validRowsCount === 0 || isImporting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing into Database...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm & Import {validRowsCount} Valid Records
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 4: Preview Valid Rows Table */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Valid Records Preview ({validRowsCount})
                  </h3>
                  <span className="text-[11px] text-slate-400">Previewing first 10 rows</span>
                </div>

                <div className="overflow-x-auto">
                  {validRowsCount > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          {validationResult.validRows[0] &&
                            Object.keys(validationResult.validRows[0]).map((k) => (
                              <th key={k} className="py-2.5 px-4 font-semibold">
                                {k}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {validationResult.validRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            {Object.entries(row).map(([k, val]: any, vi) => (
                              <td key={vi} className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                                {k.toLowerCase().includes('password')
                                  ? '••••••••'
                                  : Array.isArray(val)
                                  ? val.join(', ')
                                  : String(val ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No valid rows to preview. Please fix the validation errors shown above and re-upload.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State Waiting for file */
            <div className="h-full min-h-[300px] bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Awaiting Spreadsheet File
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Download the template from Step 2, populate it with your institution's records, and upload it in Step 3 to review automated validation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

