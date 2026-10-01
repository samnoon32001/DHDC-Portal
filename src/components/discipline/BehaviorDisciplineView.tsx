import React, { useState, useMemo } from 'react';
import {
  BehaviorRecord,
  BehaviorType,
  Student,
  ClassRoom,
} from '../../types';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  ThumbsUp,
  AlertTriangle,
  FileText,
  Plus,
  Search,
  Trash2,
  Lock,
  Calendar,
  X,
  UserCheck,
  Award,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const BehaviorDisciplineView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [behaviorType, setBehaviorType] = useState<BehaviorType>('positive');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [points, setPoints] = useState<number>(0);

  const teacherObj = state.teachers.find((t) => t.id === currentUser?.id);

  // Check if current user is Super Admin or Class Teacher
  const isSuperAdmin = role === 'super_admin';

  const isClassTeacher = (classId?: string) => {
    if (isSuperAdmin) return true;
    if (!classId || !teacherObj) return false;
    return teacherObj.classTeacherOfClassIds?.includes(classId);
  };

  const filteredRecords = useMemo(() => {
    return state.behaviorRecords.filter((rec) => {
      const stu = state.students.find((s) => s.id === rec.studentId);
      if (!stu) return false;

      // Type filter
      if (selectedType !== 'all' && rec.type !== selectedType) {
        return false;
      }

      // Class filter
      if (selectedClassId !== 'all' && stu.classId !== selectedClassId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rec.title.toLowerCase().includes(q);
        const matchStudent = stu.name.toLowerCase().includes(q) || stu.admissionNumber.toLowerCase().includes(q);
        const matchDesc = (rec.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchStudent && !matchDesc) return false;
      }

      return true;
    });
  }, [state.behaviorRecords, state.students, selectedType, selectedClassId, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !title.trim() || !currentUser) return;

    const stu = state.students.find((s) => s.id === targetStudentId);
    if (!isClassTeacher(stu?.classId)) {
      alert('Only the designated Class Teacher or Super Admin may record discipline entries for this student.');
      return;
    }

    dataService.addBehaviorRecord(
      {
        studentId: targetStudentId,
        type: behaviorType,
        title: title.trim(),
        date,
        description: description.trim(),
        actionTaken: actionTaken.trim() || undefined,
        points: Number(points),
        recordedBy: currentUser.id,
        recordedByName: currentUser.name,
        recordedByRole: isSuperAdmin ? 'Super Admin' : 'Class Teacher',
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );

    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setActionTaken('');
    setPoints(0);
    setRerender((v) => v + 1);
  };

  const getTypeBadge = (type: BehaviorType) => {
    switch (type) {
      case 'positive':
        return <Badge variant="success">POSITIVE COMMENDATION</Badge>;
      case 'warning':
        return <Badge variant="warning">OFFICIAL WARNING</Badge>;
      case 'incident':
        return <Badge variant="danger">DISCIPLINARY INCIDENT</Badge>;
      case 'action_taken':
        return <Badge variant="danger">ACTION TAKEN</Badge>;
      case 'observation':
        return <Badge variant="info">OBSERVATION NOTE</Badge>;
      default:
        return <Badge variant="neutral">{String(type).toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Student Behavior & Discipline Registry
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Official records of positive behavior, disciplinary incidents, warnings, and corrective actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isSuperAdmin || (teacherObj?.classTeacherOfClassIds && teacherObj.classTeacherOfClassIds.length > 0)) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          )}
        </div>
      </div>

      {/* RBAC Notice */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>Role-Based Access Control:</strong> Only the assigned <strong>Class Teacher</strong> or <strong>Super Admin</strong> can create, modify, or remove behavior & discipline files for enrolled students.
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'positive', label: 'Positive Commendations' },
            { id: 'warning', label: 'Warnings' },
            { id: 'incident', label: 'Incidents' },
            { id: 'action_taken', label: 'Actions Taken' },
            { id: 'observation', label: 'Observations' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                selectedType === t.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          >
            <option value="all">All Classes</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Record Cards */}
      {filteredRecords.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs">
          No discipline or behavior records found matching the filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => {
            const stu = state.students.find((s) => s.id === rec.studentId);
            const cls = stu ? state.classes.find((c) => c.id === stu.classId) : null;
            const canEditThisRecord = isClassTeacher(stu?.classId);

            return (
              <div
                key={rec.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {getTypeBadge(rec.type)}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {rec.date}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {rec.description}
                    </p>
                  </div>

                  {rec.actionTaken && (
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs">
                      <span className="font-bold text-rose-800 dark:text-rose-300 block">
                        Corrective Action Taken:
                      </span>
                      <span className="text-rose-900 dark:text-rose-200 mt-0.5 block">
                        {rec.actionTaken}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {stu?.name} ({stu?.admissionNumber})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Class: {cls?.name || 'Unassigned'} • Recorded by: {rec.recordedByName} ({rec.recordedByRole})
                    </span>
                  </div>

                  {canEditThisRecord && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove behavior record "${rec.title}"?`)) {
                          dataService.deleteBehaviorRecord(
                            rec.id,
                            currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
                          );
                          setRerender((v) => v + 1);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD RECORD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Record Behavior / Disciplinary Action</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">-- Choose Student --</option>
                  {state.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Record Type *
                  </label>
                  <select
                    value={behaviorType}
                    onChange={(e) => setBehaviorType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="positive">Positive Behavior / Commendation</option>
                    <option value="warning">Official Warning</option>
                    <option value="incident">Disciplinary Incident</option>
                    <option value="action_taken">Action Taken / Suspension / Penalty</option>
                    <option value="observation">Teacher Observation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Record Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outstanding Peer Mentorship or Class Disruption"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Elaborate on the incident or commendable action..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Corrective Action Taken (if applicable)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Parental consultation held / verbal warning issued..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
