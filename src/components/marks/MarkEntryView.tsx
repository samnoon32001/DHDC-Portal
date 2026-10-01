import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { calculateCCETotal } from '../../utils/calculations';
import {
  exportSubjectFinalMarksExcel,
  exportSubjectFullBreakdownExcel,
  exportToExcel,
  parseExcelFile,
} from '../../utils/excel';
import {
  CheckSquare,
  Save,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { EvaluationLevel } from '../../types';

export const MarkEntryView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const state = dataService.getState();

  // Find teacher profile if logged in as teacher
  const teacherProfile = state.teachers.find(
    (t) => t.username === currentUser?.username || t.email === currentUser?.email
  );

  // Available classes: Super Admin sees all; Teacher sees assigned classes
  const availableClasses = useMemo(() => {
    if (role === 'super_admin') return state.classes;
    if (!teacherProfile) return [];

    const teacherSubClassIds = state.subjects
      .filter((s) => s.assignedTeacherId === teacherProfile.id || teacherProfile.assignedSubjectIds?.includes(s.id))
      .map((s) => s.classId);

    const allIds = Array.from(
      new Set([...(teacherProfile.assignedClassIds || []), ...teacherSubClassIds])
    );
    return state.classes.filter((c) => allIds.includes(c.id));
  }, [role, teacherProfile, state.classes, state.subjects, refreshCounter]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return availableClasses[0]?.id || state.classes[0]?.id || '';
  });

  // Available subjects for the selected class
  const availableSubjects = useMemo(() => {
    return state.subjects.filter((s) => s.classId === selectedClassId);
  }, [state.subjects, selectedClassId, refreshCounter]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  useEffect(() => {
    if (availableSubjects.length > 0) {
      // If previous subject belongs to this class, keep it; else select first
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  const selectedSubject = state.subjects.find((s) => s.id === selectedSubjectId);
  const selectedClass = state.classes.find((c) => c.id === selectedClassId);

  // Check RBAC permission for editing marks:
  // Super Admin: ALWAYS allowed
  // Teacher: ONLY allowed if assigned to this subject
  const canEditMarks = useMemo(() => {
    if (role === 'super_admin') return true;
    if (!selectedSubject || !teacherProfile) return false;
    return (
      selectedSubject.assignedTeacherId === teacherProfile.id ||
      teacherProfile.assignedSubjectIds?.includes(selectedSubject.id)
    );
  }, [role, selectedSubject, teacherProfile]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return state.students.filter((s) => s.classId === selectedClassId && s.status === 'active');
  }, [state.students, selectedClassId, refreshCounter]);

  // Evaluation levels for selected subject
  const evaluationLevels = useMemo(() => {
    if (!selectedSubjectId) return [];
    return state.evaluationLevels
      .filter((l) => l.subjectId === selectedSubjectId && l.status === 'active')
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [state.evaluationLevels, selectedSubjectId, refreshCounter]);

  // Inline Level Modal States
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<EvaluationLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<EvaluationLevel | null>(null);
  const [levelFormName, setLevelFormName] = useState('');
  const [levelFormMaxMark, setLevelFormMaxMark] = useState(25);
  const [levelFormOrder, setLevelFormOrder] = useState(1);
  const [levelFormStatus, setLevelFormStatus] = useState<'active' | 'inactive'>('active');
  const [levelFormError, setLevelFormError] = useState<string | null>(null);

  const openAddLevelModal = () => {
    setEditingLevel(null);
    setLevelFormName('');
    setLevelFormMaxMark(25);
    setLevelFormOrder(evaluationLevels.length + 1);
    setLevelFormStatus('active');
    setLevelFormError(null);
    setIsLevelModalOpen(true);
  };

  const openEditLevelModal = (lvl: EvaluationLevel) => {
    setEditingLevel(lvl);
    setLevelFormName(lvl.name);
    setLevelFormMaxMark(lvl.maxMark || lvl.maximumMark || 25);
    setLevelFormOrder(lvl.displayOrder);
    setLevelFormStatus(lvl.status);
    setLevelFormError(null);
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = (e: React.FormEvent) => {
    e.preventDefault();
    setLevelFormError(null);

    const cleanName = levelFormName.trim();
    if (!cleanName) {
      setLevelFormError('Evaluation level name is required.');
      return;
    }
    if (levelFormMaxMark <= 0) {
      setLevelFormError('Maximum mark must be greater than 0.');
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    if (editingLevel) {
      // Validate that no existing student marks exceed the new max mark
      const existingMarks = state.marks.filter((m) => m.evaluationLevelId === editingLevel.id);
      const invalidMarks = existingMarks.filter((m) => m.obtainedMark !== null && m.obtainedMark > levelFormMaxMark);
      if (invalidMarks.length > 0) {
        setLevelFormError(
          `Cannot reduce maximum mark to ${levelFormMaxMark}: ${invalidMarks.length} recorded student mark(s) already exceed this limit (highest is ${Math.max(
            ...invalidMarks.map((m) => m.obtainedMark || 0)
          )}). Adjust those student marks first.`
        );
        return;
      }

      dataService.updateEvaluationLevel(
        editingLevel.id,
        {
          name: cleanName,
          maximumMark: Number(levelFormMaxMark),
          maxMark: Number(levelFormMaxMark),
          displayOrder: Number(levelFormOrder),
          status: levelFormStatus,
        },
        actor
      );

      setStatusMessage({
        type: 'success',
        text: `Evaluation level "${cleanName}" (Max: ${levelFormMaxMark}) updated successfully.`,
      });
    } else {
      dataService.addEvaluationLevel(
        {
          subjectId: selectedSubjectId,
          name: cleanName,
          maximumMark: Number(levelFormMaxMark),
          maxMark: Number(levelFormMaxMark),
          displayOrder: Number(levelFormOrder),
          status: levelFormStatus,
        },
        actor
      );

      setStatusMessage({
        type: 'success',
        text: `Evaluation level "${cleanName}" (Max: ${levelFormMaxMark}) created successfully.`,
      });
    }

    setIsLevelModalOpen(false);
    setRefreshCounter((v) => v + 1);
  };

  const handleDeleteLevelConfirm = () => {
    if (!deletingLevel) return;
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    const levelName = deletingLevel.name;
    dataService.deleteEvaluationLevel(deletingLevel.id, actor);
    setDeletingLevel(null);
    setStatusMessage({
      type: 'success',
      text: `Evaluation level "${levelName}" has been deleted.`,
    });
    setRefreshCounter((v) => v + 1);
  };

  const marksForDeletingLevel = deletingLevel
    ? state.marks.filter((m) => m.evaluationLevelId === deletingLevel.id).length
    : 0;

  // Local state for editing marks matrix: studentId -> evaluationLevelId -> raw input string
  const [marksMatrix, setMarksMatrix] = useState<Record<string, Record<string, string>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing marks into local marksMatrix when subject or class changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setMarksMatrix({});
      setHasUnsavedChanges(false);
      return;
    }

    const existingMarks = state.marks.filter((m) => m.subjectId === selectedSubjectId);
    const matrix: Record<string, Record<string, string>> = {};

    classStudents.forEach((std) => {
      matrix[std.id] = {};
      evaluationLevels.forEach((lvl) => {
        const found = existingMarks.find(
          (m) => m.studentId === std.id && m.evaluationLevelId === lvl.id
        );
        matrix[std.id][lvl.id] = found !== undefined ? String(found.obtainedMark) : '';
      });
    });

    setMarksMatrix(matrix);
    setHasUnsavedChanges(false);
    setStatusMessage(null);
  }, [selectedSubjectId, selectedClassId, state.marks, classStudents, evaluationLevels]);

  // Cell change handler
  const handleMarkChange = (studentId: string, levelId: string, value: string) => {
    if (!canEditMarks) return;

    setMarksMatrix((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [levelId]: value,
      },
    }));
    setHasUnsavedChanges(true);
    setStatusMessage(null);
  };

  // Validate a specific mark cell
  const getCellValidation = (level: any, rawValue: string): { isValid: boolean; error?: string } => {
    if (rawValue === '' || rawValue === undefined) {
      return { isValid: true };
    }
    const num = Number(rawValue);
    if (isNaN(num)) {
      return { isValid: false, error: 'Must be a valid number' };
    }
    if (num < 0) {
      return { isValid: false, error: 'Mark cannot be negative' };
    }
    if (num > level.maxMark) {
      return { isValid: false, error: `Exceeds max mark (${level.maxMark})` };
    }
    return { isValid: true };
  };

  // Check if any cell in matrix has validation errors
  const hasValidationErrors = useMemo(() => {
    for (const std of classStudents) {
      for (const lvl of evaluationLevels) {
        const val = marksMatrix[std.id]?.[lvl.id] || '';
        const check = getCellValidation(lvl, val);
        if (!check.isValid) return true;
      }
    }
    return false;
  }, [marksMatrix, classStudents, evaluationLevels]);

  // Save marks to database
  const handleSaveMarks = () => {
    if (!canEditMarks) return;
    if (hasValidationErrors) {
      setStatusMessage({
        type: 'error',
        text: 'Please fix the highlighted invalid marks (values exceeding max mark or negative) before saving.',
      });
      return;
    }

    const marksToSave: {
      studentId: string;
      subjectId: string;
      evaluationLevelId: string;
      obtainedMark: number;
    }[] = [];

    classStudents.forEach((std) => {
      evaluationLevels.forEach((lvl) => {
        const val = marksMatrix[std.id]?.[lvl.id];
        if (val !== '' && val !== undefined) {
          marksToSave.push({
            studentId: std.id,
            subjectId: selectedSubjectId,
            evaluationLevelId: lvl.id,
            obtainedMark: Number(val),
          });
        }
      });
    });

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : undefined;

    const savedCount = dataService.saveMarksBatch(selectedSubjectId, marksToSave, actor);

    setHasUnsavedChanges(false);
    setStatusMessage({
      type: 'success',
      text: `Successfully saved marks for ${classStudents.length} students (${savedCount} evaluation entries).`,
    });

    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Batch Fill Helpers
  const handleFillUnenteredZeros = () => {
    if (!canEditMarks) return;
    setMarksMatrix((prev) => {
      const updated = { ...prev };
      classStudents.forEach((std) => {
        if (!updated[std.id]) updated[std.id] = {};
        evaluationLevels.forEach((lvl) => {
          if (!updated[std.id][lvl.id] || updated[std.id][lvl.id] === '') {
            updated[std.id][lvl.id] = '0';
          }
        });
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Export Subject Excel strictly matching Section 13:
  // "Subject Excel export must contain exactly: SI. No | Ad.No | Name | Mark"
  const handleExportStandardSubjectExcel = () => {
    if (!selectedSubject || !selectedClass) return;

    const rows = classStudents.map((std, idx) => {
      const levelResults = evaluationLevels.map((lvl) => {
        const val = marksMatrix[std.id]?.[lvl.id];
        return {
          levelId: lvl.id,
          maxMark: lvl.maxMark,
          obtainedMark: val !== '' && val !== undefined ? Number(val) : 0,
        };
      });

      const calc = calculateCCETotal(levelResults);

      return {
        'SI. No': idx + 1,
        'Ad.No': std.admissionNumber,
        Name: std.name,
        Mark: calc.finalMarkOutOf30,
      };
    });

    exportSubjectFinalMarksExcel(
      rows,
      `${selectedSubject.name}_${selectedClass.name}_CCE_Final_Marks.xlsx`,
      `${selectedSubject.code} Marks`
    );

    dataService.addAuditLog({
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'User',
      role: role || 'teacher',
      action: 'Excel Exported',
      entity: 'Subject Marks',
      entityId: selectedSubject.id,
      details: `Exported standard mark sheet for ${selectedSubject.name} (${selectedClass.name})`,
    });
  };

  // Full breakdown export
  const handleExportFullBreakdownExcel = () => {
    if (!selectedSubject || !selectedClass) return;

    const rows = classStudents.map((std, idx) => {
      const row: any = {
        'SI. No': idx + 1,
        'Admission No': std.admissionNumber,
        'Student Name': std.name,
      };

      const levelResults = evaluationLevels.map((lvl) => {
        const val = marksMatrix[std.id]?.[lvl.id];
        const num = val !== '' && val !== undefined ? Number(val) : 0;
        row[`${lvl.name} (Max: ${lvl.maxMark})`] = val !== '' && val !== undefined ? num : '—';
        return {
          levelId: lvl.id,
          maxMark: lvl.maxMark,
          obtainedMark: num,
        };
      });

      const calc = calculateCCETotal(levelResults);
      row['Total Obtained'] = calc.totalObtained;
      row['Total Maximum'] = calc.totalMaximum;
      row['Percentage (%)'] = calc.percentage;
      row['Final Mark (Out of 30)'] = calc.finalMarkOutOf30;

      return row;
    });

    exportSubjectFullBreakdownExcel(
      rows,
      `${selectedSubject.name}_${selectedClass.name}_Full_CCE_Breakdown.xlsx`,
      'CCE Evaluation Breakdown'
    );
  };

  // Import Subject Mark Sheet
  const handleImportSubjectMarks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubject) return;

    try {
      const parsedData = await parseExcelFile(file);
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        alert('Spreadsheet is empty or invalid.');
        return;
      }

      let updatedCount = 0;
      setMarksMatrix((prev) => {
        const next = { ...prev };

        parsedData.forEach((row: any) => {
          // Find admission no column
          const admissionNo =
            row['Ad.No'] || row['Admission No'] || row['Admission Number'] || row['ad_no'];
          if (!admissionNo) return;

          const student = classStudents.find(
            (s) => String(s.admissionNumber).trim() === String(admissionNo).trim()
          );
          if (!student) return;

          if (!next[student.id]) next[student.id] = {};

          // Look for matching level names or columns
          evaluationLevels.forEach((lvl) => {
            const possibleKeys = [
              lvl.name,
              `${lvl.name} (Max: ${lvl.maxMark})`,
              lvl.id,
              'Mark',
            ];
            for (const k of possibleKeys) {
              if (row[k] !== undefined) {
                next[student.id][lvl.id] = String(row[k]);
                updatedCount++;
                break;
              }
            }
          });
        });

        return next;
      });

      setHasUnsavedChanges(true);
      alert(`Imported marks data from Excel. Review the table and click "Save Marks" to persist.`);
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
    }
  };

  // Calculate Pending Marks count
  const pendingMarksCount = useMemo(() => {
    let pending = 0;
    classStudents.forEach((std) => {
      const studentMarks = marksMatrix[std.id] || {};
      const hasEmpty = evaluationLevels.some((lvl) => {
        const v = studentMarks[lvl.id];
        return v === undefined || v === '';
      });
      if (hasEmpty) pending++;
    });
    return pending;
  }, [classStudents, evaluationLevels, marksMatrix]);

  // Calculate Class-wide Summary Statistics
  const classSummaryStats = useMemo(() => {
    if (classStudents.length === 0 || evaluationLevels.length === 0) {
      return { avgObtained: 0, totalMax: 0, avgPercentage: 0, avgWeightedOutOf30: 0 };
    }

    let totalObtainedSum = 0;
    let totalWeightedSum = 0;
    let totalMaxForStudent = evaluationLevels.reduce((acc, lvl) => acc + lvl.maxMark, 0);

    classStudents.forEach((std) => {
      const levelResults = evaluationLevels.map((lvl) => {
        const val = marksMatrix[std.id]?.[lvl.id];
        const num = val !== '' && val !== undefined ? Number(val) : 0;
        return {
          levelId: lvl.id,
          maxMark: lvl.maxMark,
          obtainedMark: isNaN(num) ? 0 : num,
        };
      });
      const res = calculateCCETotal(levelResults);
      totalObtainedSum += res.totalObtained;
      totalWeightedSum += res.finalMarkOutOf30;
    });

    const avgObtained = Number((totalObtainedSum / classStudents.length).toFixed(1));
    const avgPercentage = totalMaxForStudent > 0 ? Number(((avgObtained / totalMaxForStudent) * 100).toFixed(1)) : 0;
    const avgWeightedOutOf30 = Number((totalWeightedSum / classStudents.length).toFixed(2));

    return {
      avgObtained,
      totalMax: totalMaxForStudent,
      avgPercentage,
      avgWeightedOutOf30,
    };
  }, [classStudents, evaluationLevels, marksMatrix]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title & Class/Subject Selection Header matching Professional Polish */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            CCE Mark Entry & Assessment Matrix
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record evaluations across dynamic syllabus levels with real-time 30-mark CCE factor calculation
          </p>
        </div>

        {/* Action Controls matching Professional Polish buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportStandardSubjectExcel}
            disabled={!selectedSubject || classStudents.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Export standard format: SI. No | Ad.No | Name | Mark"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export 30-Mark Sheet
          </button>

          <button
            onClick={handleExportFullBreakdownExcel}
            disabled={!selectedSubject || classStudents.length === 0}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Export full CCE breakdown across all evaluation levels"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Full Breakdown
          </button>

          {canEditMarks && (
            <label className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Import Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportSubjectMarks}
                className="hidden"
              />
            </label>
          )}

          {canEditMarks && (
            <button
              onClick={handleSaveMarks}
              disabled={!hasUnsavedChanges || hasValidationErrors}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer ${
                hasUnsavedChanges && !hasValidationErrors
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Save Marks
            </button>
          )}
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Class Select */}
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Class:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 font-semibold text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Subject:
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 font-semibold text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Permission & Status Indicators */}
        <div className="flex items-center gap-3">
          {canEditMarks ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Edit Access Granted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Lock className="w-3.5 h-3.5" />
              Read-Only Mode
            </span>
          )}

          {canEditMarks && (
            <button
              onClick={handleFillUnenteredZeros}
              className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
              title="Fill remaining empty cells with 0"
            >
              Fill Empty with 0
            </button>
          )}
        </div>
      </div>

      {/* 4 Stat Cards matching Professional Polish Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Students
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {classStudents.length < 10 ? `0${classStudents.length}` : classStudents.length}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">Enrolled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Subject Code
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {selectedSubject?.code || '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-amber-500">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Pending Marks
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {pendingMarksCount < 10 ? `0${pendingMarksCount}` : pendingMarksCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-indigo-500">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Weightage Factor
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            30.00
          </div>
        </div>
      </div>

      {/* Alert / Notification banners */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {hasUnsavedChanges && !statusMessage && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            You have unsaved changes in the marks matrix. Click "Save Marks" to persist your edits.
          </span>
          <button
            onClick={handleSaveMarks}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold transition shadow-xs cursor-pointer"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Main Mark Entry Table Container matching Professional Polish */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        {/* Component Header / Tabs */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Evaluation Structure:
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {evaluationLevels.length} Components Configured
            </span>
            {canEditMarks && (
              <button
                onClick={openAddLevelModal}
                className="flex items-center gap-1 ml-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-md transition cursor-pointer"
                title="Add new evaluation level component"
              >
                <Plus className="w-3.5 h-3.5" /> Add Level
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            {evaluationLevels.map((lvl) => (
              <div
                key={lvl.id}
                className="group flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap shadow-xs"
              >
                <span>{lvl.name}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                  Max: {lvl.maxMark || lvl.maximumMark}
                </span>
                {canEditMarks && (
                  <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1">
                    <button
                      onClick={() => openEditLevelModal(lvl)}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition cursor-pointer"
                      title={`Edit ${lvl.name}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeletingLevel(lvl)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                      title={`Delete ${lvl.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {evaluationLevels.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              No Evaluation Levels Configured for this Subject
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
              Create your evaluation components (e.g. Unit Test 1, Mid Term Exam, Seminar, Project) to start entering student marks.
            </p>
            {canEditMarks && (
              <button
                onClick={openAddLevelModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Evaluation Level
              </button>
            )}
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            No students enrolled in {selectedClass?.name || 'this class'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">SI. No</th>
                  <th className="py-3.5 px-4 w-24">Ad.No</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Student Name</th>

                  {/* Dynamic Evaluation Level Columns with inline edit/delete */}
                  {evaluationLevels.map((lvl) => (
                    <th
                      key={lvl.id}
                      className="group/col py-3.5 px-3 text-center min-w-[110px] bg-slate-100/50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-800 relative"
                    >
                      <div className="flex items-center justify-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        <span className="truncate">{lvl.name}</span>
                        {canEditMarks && (
                          <div className="flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditLevelModal(lvl)}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                              title={`Edit ${lvl.name}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeletingLevel(lvl)}
                              className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                              title={`Delete ${lvl.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                        Max: {lvl.maxMark || lvl.maximumMark}
                      </div>
                    </th>
                  ))}

                  {/* Calculated summary columns */}
                  <th className="py-3.5 px-3 text-center min-w-[90px] border-l border-slate-200 dark:border-slate-800">
                    Total Obt.
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[80px]">
                    Total Max
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[80px]">
                    Percentage
                  </th>
                  <th className="py-3.5 px-4 text-center min-w-[130px] bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold border-l border-indigo-100 dark:border-indigo-900/50">
                    Final Mark (30)
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {classStudents.map((std, idx) => {
                  const levelCalculations = evaluationLevels.map((lvl) => {
                    const rawVal = marksMatrix[std.id]?.[lvl.id];
                    const num = rawVal !== '' && rawVal !== undefined ? Number(rawVal) : 0;
                    return {
                      levelId: lvl.id,
                      maxMark: lvl.maxMark,
                      obtainedMark: isNaN(num) ? 0 : num,
                    };
                  });

                  const cceResult = calculateCCETotal(levelCalculations);

                  return (
                    <tr
                      key={std.id}
                      className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* SI. No */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Admission No */}
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {std.admissionNumber}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {std.name}
                      </td>

                      {/* Dynamic Evaluation Level Cells */}
                      {evaluationLevels.map((lvl) => {
                        const rawVal = marksMatrix[std.id]?.[lvl.id] ?? '';
                        const validation = getCellValidation(lvl, rawVal);

                        return (
                          <td
                            key={lvl.id}
                            className="py-2 px-2 text-center border-l border-slate-100 dark:border-slate-800"
                          >
                            <div className="relative flex justify-center">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={lvl.maxMark}
                                disabled={!canEditMarks}
                                value={rawVal}
                                onChange={(e) =>
                                  handleMarkChange(std.id, lvl.id, e.target.value)
                                }
                                placeholder="—"
                                className={`w-20 text-center font-mono text-xs font-semibold py-1.5 px-2 rounded-md border transition ${
                                  !validation.isValid
                                    ? 'border-rose-500 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 dark:ring-rose-800'
                                    : rawVal !== ''
                                    ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                                } focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed`}
                                title={
                                  validation.error ||
                                  `Allowed: 0 to ${lvl.maxMark}`
                                }
                              />
                            </div>
                            {!validation.isValid && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                                {validation.error}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Calculated Total Obtained */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                        {cceResult.totalObtained}
                      </td>

                      {/* Calculated Total Maximum */}
                      <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {cceResult.totalMaximum}
                      </td>

                      {/* Calculated Percentage */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`font-semibold ${
                            cceResult.percentage >= 75
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : cceResult.percentage >= 40
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {cceResult.percentage}%
                        </span>
                      </td>

                      {/* Final Subject Mark (out of 30) */}
                      <td className="py-3 px-4 text-center border-l border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/20">
                        <div className="inline-flex items-center gap-1 font-mono font-extrabold text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                          {cceResult.finalMarkOutOf30}
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-normal">
                            / 30
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Summary Banner matching Professional Polish Design */}
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-xl mt-auto">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Class Avg Total
              </div>
              <div className="text-xl font-mono font-bold">
                {classSummaryStats.avgObtained} <span className="text-slate-400 text-xs font-normal">/ {classSummaryStats.totalMax}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Class Percentage
              </div>
              <div className="text-xl font-mono font-bold text-indigo-400">
                {classSummaryStats.avgPercentage}%
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                CCE Weightage Formula
              </div>
              <div className="text-xs font-mono text-slate-300 font-medium">
                (Obt. / Max) × 30.00
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">
                Avg Final Mark
              </div>
              <div className="text-3xl font-bold font-mono text-white">
                {classSummaryStats.avgWeightedOutOf30}{' '}
                <span className="text-lg font-medium text-slate-400">/ 30.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Evaluation Level Modal */}
      <Modal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModalOpen(false)}
        title={editingLevel ? `Edit Level: ${editingLevel.name}` : `Add Evaluation Level (${selectedSubject?.name || 'Subject'})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveLevel} className="space-y-4">
          {levelFormError && (
            <div className="p-3 rounded-md text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {levelFormError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Evaluation Level Name *
            </label>
            <input
              type="text"
              required
              value={levelFormName}
              onChange={(e) => setLevelFormName(e.target.value)}
              placeholder="e.g. Unit Test 1, Mid Term Exam, Project Work, Seminar"
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Maximum Mark *
              </label>
              <input
                type="number"
                required
                min={1}
                max={1000}
                value={levelFormMaxMark}
                onChange={(e) => setLevelFormMaxMark(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">e.g. 20, 25, 50, 100</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Display Order *
              </label>
              <input
                type="number"
                required
                min={1}
                value={levelFormOrder}
                onChange={(e) => setLevelFormOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={levelFormStatus}
              onChange={(e) => setLevelFormStatus(e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsLevelModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition cursor-pointer"
            >
              {editingLevel ? 'Save Changes' : 'Create Level'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      {deletingLevel && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingLevel(null)}
          onConfirm={handleDeleteLevelConfirm}
          title={`Delete Level: ${deletingLevel.name}`}
          message={
            marksForDeletingLevel > 0
              ? `WARNING: ${marksForDeletingLevel} student mark entries currently exist for "${deletingLevel.name}".\n\nDeleting this evaluation level will remove these recorded marks and dynamically recalculate student final 30-mark totals. Are you sure?`
              : `Are you sure you want to remove the evaluation level "${deletingLevel.name}"?`
          }
          confirmText="Yes, Delete Level"
          isDestructive={true}
        />
      )}
    </div>
  );
};
