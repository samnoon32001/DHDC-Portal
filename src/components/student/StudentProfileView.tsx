import React, { useState } from 'react';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  School,
  Calendar,
  ShieldCheck,
  Mail,
  Phone,
  Hash,
  Award,
  Heart,
  Clock,
  Printer,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  X,
  Check,
  FileText,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const StudentProfileView: React.FC = () => {
  const { currentUser } = useAuth();
  const state = dataService.getState();
  const [activeTab, setActiveTab] = useState<'overview' | 'guardian' | 'achievements' | 'attendance' | 'notes'>('overview');
  
  // Printing options state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printOption, setPrintOption] = useState<'full_dossier' | 'biodata_slip' | 'attendance_slip'>('full_dossier');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeTeacherNotes, setIncludeTeacherNotes] = useState<boolean>(true);
  const [includeAchievements, setIncludeAchievements] = useState<boolean>(true);

  const student = state.students.find(
    (s) =>
      s.username === currentUser?.username ||
      s.admissionNumber === currentUser?.admissionNumber ||
      s.id === currentUser?.id ||
      `user-${s.id}` === currentUser?.id
  );

  const studentClass = student ? state.classes.find((c) => c.id === student.classId) : null;
  const classTeacher = studentClass
    ? state.teachers.find((t) => t.id === studentClass.classTeacherId)
    : null;

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        No student profile linked with this login credential.
      </div>
    );
  }

  // Related collections
  const achievements = (state.achievements || []).filter((a) => a.studentId === student.id);
  const leaves = (state.leaveApplications || []).filter((l) => l.studentId === student.id);
  const attendance = (state.attendanceRecords || []).filter((a) => a.studentId === student.id);

  // Attendance metrics
  const totalAttPeriods = attendance.length;
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'academic_leave').length;
  const attPercent = totalAttPeriods > 0 ? Math.round((presentCount / totalAttPeriods) * 100) : 100;

  const handlePrint = () => {
    setShowPrintModal(false);
    // Give state time to update modal close before firing window.print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const documentRefId = `DHDC-STU-${student.admissionNumber}-${new Date().getFullYear()}`;
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      {/* =========================================================================
          SCREEN-ONLY VIEW: Interactive UI for browsing student profile tabs
          ========================================================================= */}
      <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn print:hidden">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <User className="w-6 h-6 text-indigo-600" />
              Official Student Profile
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Official student enrollment records, attendance trajectory, honors & personal dossier
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Print Official Document</span>
            </button>
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-5">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {student.name}
                  </h2>
                  <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                    {student.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    Admission No: {student.admissionNumber}
                  </span>
                  {student.rollNumber && (
                    <span>
                      Roll No: <span className="font-semibold text-slate-700 dark:text-slate-200">{student.rollNumber}</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>{studentClass?.name || 'Class Unassigned'}</span>
                </div>
              </div>
            </div>

            <div className="flex sm:justify-end gap-6 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Attendance Rate</span>
                <span className={`text-xl font-black ${attPercent >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {attPercent}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">85% requirement</span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-6">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Class Teacher</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-1">
                  {classTeacher?.name || 'Assigned Soon'}
                </span>
                <span className="text-[10px] text-slate-400 block">{studentClass?.academicYear}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation (No Institutional Academic Reports & Analytics) */}
          <div className="flex items-center gap-2 pt-4 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              General & Contact
            </button>
            <button
              onClick={() => setActiveTab('guardian')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'guardian'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Family & Guardian
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Honors & Achievements ({achievements.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Attendance & Leaves
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              Teacher Remarks
            </button>
          </div>

          {/* Tab 1: Overview & Contact */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Official Enrollment Details
                </h3>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Admission Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{student.admissionNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-slate-400" /> Class & Section
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{studentClass?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.dob || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{student.bloodGroup || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-semibold capitalize text-slate-900 dark:text-white">{student.gender || 'Not specified'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Student Contact & Address
                </h3>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
                  </span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">{student.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Portal Login
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.admissionNumber}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Residential Address</span>
                  <span className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {student.address || 'No residential address recorded.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Guardian Info */}
          {activeTab === 'guardian' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Primary Guardian Details
                </h3>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Guardian Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{student.guardian?.name || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Relationship</span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.relationship || 'Parent'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Occupation</span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.occupation || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Contact Number</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.guardian?.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  Family & Emergency Reach
                </h3>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Father's Name</span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.fatherName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Mother's Name</span>
                  <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.motherName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Emergency Alternate Phone</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{student.guardian?.alternatePhone || 'N/A'}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Guardian Address</span>
                  <span className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {student.guardian?.address || student.address || 'Same as residential address.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Achievements */}
          {activeTab === 'achievements' && (
            <div className="space-y-4 pt-6 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Honors, Competitions & Certificates
              </h3>
              {achievements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                  No extra-curricular achievements recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="warning">{ach.category.toUpperCase()}</Badge>
                        <span className="text-[11px] text-slate-400">{ach.date}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{ach.title}</h4>
                      {ach.positionPrize && (
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {ach.positionPrize}
                        </div>
                      )}
                      {ach.awardedBy && (
                        <div className="text-slate-500">
                          Awarded by: <span className="font-medium text-slate-800 dark:text-slate-200">{ach.awardedBy}</span>
                        </div>
                      )}
                      {ach.description && <p className="text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">{ach.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Attendance & Leaves */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 pt-6 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Attendance Record & Leave Applications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Overall Rate</span>
                  <div className={`text-xl font-black mt-1 ${attPercent >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>{attPercent}%</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Periods Present</span>
                  <div className="text-xl font-black text-indigo-600 mt-1">{presentCount} / {totalAttPeriods}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Approved Leaves</span>
                  <div className="text-xl font-black text-amber-600 mt-1">{leaves.filter((l) => l.status === 'approved' || l.status === 'arrived').length}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Return Check-ins</span>
                  <div className="text-xl font-black text-emerald-600 mt-1">{leaves.filter((l) => l.hasArrived).length}</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">My Leave Applications</h4>
                {leaves.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    No leave applications filed.
                  </div>
                ) : (
                  leaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={l.status === 'approved' || l.status === 'arrived' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}>
                            {l.status.toUpperCase()}
                          </Badge>
                          <span className="font-semibold capitalize text-slate-900 dark:text-white">
                            {l.leaveType.replace('_', ' ')} Leave ({l.totalDurationFormatted || `${l.totalDurationMinutes}m`})
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {l.startDate} {l.endDate !== l.startDate ? `to ${l.endDate}` : ''} • Reason: {l.reason}
                        </div>
                      </div>
                      {l.hasArrived && (
                        <div className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Returned
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Class Teacher Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-4 pt-6 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Class Teacher Observations & Feedback
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                    Observed Strengths
                  </span>
                  <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                    {student.classTeacherNotes?.strengths || 'Consistent participation in classroom discussions and coursework.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider text-[10px]">
                    Focus Areas For Growth
                  </span>
                  <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                    {student.classTeacherNotes?.areasOfImprovement || 'Focus on time management during major evaluations.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  General Behavioral Conduct
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {student.classTeacherNotes?.behaviorRemarks || 'Demonstrates exemplary conduct and respect towards faculty and classmates.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[10px]">
                  Teacher Recommendations
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {student.classTeacherNotes?.recommendations || 'Recommended to pursue academic competitions and collegiate symposiums.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1">
                <span className="font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Counseling & Mentorship Notes
                </span>
                <p className="text-purple-900 dark:text-purple-200 leading-relaxed font-medium">
                  {student.classTeacherNotes?.counselingNotes || 'Regular advising sessions active. Student is responsive to mentoring guidance.'}
                </p>
              </div>

              {student.classTeacherNotes?.lastUpdated && (
                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span>
                    Recorded by <strong>{student.classTeacherNotes.updatedByName || 'Faculty'}</strong>
                  </span>
                  <span>
                    Updated on {new Date(student.classTeacherNotes.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRINT OPTIONS MODAL: Clear, explicit document selection for clean printing
          ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs print:hidden animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Official Document Printing Options
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Only the selected official document parts will be printed on A4 paper
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                Select Document Template:
              </label>

              <div
                onClick={() => setPrintOption('full_dossier')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  printOption === 'full_dossier'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  printOption === 'full_dossier' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                }`}>
                  {printOption === 'full_dossier' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Complete Official Student Dossier
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Formal institutional document with Biometric profile, Guardian contact, Attendance breakdown, Honors, and Teacher conduct evaluation.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setPrintOption('biodata_slip')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  printOption === 'biodata_slip'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  printOption === 'biodata_slip' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                }`}>
                  {printOption === 'biodata_slip' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Student Bio-Data & Enrollment Record Slip
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Streamlined identity card slip with student passport photo, enrollment credentials, address, and primary guardian emergency contact.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setPrintOption('attendance_slip')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  printOption === 'attendance_slip'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  printOption === 'attendance_slip' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                }`}>
                  {printOption === 'attendance_slip' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Attendance & Conduct Verification Slip
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Official verification of student attendance percentage, present periods, approved leaves, return check-ins, and conduct remarks.
                  </p>
                </div>
              </div>
            </div>

            {/* Customization Options */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                Document Inclusions:
              </span>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Include Institutional Signatures & Verification Seal Block
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTeacherNotes}
                  onChange={(e) => setIncludeTeacherNotes(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Include Class Teacher Feedback & Conduct Remarks
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAchievements}
                  onChange={(e) => setIncludeAchievements(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Include Extra-Curricular Honors & Achievements ({achievements.length})
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT-ONLY OFFICIAL DOCUMENT: Isolated document rendered ONLY during print
          Completely excludes website chrome, navbars, sidebars, buttons & page background
          ========================================================================= */}
      <div className="hidden print:block w-full bg-white text-slate-900 p-0 m-0">
        {/* Formal Institutional Letterhead */}
        <div className="pb-5 border-b-2 border-slate-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-900 text-white rounded-xl flex items-center justify-center font-serif text-2xl font-black border-2 border-slate-900">
                DH
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  Darul Huda Islamic University
                </h1>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-700 mt-0.5">
                  DHDC Central Portal • Office of Registrar & Academic Records
                </p>
                <p className="text-[11px] text-slate-600">
                  Affiliated Higher Secondary Collegiate Complex • Continuous Evaluation Cell
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-700 border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <div>Ref: <strong className="text-slate-900 font-bold">{documentRefId}</strong></div>
              <div>Date of Issue: <strong>{currentDateFormatted}</strong></div>
              <div>Session: <strong>{studentClass?.academicYear || state.currentAcademicYear}</strong></div>
              <div className="text-emerald-700 font-bold mt-0.5 uppercase tracking-wider">● Official Record</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-center">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900 bg-slate-100 py-1.5 px-4 rounded border border-slate-300">
              {printOption === 'full_dossier' && 'Official Student Profile & Comprehensive Institutional Dossier'}
              {printOption === 'biodata_slip' && 'Student Bio-Data & Official Enrollment Record Slip'}
              {printOption === 'attendance_slip' && 'Official Student Attendance & Conduct Verification Certificate'}
            </h2>
          </div>
        </div>

        {/* Section 1: Biometric & Enrollment Particulars */}
        <div className="py-4 border-b border-slate-300">
          <div className="flex items-start gap-5">
            {/* Student Passport Photo */}
            <div className="w-28 h-32 border-2 border-slate-400 rounded-lg overflow-hidden shrink-0 flex flex-col items-center justify-center bg-slate-100 text-center">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-slate-500">
                  <User className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-[9px] uppercase font-bold tracking-wider leading-tight">Official Photo</span>
                </div>
              )}
            </div>

            {/* Student Particulars Table */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="col-span-2 pb-1 border-b border-slate-200 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Full Name of Student</span>
                  <span className="text-lg font-black text-slate-900 tracking-tight">{student.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Enrollment Status</span>
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                    {student.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Admission Number:</span>
                <span className="font-mono font-bold text-slate-900 ml-1.5 text-sm">{student.admissionNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Roll Number:</span>
                <span className="font-bold text-slate-900 ml-1.5">{student.rollNumber || 'N/A'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Class & Section:</span>
                <span className="font-bold text-slate-900 ml-1.5">{studentClass?.name || 'Class Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Assigned Class Teacher:</span>
                <span className="font-bold text-slate-900 ml-1.5">{classTeacher?.name || 'Unassigned'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Date of Birth:</span>
                <span className="font-medium text-slate-900 ml-1.5">{student.dob || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Blood Group / Gender:</span>
                <span className="font-bold text-slate-900 ml-1.5">{student.bloodGroup || 'N/A'} • {student.gender || 'N/A'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Student Phone:</span>
                <span className="font-mono text-slate-900 ml-1.5">{student.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Student Email:</span>
                <span className="font-mono text-slate-900 ml-1.5">{student.email || 'N/A'}</span>
              </div>

              <div className="col-span-2 pt-1 border-t border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Permanent Residential Address:</span>
                <span className="text-slate-900 ml-1.5 font-medium">{student.address || 'No residential address recorded.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Family & Guardian Information */}
        {(printOption === 'full_dossier' || printOption === 'biodata_slip') && (
          <div className="py-3.5 border-b border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 px-2 py-1 rounded">
              Parent & Legal Guardian Particulars
            </h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Primary Guardian:</span>
                <span className="font-bold text-slate-900">{student.guardian?.name || 'Not provided'}</span>
                <span className="text-slate-600 block text-[11px]">({student.guardian?.relationship || 'Parent'})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Guardian Phone:</span>
                <span className="font-mono font-bold text-slate-900">{student.guardian?.phone || 'N/A'}</span>
                {student.guardian?.alternatePhone && (
                  <span className="font-mono text-slate-600 block text-[11px]">Alt: {student.guardian?.alternatePhone}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Occupation:</span>
                <span className="text-slate-900">{student.guardian?.occupation || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Father's Name:</span>
                <span className="text-slate-900 font-medium">{student.guardian?.fatherName || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Mother's Name:</span>
                <span className="text-slate-900 font-medium">{student.guardian?.motherName || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Emergency Contact:</span>
                <span className="font-mono font-bold text-slate-900">{student.guardian?.alternatePhone || student.guardian?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Verified Attendance Record */}
        {(printOption === 'full_dossier' || printOption === 'attendance_slip') && (
          <div className="py-3.5 border-b border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 px-2 py-1 rounded flex items-center justify-between">
              <span>Verified Attendance Trajectory & Leave Records</span>
              <span className="font-mono text-[11px] normal-case">Minimum Mandatory Attendance: 85%</span>
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Overall Attendance</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">{attPercent}%</span>
                <span className={`text-[10px] font-bold uppercase ${attPercent >= 85 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {attPercent >= 85 ? 'Eligible (Standard Met)' : 'Attendance Deficit'}
                </span>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Periods Present</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">{presentCount}</span>
                <span className="text-[10px] text-slate-600">out of {totalAttPeriods} total periods</span>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Approved Leaves</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">
                  {leaves.filter((l) => l.status === 'approved' || l.status === 'arrived').length}
                </span>
                <span className="text-[10px] text-slate-600">Formal applications</span>
              </div>
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Return Check-ins</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">
                  {leaves.filter((l) => l.hasArrived).length}
                </span>
                <span className="text-[10px] text-slate-600">Documented returns</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Extra-Curricular Honors & Achievements */}
        {includeAchievements && printOption === 'full_dossier' && achievements.length > 0 && (
          <div className="py-3.5 border-b border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 px-2 py-1 rounded">
              Institutional Honors & Extra-Curricular Achievements ({achievements.length})
            </h3>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
                  <th className="p-1.5 border-r border-slate-300">Date</th>
                  <th className="p-1.5 border-r border-slate-300">Category</th>
                  <th className="p-1.5 border-r border-slate-300">Title / Event</th>
                  <th className="p-1.5 border-r border-slate-300">Award / Position</th>
                  <th className="p-1.5">Conferred By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {achievements.map((ach) => (
                  <tr key={ach.id}>
                    <td className="p-1.5 font-mono text-[11px] border-r border-slate-200">{ach.date}</td>
                    <td className="p-1.5 font-semibold uppercase text-[10px] border-r border-slate-200">{ach.category}</td>
                    <td className="p-1.5 font-bold border-r border-slate-200">{ach.title}</td>
                    <td className="p-1.5 font-semibold text-slate-800 border-r border-slate-200">{ach.positionPrize || 'Participant'}</td>
                    <td className="p-1.5 text-slate-700">{ach.awardedBy || 'Institutional'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Class Teacher Conduct Remarks */}
        {includeTeacherNotes && (printOption === 'full_dossier' || printOption === 'attendance_slip') && (
          <div className="py-3.5 border-b border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 px-2 py-1 rounded">
              Faculty & Class Teacher Mentorship Observations
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 border border-slate-200 rounded">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">Observed Strengths</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed font-medium">
                  {student.classTeacherNotes?.strengths || 'Consistent participation in classroom discussions and collegiate coursework.'}
                </p>
              </div>
              <div className="p-2 border border-slate-200 rounded">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">Focus Areas & Recommendations</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed font-medium">
                  {student.classTeacherNotes?.areasOfImprovement || student.classTeacherNotes?.recommendations || 'Maintain high focus on internal assessment milestones.'}
                </p>
              </div>
              <div className="col-span-2 p-2 border border-slate-200 rounded">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">General Behavioral Conduct</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed">
                  {student.classTeacherNotes?.behaviorRemarks || 'Demonstrates exemplary conduct and respect towards faculty and classmates.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Official Institutional Signatures & Verification Seal */}
        {includeSignatures && (
          <div className="pt-8">
            <div className="grid grid-cols-4 gap-4 items-end text-center text-xs">
              <div>
                <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-900">
                  {classTeacher?.name || 'Class Teacher'}
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-600">Class Teacher / Mentor</span>
              </div>

              <div>
                <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-900">
                  Head of Attendance Cell
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-600">Verification Officer</span>
              </div>

              <div>
                <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-900">
                  Principal / Dean
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-600">Head of Institution</span>
              </div>

              {/* Official Seal Block */}
              <div className="border-2 border-dashed border-slate-400 p-3 rounded flex flex-col items-center justify-center min-h-[70px]">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">
                  INSTITUTIONAL SEAL & DATE
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-1">
                  DHDC / {currentDateFormatted}
                </span>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              This document is an official institutional transcript issued by Darul Huda Islamic University Central Portal. 
              Any alteration or unauthorized reproduction voids this certificate. For inquiries, contact the Office of the Registrar.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
