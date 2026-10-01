import React, { useState } from 'react';
import {
  Student,
  Achievement,
  BehaviorRecord,
  ClassTeacherNotes,
  LeaveApplication,
  AttendanceRecord,
  ClassRoom,
} from '../../types';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Award,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  Camera,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { ImageUploadField } from '../common/ImageUploadField';

interface StudentDossierModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

type TabKey = 'profile' | 'guardian' | 'academic' | 'achievements' | 'discipline' | 'attendance' | 'teacher-notes';

export const StudentDossierModal: React.FC<StudentDossierModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave,
}) => {
  const { currentUser, role, isClassTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const state = dataService.getState();
  const studentClass = state.classes.find((c) => c.id === student.classId);

  // Check RBAC: Can edit class teacher notes?
  const isClassTeacherOfStudent =
    (role === 'teacher' && studentClass?.classTeacherId === currentUser?.id) ||
    (role === 'teacher' && state.teachers.find((t) => t.id === currentUser?.id)?.classTeacherOfClassIds?.includes(student.classId));
  const canEditNotes = role === 'super_admin' || isClassTeacherOfStudent;
  const canEditProfile = role === 'super_admin' || isClassTeacherOfStudent;

  // Local form states
  const [formData, setFormData] = useState({
    name: student.name || '',
    photoUrl: student.photoUrl || '',
    dob: student.dob || '',
    gender: student.gender || 'other',
    bloodGroup: student.bloodGroup || '',
    phone: student.phone || '',
    email: student.email || '',
    address: student.address || '',
    guardianName: student.guardian?.name || '',
    guardianRelation: student.guardian?.relationship || 'Guardian',
    guardianPhone: student.guardian?.phone || '',
    guardianEmail: student.guardian?.email || '',
    guardianOccupation: student.guardian?.occupation || '',
    guardianAddress: student.guardian?.address || '',
    fatherName: student.guardian?.fatherName || '',
    motherName: student.guardian?.motherName || '',
    alternatePhone: student.guardian?.alternatePhone || '',
  });

  const [notesData, setNotesData] = useState<ClassTeacherNotes>({
    strengths: student.classTeacherNotes?.strengths || '',
    areasOfImprovement: student.classTeacherNotes?.areasOfImprovement || '',
    behaviorRemarks: student.classTeacherNotes?.behaviorRemarks || '',
    counselingNotes: student.classTeacherNotes?.counselingNotes || '',
    recommendations: student.classTeacherNotes?.recommendations || '',
  });

  // Modal for adding Achievement
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [achForm, setAchForm] = useState({
    title: '',
    category: 'award' as Achievement['category'],
    date: new Date().toISOString().split('T')[0],
    positionPrize: '',
    awardedBy: '',
    description: '',
  });

  // Modal for adding Behavior Record
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [behForm, setBehForm] = useState({
    type: 'positive' as BehaviorRecord['type'],
    title: '',
    description: '',
    actionTaken: '',
  });

  if (!isOpen) return null;

  // Achievements for this student
  const studentAchievements = (state.achievements || []).filter((a) => a.studentId === student.id);
  // Behavior records for this student
  const studentBehavior = (state.behaviorRecords || []).filter((b) => b.studentId === student.id);
  // Leaves for this student
  const studentLeaves = (state.leaveApplications || []).filter((l) => l.studentId === student.id);
  // Attendance records
  const studentAttendance = (state.attendanceRecords || []).filter((att) => att.studentId === student.id);
  // Clearances
  const studentClearances = (state.attendanceClearances || []).filter((clr) => clr.studentId === student.id);

  // Calculate Attendance Stats
  const totalPeriodsMarked = studentAttendance.length;
  const presentCount = studentAttendance.filter((a) => a.status === 'present' || a.status === 'academic_leave').length;
  const absentCount = studentAttendance.filter((a) => a.status === 'absent').length;
  const officialLeaves = studentAttendance.filter((a) => a.status === 'official_leave').length;
  const casualLeaves = studentAttendance.filter((a) => a.status === 'casual_leave').length;
  const medicalLeaves = studentAttendance.filter((a) => a.status === 'medical_leave').length;
  const lateCount = studentAttendance.filter((a) => a.status === 'late').length;

  const attendancePercent = totalPeriodsMarked > 0 ? Math.round((presentCount / totalPeriodsMarked) * 100) : 100;

  // Student Marks & Academic calculation
  const studentMarks = (state.marks || []).filter((m) => m.studentId === student.id);
  const subjectsInClass = state.subjects.filter((s) => s.classId === student.classId);

  const handleSaveProfile = () => {
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined;
    dataService.updateStudentExtendedProfile(
      student.id,
      {
        name: formData.name,
        photoUrl: formData.photoUrl,
        dob: formData.dob,
        gender: formData.gender as any,
        bloodGroup: formData.bloodGroup,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        guardian: {
          name: formData.guardianName,
          relationship: formData.guardianRelation,
          phone: formData.guardianPhone,
          email: formData.guardianEmail,
          occupation: formData.guardianOccupation,
          address: formData.guardianAddress,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          alternatePhone: formData.alternatePhone,
        },
      },
      actor
    );

    setIsEditingProfile(false);
    setFeedbackMsg('Student profile details saved successfully.');
    setTimeout(() => setFeedbackMsg(null), 3000);
    if (onSave) onSave();
  };

  const handleSaveNotes = () => {
    if (!currentUser) return;
    dataService.updateClassTeacherNotes(
      student.id,
      notesData,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
    setIsEditingNotes(false);
    setFeedbackMsg('Class teacher observations & counseling notes recorded.');
    setTimeout(() => setFeedbackMsg(null), 3000);
    if (onSave) onSave();
  };

  const handleCreateAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achForm.title.trim()) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined;
    dataService.addAchievement(
      {
        studentId: student.id,
        title: achForm.title.trim(),
        category: achForm.category,
        date: achForm.date,
        positionPrize: achForm.positionPrize.trim(),
        awardedBy: achForm.awardedBy.trim(),
        description: achForm.description.trim(),
      },
      actor
    );
    setShowAddAchievement(false);
    setAchForm({
      title: '',
      category: 'award',
      date: new Date().toISOString().split('T')[0],
      positionPrize: '',
      awardedBy: '',
      description: '',
    });
  };

  const handleCreateBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!behForm.title.trim()) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined;
    dataService.addBehaviorRecord(
      {
        studentId: student.id,
        type: behForm.type,
        title: behForm.title.trim(),
        description: behForm.description.trim(),
        actionTaken: behForm.actionTaken.trim(),
        recordedBy: currentUser?.name || 'Class Teacher',
        recordedByRole: role === 'super_admin' ? 'Super Admin' : 'Class Teacher',
      },
      actor
    );
    setShowAddBehavior(false);
    setBehForm({
      type: 'positive',
      title: '',
      description: '',
      actionTaken: '',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {formData.photoUrl ? (
              <img
                src={formData.photoUrl}
                alt={student.name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                {student.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {student.name}
                </h2>
                <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                  {student.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="font-mono">Adm: {student.admissionNumber}</span>
                <span>•</span>
                <span>Class: {studentClass?.name || 'Unassigned'}</span>
                <span>•</span>
                <span className={attendancePercent >= 85 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  Attendance: {attendancePercent}%
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              title="Print Dossier"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Student Profile
          </button>
          <button
            onClick={() => setActiveTab('guardian')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'guardian'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            Family & Guardian
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'academic'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Academic Performance
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'achievements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Achievements ({studentAchievements.length})
          </button>
          <button
            onClick={() => setActiveTab('discipline')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'discipline'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Discipline ({studentBehavior.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Attendance & Leaves
          </button>
          <button
            onClick={() => setActiveTab('teacher-notes')}
            className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'teacher-notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            Class Teacher Notes
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Basic Student Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official biometric, residential, and contact records
                  </p>
                </div>
                {canEditProfile && (
                  <div>
                    {isEditingProfile ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditingProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <ImageUploadField
                      id="student-dossier-photo"
                      label="Student Photograph (Upload File or URL)"
                      value={formData.photoUrl || ''}
                      onChange={(val) => setFormData({ ...formData, photoUrl: val })}
                      helperText="Photos are compressed to lightweight WebP/JPEG and stored locally in browser storage & synced to cloud Firestore."
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                    <input
                      type="text"
                      placeholder="e.g. O+, A+, B+"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Permanent Residential Address</label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">Admission Number</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{student.admissionNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">Roll Number</span>
                      <span className="font-bold text-slate-900 dark:text-white">{student.rollNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">Assigned Class</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{studentClass?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">Date of Birth</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{student.dob || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Gender</span>
                      <span className="font-semibold capitalize text-slate-900 dark:text-white">{student.gender || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> Blood Group</span>
                      <span className="font-bold text-slate-900 dark:text-white">{student.bloodGroup || 'Not recorded'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-indigo-500" /> Phone</span>
                      <span className="font-medium text-slate-900 dark:text-white">{student.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-500" /> Email</span>
                      <span className="font-medium text-slate-900 dark:text-white">{student.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> Enrollment Date</span>
                      <span className="font-medium text-slate-900 dark:text-white">{student.enrollmentDate || 'Active'}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500 block mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> Address</span>
                      <span className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {student.address || 'No residential address on file.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAMILY & GUARDIAN */}
          {activeTab === 'guardian' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Parent & Guardian Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Emergency contacts, parental background, and guardianship details
                  </p>
                </div>
                {canEditProfile && !isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setIsEditingProfile(true);
                    }}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Guardian Info
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider mb-2">
                    Primary Guardian Contact
                  </h4>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Guardian Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{student.guardian?.name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Relationship</span>
                    <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.relationship || 'Parent / Guardian'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Occupation</span>
                    <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.occupation || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Primary Phone</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.guardian?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider mb-2">
                    Family & Emergency Details
                  </h4>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Father's Name</span>
                    <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.fatherName || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Mother's Name</span>
                    <span className="font-medium text-slate-900 dark:text-white">{student.guardian?.motherName || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Emergency / Alt Phone</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{student.guardian?.alternatePhone || 'N/A'}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 block mb-1">Guardian Address</span>
                    <span className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {student.guardian?.address || student.address || 'Same as student address.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMIC PERFORMANCE */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Academic Performance & Progress
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Continuous evaluation results, subject breakdown, and grade standing
                  </p>
                </div>
              </div>

              {subjectsInClass.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  No enrolled subjects configured for this student's class.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Subject</th>
                          <th className="p-3">Code</th>
                          <th className="p-3">Teacher</th>
                          <th className="p-3 text-center">Marks Entered</th>
                          <th className="p-3 text-center">Average Score</th>
                          <th className="p-3 text-center">Standing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {subjectsInClass.map((subj) => {
                          const subjMarks = studentMarks.filter((m) => m.subjectId === subj.id);
                          const teacher = state.teachers.find((t) => t.id === subj.teacherId);
                          let avgPercent = 0;
                          if (subjMarks.length > 0) {
                            const sumPercent = subjMarks.reduce((acc, m) => acc + (m.obtainedMark / m.maximumMark) * 100, 0);
                            avgPercent = Math.round(sumPercent / subjMarks.length);
                          }

                          return (
                            <tr key={subj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-semibold text-slate-900 dark:text-white">{subj.name}</td>
                              <td className="p-3 font-mono text-slate-500">{subj.code}</td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">{teacher?.name || 'TBD'}</td>
                              <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                {subjMarks.length}
                              </td>
                              <td className="p-3 text-center">
                                {subjMarks.length > 0 ? (
                                  <span className={`font-bold ${avgPercent >= 75 ? 'text-emerald-600' : avgPercent >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {avgPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No marks</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {subjMarks.length > 0 ? (
                                  <Badge variant={avgPercent >= 80 ? 'success' : avgPercent >= 60 ? 'info' : 'warning'}>
                                    {avgPercent >= 80 ? 'Distinction' : avgPercent >= 60 ? 'Good' : 'Needs Focus'}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Highlights Card */}
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-xs">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Academic Trajectory Analysis</h4>
                    <p className="text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                      Student demonstrates high consistency in active class discussions and evaluation submissions. Periodic internal exams reflect steady academic progress.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Honors & Extra-Curricular Achievements
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Awards, competitions, sports triumphs, and arts recognition
                  </p>
                </div>
                {(role === 'super_admin' || role === 'teacher') && (
                  <button
                    type="button"
                    onClick={() => setShowAddAchievement(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Achievement
                  </button>
                )}
              </div>

              {studentAchievements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  No honors or achievements recorded for this student yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentAchievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="warning">{ach.category.toUpperCase()}</Badge>
                          <span className="text-[11px] text-slate-400">{ach.date}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {ach.title}
                        </h4>
                        {ach.positionPrize && (
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            {ach.positionPrize}
                          </div>
                        )}
                        {ach.awardedBy && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Awarded by: <span className="font-medium text-slate-700 dark:text-slate-200">{ach.awardedBy}</span>
                          </div>
                        )}
                        {ach.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                            {ach.description}
                          </p>
                        )}
                      </div>

                      {(role === 'super_admin' || role === 'teacher') && (
                        <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove achievement "${ach.title}"?`)) {
                                dataService.deleteAchievement(ach.id, currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-700 p-1 rounded-md text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DISCIPLINE */}
          {activeTab === 'discipline' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Behavioral Records & Observational Notes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Positive behavior commendations, warnings, and institutional actions
                  </p>
                </div>
                {canEditNotes && (
                  <button
                    type="button"
                    onClick={() => setShowAddBehavior(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Behavior Log
                  </button>
                )}
              </div>

              {studentBehavior.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  Student maintains a spotless behavioral record with no infractions or incidents.
                </div>
              ) : (
                <div className="space-y-3">
                  {studentBehavior.map((beh) => (
                    <div
                      key={beh.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              beh.type === 'positive'
                                ? 'success'
                                : beh.type === 'incident'
                                ? 'danger'
                                : beh.type === 'warning'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {beh.type.toUpperCase()}
                          </Badge>
                          <span className="text-[11px] text-slate-400">{beh.date}</span>
                          <span className="text-[11px] text-slate-400">• Recorded by: {beh.recordedBy}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{beh.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {beh.description}
                        </p>
                        {beh.actionTaken && (
                          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg mt-1">
                            Action Taken: {beh.actionTaken}
                          </div>
                        )}
                      </div>

                      {canEditNotes && (
                        <div className="self-start">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove log "${beh.title}"?`)) {
                                dataService.deleteBehaviorRecord(beh.id, currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ATTENDANCE & LEAVES */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Attendance Dossier & Active Leaves
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated against daily college active hours (07:00-09:15, 09:45-11:15, 11:25-12:55, 14:00-15:20, 15:30-16:10)
                </p>
              </div>

              {/* Attendance Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Overall Attendance</div>
                  <div className={`text-xl font-black mt-1 ${attendancePercent >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {attendancePercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Threshold: 85% min</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Present Periods</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {presentCount} / {totalPeriodsMarked}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Academic leaves included</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Approved Leaves</div>
                  <div className="text-xl font-black text-amber-600 mt-1">
                    {studentLeaves.filter((l) => l.status === 'approved' || l.status === 'arrived').length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Official, Casual & Medical</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Late Arrivals</div>
                  <div className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1">
                    {lateCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Arrival check-ins</div>
                </div>
              </div>

              {/* Leave Applications History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Leave Applications History
                </h4>
                {studentLeaves.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                    No leave applications recorded for this student.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentLeaves.map((l) => (
                      <div
                        key={l.id}
                        className="p-3.5 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={l.status === 'approved' || l.status === 'arrived' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}>
                              {l.status.toUpperCase()}
                            </Badge>
                            <span className="font-semibold capitalize text-slate-900 dark:text-white">
                              {l.leaveType.replace('_', ' ')} Leave
                            </span>
                            <span className="text-slate-400">• Duration: {l.totalDurationFormatted || `${l.totalDurationMinutes}m`}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-300">
                            {l.startDate} {l.endDate !== l.startDate ? `to ${l.endDate}` : ''} • Reason: {l.reason}
                          </div>
                          {l.hasArrived && (
                            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Arrived & returned to campus
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance Clearances */}
              {studentClearances.length > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs space-y-2">
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Official Attendance Clearance Granted
                  </h4>
                  {studentClearances.map((clr) => (
                    <div key={clr.id} className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                      Approved by <span className="font-bold">{clr.clearedByName}</span> ({clr.clearedByRole}) on {clr.clearedDate ? (clr.clearedDate.includes('T') ? clr.clearedDate.split('T')[0] : clr.clearedDate) : 'N/A'}. Reason: {clr.reason}. Cleared Percentage: {clr.approvedPercentage}%.
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CLASS TEACHER NOTES (RBAC GATED) */}
          {activeTab === 'teacher-notes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Class Teacher Confidential Notes & Counseling
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Restricted observations editable by designated Class Teacher and Super Administrators
                  </p>
                </div>

                {canEditNotes && (
                  <div>
                    {isEditingNotes ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingNotes(false)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Notes
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingNotes(true)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Class Teacher Notes
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-4 p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Key Strengths & Talents
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Excellent debate orator, strong analytical mindset in mathematics..."
                      value={notesData.strengths}
                      onChange={(e) => setNotesData({ ...notesData, strengths: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Areas for Improvement & Remedial Focus
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Needs reinforcement in lab experiments write-up, time management..."
                      value={notesData.areasOfImprovement}
                      onChange={(e) => setNotesData({ ...notesData, areasOfImprovement: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Behavioral & Conduct Observations
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Respectful to faculty, collaborative peer behavior..."
                      value={notesData.behaviorRemarks}
                      onChange={(e) => setNotesData({ ...notesData, behaviorRemarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Counseling & Mentorship Sessions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Record dates and takeaways of personal counseling sessions..."
                      value={notesData.counselingNotes}
                      onChange={(e) => setNotesData({ ...notesData, counselingNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Actionable Recommendations
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Future recommendations for parents and faculty..."
                      value={notesData.recommendations}
                      onChange={(e) => setNotesData({ ...notesData, recommendations: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                        Identified Strengths
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {student.classTeacherNotes?.strengths || 'No specific strengths recorded yet.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                      <div className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px]">
                        Areas for Improvement
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {student.classTeacherNotes?.areasOfImprovement || 'No remedial areas recorded.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                    <div className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                      General Conduct & Behavior Remarks
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {student.classTeacherNotes?.behaviorRemarks || 'Good conduct maintained throughout the academic term.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                    <div className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[11px]">
                      Counseling & Mentorship Record
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {student.classTeacherNotes?.counselingNotes || 'No formal counseling sessions required.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                    <div className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                      Class Teacher Recommendations
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {student.classTeacherNotes?.recommendations || 'Recommended for continued participation in academic co-curriculars.'}
                    </p>
                  </div>

                  {student.classTeacherNotes?.lastUpdated && (
                    <div className="text-[11px] text-slate-400 italic">
                      Last updated by {student.classTeacherNotes.updatedByName || 'Class Teacher'} on {new Date(student.classTeacherNotes.lastUpdated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Student Dossier • DHDC Portal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* SUBMODAL: ADD ACHIEVEMENT */}
        {showAddAchievement && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Add New Achievement</h3>
                <button onClick={() => setShowAddAchievement(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAchievement} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">Achievement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Science Olympiad Winner"
                    value={achForm.title}
                    onChange={(e) => setAchForm({ ...achForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Category</label>
                    <select
                      value={achForm.category}
                      onChange={(e) => setAchForm({ ...achForm, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="award">Award</option>
                      <option value="competition">Competition</option>
                      <option value="certificate">Certificate</option>
                      <option value="sports">Sports</option>
                      <option value="arts_cultural">Arts / Cultural</option>
                      <option value="special_recognition">Special Recognition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={achForm.date}
                      onChange={(e) => setAchForm({ ...achForm, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Prize / Position</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Prize, Gold Medal"
                    value={achForm.positionPrize}
                    onChange={(e) => setAchForm({ ...achForm, positionPrize: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Awarded By</label>
                  <input
                    type="text"
                    placeholder="e.g. University Sports Council"
                    value={achForm.awardedBy}
                    onChange={(e) => setAchForm({ ...achForm, awardedBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Details about the accomplishment..."
                    value={achForm.description}
                    onChange={(e) => setAchForm({ ...achForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAchievement(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Save Achievement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: ADD BEHAVIOR LOG */}
        {showAddBehavior && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Add Behavioral Log</h3>
                <button onClick={() => setShowAddBehavior(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBehavior} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">Log Type</label>
                  <select
                    value={behForm.type}
                    onChange={(e) => setBehForm({ ...behForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="positive">Positive Behavior / Commendation</option>
                    <option value="observation">Observation Note</option>
                    <option value="warning">Warning Issued</option>
                    <option value="incident">Disciplinary Incident</option>
                    <option value="action_taken">Administrative Action Taken</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leadership during Annual Cultural Fair"
                    value={behForm.title}
                    onChange={(e) => setBehForm({ ...behForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Details & Context</label>
                  <textarea
                    rows={3}
                    placeholder="Explain the circumstances, behaviors observed, or positive contributions..."
                    value={behForm.description}
                    onChange={(e) => setBehForm({ ...behForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Action Taken (if applicable)</label>
                  <input
                    type="text"
                    placeholder="e.g. Verbal appreciation in assembly / Parent counseling"
                    value={behForm.actionTaken}
                    onChange={(e) => setBehForm({ ...behForm, actionTaken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBehavior(false)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Record Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
