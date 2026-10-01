import React, { useState, useMemo } from 'react';
import {
  ComplaintFeedback,
  MessageReceiverType,
  Student,
  ClassRoom,
} from '../../types';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Reply,
  Shield,
  User,
  Plus,
  X,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const ComplaintsFeedbackView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const state = dataService.getState();
  const [, setRerender] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submit Complaint Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [receiverType, setReceiverType] = useState<MessageReceiverType>('class_teacher');
  const [category, setCategory] = useState<'academic' | 'facilities' | 'administration' | 'attendance' | 'general'>('academic');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Response / Reply Modal
  const [replyingComplaint, setReplyingComplaint] = useState<ComplaintFeedback | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [newStatus, setNewStatus] = useState<'acknowledged' | 'in_review' | 'resolved'>('in_review');

  const teacherObj = state.teachers.find((t) => t.id === currentUser?.id);
  const currentStudentObj = state.students.find((s) => s.username === currentUser?.username);

  // Filter complaints based on user's role and selected filters
  const filteredComplaints = useMemo(() => {
    return state.complaints.filter((item) => {
      // If student, only show their own complaints
      if (role === 'student') {
        if (item.studentId !== currentStudentObj?.id && item.studentAdmissionNumber !== currentUser?.admissionNumber) {
          return false;
        }
      }

      // If teacher, show if addressed to super_admin or their role or class teacher
      if (role === 'teacher') {
        const specialRole = teacherObj?.specialRoleTitle?.toLowerCase().replace(/\s+/g, '_');
        const isClassTeacher = teacherObj?.classTeacherOfClassIds?.includes(item.classId);
        
        const isAddressedToTeacher =
          (item.receiverType === 'class_teacher' && isClassTeacher) ||
          (item.receiverType === 'principal' && specialRole === 'principal') ||
          (item.receiverType === 'academic_assistant' && specialRole === 'academic_assistant') ||
          (item.receiverType === 'hod' && specialRole === 'hod') ||
          (item.receiverType === 'hos' && specialRole === 'hos');

        // Teachers see complaints addressed to their designated role or class, unless they have an administrative title
        if (!isAddressedToTeacher && !specialRole) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Recipient filter
      if (recipientFilter !== 'all' && item.receiverType !== recipientFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubj = (item.subject || item.title || '').toLowerCase().includes(q);
        const matchMsg = (item.message || '').toLowerCase().includes(q);
        const matchStudent = (item.studentName || '').toLowerCase().includes(q);
        if (!matchSubj && !matchMsg && !matchStudent) return false;
      }

      return true;
    });
  }, [
    state.complaints,
    role,
    currentStudentObj,
    currentUser,
    teacherObj,
    statusFilter,
    recipientFilter,
    searchQuery,
  ]);

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    let studentId = currentStudentObj?.id || currentUser?.id || 'guest';
    let admissionNumber = currentStudentObj?.admissionNumber || currentUser?.admissionNumber || 'ADM000';
    let studentName = isAnonymous ? 'Anonymous Student' : (currentStudentObj?.name || currentUser?.name || 'Student');
    let classId = currentStudentObj?.classId || state.classes[0]?.id || '';

    dataService.submitComplaint(
      {
        studentId,
        studentAdmissionNumber: admissionNumber,
        studentName,
        classId,
        receiverType,
        category,
        subject: subject.trim(),
        message: message.trim(),
        isAnonymous,
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );

    setShowSubmitModal(false);
    setSubject('');
    setMessage('');
    setIsAnonymous(false);
    setRerender((v) => v + 1);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingComplaint || !replyMessage.trim() || !currentUser) return;

    dataService.respondToComplaint(
      replyingComplaint.id,
      {
        status: newStatus,
        response: replyMessage.trim(),
        respondedBy: currentUser.id,
        respondedByName: currentUser.name,
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );

    setReplyingComplaint(null);
    setReplyMessage('');
    setRerender((v) => v + 1);
  };

  const getReceiverLabel = (type: MessageReceiverType) => {
    switch (type) {
      case 'principal':
        return 'Principal';
      case 'academic_assistant':
        return 'Academic Assistant';
      case 'class_teacher':
        return 'Class Teacher';
      case 'hod':
        return 'Head of Department (HoD)';
      case 'hos':
        return 'Head of School (HoS)';
      case 'super_admin':
        return 'Super Admin / Management';
      default:
        return 'Administration';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Complaints, Feedback & Grievance Redressal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Direct institutional routing to Principal, Academic Assistant, Class Teacher, HoD, HoS, and Administration
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Submit Grievance / Feedback
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'submitted', 'acknowledged', 'in_review', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {st.toUpperCase().replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          >
            <option value="all">All Receivers</option>
            <option value="principal">Principal</option>
            <option value="academic_assistant">Academic Assistant</option>
            <option value="class_teacher">Class Teacher</option>
            <option value="hod">HoD</option>
            <option value="hos">HoS</option>
            <option value="super_admin">Super Admin</option>
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search grievances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs">
          No complaints or feedback records found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((item) => {
            const isResolved = item.status === 'resolved';

            return (
              <div
                key={item.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        isResolved
                          ? 'success'
                          : item.status === 'in_review'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {(item.status || 'submitted').toUpperCase().replace('_', ' ')}
                    </Badge>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Category: {(item.category || 'general').toUpperCase()}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Routed to: {getReceiverLabel(item.receiverType)}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatDate(item.createdAt || item.submittedAt)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {item.subject || item.title || 'Untitled Grievance'}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl">
                    "{item.message}"
                  </p>
                </div>

                {/* Response / Resolution Thread */}
                {item.response && (
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Official Administrative Response ({item.respondedByName || 'Staff'}):
                      </span>
                      <span className="text-[11px] text-emerald-600/70 font-mono">
                        {formatDate(item.resolvedAt || item.respondedAt)}
                      </span>
                    </div>
                    <p className="text-emerald-900 dark:text-emerald-200">
                      {item.response}
                    </p>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500">
                    From: <strong className="text-slate-800 dark:text-slate-200">{item.studentName}</strong>{' '}
                    {!item.isAnonymous && <span className="font-mono">({item.studentAdmissionNumber})</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {(role === 'super_admin' || role === 'teacher') && (
                      <button
                        onClick={() => {
                          setReplyingComplaint(item);
                          setReplyMessage(item.response || '');
                          setNewStatus(item.status === 'resolved' ? 'resolved' : 'resolved');
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {item.response ? 'Update Resolution' : 'Review & Respond'}
                      </button>
                    )}

                    {role === 'super_admin' && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this complaint record?')) {
                            dataService.deleteComplaint(
                              item.id,
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
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: SUBMIT COMPLAINT */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit Grievance / Feedback</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Recipient *
                  </label>
                  <select
                    value={receiverType}
                    onChange={(e) => setReceiverType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="class_teacher">Class Teacher</option>
                    <option value="principal">Principal</option>
                    <option value="academic_assistant">Academic Assistant</option>
                    <option value="hod">Head of Department (HoD)</option>
                    <option value="hos">Head of School (HoS)</option>
                    <option value="super_admin">Super Admin / Management</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Grievance Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="academic">Academic / Curriculum</option>
                    <option value="attendance">Attendance / Leaves</option>
                    <option value="facilities">Campus Facilities / Labs</option>
                    <option value="administration">Administration / Fees</option>
                    <option value="general">General Suggestion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request for clarification on Internal Marks evaluation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete constructive details and any pertinent references..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Submit Anonymously (Hide student name and admission number)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Grievance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESPOND TO COMPLAINT */}
      {replyingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Respond to Grievance: {replyingComplaint.subject || replyingComplaint.title || 'Untitled Grievance'}
              </h3>
              <button onClick={() => setReplyingComplaint(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold">Student Message:</span>
                <p className="text-slate-700 dark:text-slate-300 italic">
                  "{replyingComplaint.message}"
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Update Resolution Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="acknowledged">Acknowledged (Under Review)</option>
                  <option value="in_review">In Active Investigation</option>
                  <option value="resolved">Resolved & Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Administrative Response / Action Taken *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the steps taken or decision reached..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReplyingComplaint(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm & Send Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
