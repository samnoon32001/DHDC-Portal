import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Plus,
  Search,
  Filter,
  ArrowRight,
  User,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/db';
import { LeaveApplication, LeaveType, LeaveStatus, ActiveHourSlot } from '../../types';

export const LeaveManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const user = currentUser;
  const isStudent = user?.role === 'student';
  const isStaffOrAdmin = user?.role === 'super_admin' || user?.role === 'teacher';

  const [dbState, setDbState] = useState(() => dataService.getState());
  const [activeTab, setActiveTab] = useState<'applications' | 'slots'>('applications');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Modal states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // New Application Form State
  const [formData, setFormData] = useState({
    studentId: isStudent ? (user?.studentId || user?.id || '') : '',
    leaveType: 'casual_leave' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedSlotIds: [] as string[],
    reason: '',
  });

  React.useEffect(() => {
    return dataService.subscribe(() => {
      setDbState(dataService.getState());
    });
  }, []);

  const students = dbState.students || [];
  const classes = dbState.classes || [];
  const activeHourSlots = (dbState.activeHourSlots || []).filter((s) => s.isActive);
  const allLeaves = dbState.leaveApplications || [];

  // Filter leaves depending on user role
  const filteredLeaves = useMemo(() => {
    let list = allLeaves;

    // Student only sees their own leaves
    if (isStudent) {
      const studentId = user?.studentId || user?.id;
      list = list.filter((l) => l.studentId === studentId || l.studentAdmissionNumber === user?.admissionNumber);
    } else if (selectedClassId !== 'all') {
      list = list.filter((l) => l.classId === selectedClassId);
    }

    if (statusFilter !== 'all') {
      list = list.filter((l) => l.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (l) =>
          l.studentName.toLowerCase().includes(q) ||
          l.studentAdmissionNumber.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.leaveType.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allLeaves, isStudent, user, selectedClassId, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const list = isStudent
      ? allLeaves.filter((l) => l.studentId === (user?.studentId || user?.id) || l.studentAdmissionNumber === user?.admissionNumber)
      : allLeaves;

    return {
      total: list.length,
      pending: list.filter((l) => l.status === 'pending').length,
      approved: list.filter((l) => l.status === 'approved').length,
      rejected: list.filter((l) => l.status === 'rejected').length,
      arrived: list.filter((l) => l.status === 'arrived').length,
    };
  }, [allLeaves, isStudent, user]);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let targetStudentId = formData.studentId;
    if (isStudent) {
      targetStudentId = user?.studentId || user?.id || '';
    }

    const student = students.find((s) => s.id === targetStudentId || s.admissionNumber === user?.admissionNumber);
    if (!student && !isStudent) {
      alert('Please select a valid student');
      return;
    }

    if (!formData.reason.trim()) {
      alert('Please enter the reason for leave');
      return;
    }

    dataService.applyLeave({
      studentId: student ? student.id : targetStudentId,
      studentAdmissionNumber: student?.admissionNumber || user?.admissionNumber || '',
      studentName: student?.name || user?.name || 'Student',
      classId: student?.classId || '',
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      slotsIncluded: formData.selectedSlotIds,
      reason: formData.reason,
    });

    setIsApplyModalOpen(false);
    setFormData({
      studentId: isStudent ? (user?.studentId || user?.id || '') : '',
      leaveType: 'casual_leave',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      selectedSlotIds: [],
      reason: '',
    });
  };

  const handleApprove = (leaveId: string) => {
    dataService.reviewLeave(
      leaveId,
      'approved',
      user?.name || 'Administrator',
      user?.id || 'admin',
      reviewRemarks
    );
    setIsReviewModalOpen(false);
    setSelectedLeave(null);
    setReviewRemarks('');
  };

  const handleReject = (leaveId: string) => {
    dataService.reviewLeave(
      leaveId,
      'rejected',
      user?.name || 'Administrator',
      user?.id || 'admin',
      reviewRemarks
    );
    setIsReviewModalOpen(false);
    setSelectedLeave(null);
    setReviewRemarks('');
  };

  const handleMarkArrival = (leaveId: string) => {
    dataService.recordLeaveArrival(leaveId, user?.name || 'Staff');
  };

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'academic':
      case 'academic_leave':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Academic (Present)
          </span>
        );
      case 'official':
      case 'official_leave':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Official Leave (Max 10%)
          </span>
        );
      case 'medical':
      case 'medical_leave':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medical Leave
          </span>
        );
      case 'casual':
      case 'casual_leave':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Casual Leave (Max 15%)
          </span>
        );
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'arrived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Returned to Campus
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div id="leave-management-view" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {isStudent ? 'My Leave Applications' : 'Leave Management'}
              </h1>
              <p className="text-xs text-slate-600">
                {isStudent
                  ? 'Apply for casual, official, medical, or academic leaves and track approval status.'
                  : 'Review student leave requests, active hour slots, and gate arrival logs.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-apply-leave"
            type="button"
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-sm font-medium rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="text-xs font-medium opacity-80">Total Requests</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white hover:bg-amber-50/40 border-amber-200 text-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-amber-700">Pending Review</div>
          <div className="text-2xl font-bold mt-1 text-amber-700">{stats.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'approved'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white hover:bg-emerald-50/40 border-emerald-200 text-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-emerald-700">Approved</div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{stats.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter('arrived')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'arrived'
              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
              : 'bg-white hover:bg-teal-50/40 border-teal-200 text-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-teal-700">Campus Returned</div>
          <div className="text-2xl font-bold mt-1 text-teal-700">{stats.arrived}</div>
        </div>
      </div>

      {/* Regulations notice */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-semibold">Institutional Regulations:</span> Maximum Official Leaves:{' '}
          <strong className="text-emerald-950">10%</strong> of semester attendance. Maximum Casual Leaves:{' '}
          <strong className="text-emerald-950">15%</strong>. All combined leaves (Official + Casual + Medical) max:{' '}
          <strong className="text-emerald-950">25%</strong>. Academic Leaves are counted as{' '}
          <strong className="text-emerald-950">Present</strong>. Overall required attendance without medical is{' '}
          <strong className="text-emerald-950">85%</strong>.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isStudent ? 'Search your applications...' : 'Search student name, admission no, reason...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {!isStudent && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-medium py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="arrived">Returned to Campus</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leaves List */}
      <div className="space-y-3">
        {filteredLeaves.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-slate-700">No leave applications found</p>
            <p className="text-xs mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try clearing the search filters.'
                : 'Click "Apply for Leave" above to submit a new leave request.'}
            </p>
          </div>
        ) : (
          filteredLeaves.map((leave) => {
            const student = students.find((s) => s.id === leave.studentId);
            const studentClass = classes.find((c) => c.id === leave.classId);

            return (
              <div
                key={leave.id}
                id={`leave-card-${leave.id}`}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(leave.status)}
                    {getLeaveTypeBadge(leave.leaveType)}
                    {leave.totalDurationFormatted && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {leave.totalDurationFormatted}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-base">{leave.studentName}</span>
                      <span className="text-xs text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        Adm #{leave.studentAdmissionNumber}
                      </span>
                      {studentClass && (
                        <span className="text-xs font-medium text-slate-600 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                          {studentClass.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{leave.reason}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {leave.startDate} {leave.startDate !== leave.endDate && `→ ${leave.endDate}`}
                    </span>
                    {leave.appliedAt && (
                      <span className="text-slate-600">
                        Applied: {new Date(leave.appliedAt).toLocaleDateString()}
                      </span>
                    )}
                    {leave.reviewedByName && (
                      <span className="text-slate-600">
                        Reviewed by: <strong className="text-slate-700">{leave.reviewedByName}</strong>
                      </span>
                    )}
                    {leave.arrivedAt && (
                      <span className="text-teal-700 font-medium">
                        Returned to campus: {new Date(leave.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {leave.remarks && (
                    <div className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-600">
                      <strong>Remarks:</strong> {leave.remarks}
                    </div>
                  )}
                </div>

                {/* Actions for faculty / admin */}
                {isStaffOrAdmin && (
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {leave.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setIsReviewModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-all"
                        >
                          Review & Decide
                        </button>
                      </>
                    )}

                    {leave.status === 'approved' && !leave.hasArrived && (
                      <button
                        type="button"
                        onClick={() => handleMarkArrival(leave.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition-all"
                      >
                        Record Arrival
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Submit Leave Application</h2>
            <p className="text-xs text-slate-600 mb-4">
              Submit your official, casual, academic, or medical leave request.
            </p>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              {!isStudent && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    required
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Adm #{s.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="casual_leave">Casual Leave (Max 15% allowance)</option>
                  <option value="official_leave">Official Leave (Max 10% allowance)</option>
                  <option value="academic_leave">Academic Leave (Counted as Present)</option>
                  <option value="medical_leave">Medical Leave (Requires Medical Certificate)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value > formData.endDate ? e.target.value : formData.endDate })}
                    required
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    min={formData.startDate}
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {activeHourSlots.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Active Hour Slots (Optional - for partial day leaves)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                    {activeHourSlots.map((slot) => {
                      const isChecked = formData.selectedSlotIds.includes(slot.id);
                      return (
                        <label
                          key={slot.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, selectedSlotIds: [...formData.selectedSlotIds, slot.id] });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedSlotIds: formData.selectedSlotIds.filter((id) => id !== slot.id),
                                });
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>
                            {slot.label} ({slot.startTime}-{slot.endTime})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Purpose</label>
                <textarea
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Explain why you are requesting leave..."
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-all"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for Staff */}
      {isReviewModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Review Leave Request</h2>
            <div className="p-3 bg-slate-50 rounded-xl my-3 border border-slate-200 text-xs space-y-1">
              <div>
                <strong className="text-slate-700">Student:</strong> {selectedLeave.studentName} (Adm #{selectedLeave.studentAdmissionNumber})
              </div>
              <div>
                <strong className="text-slate-700">Type:</strong> {selectedLeave.leaveType}
              </div>
              <div>
                <strong className="text-slate-700">Dates:</strong> {selectedLeave.startDate} to {selectedLeave.endDate}
              </div>
              <div>
                <strong className="text-slate-700">Reason:</strong> {selectedLeave.reason}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Remarks / Conditions
              </label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Optional remarks (e.g. Approved with prior syllabus completion)"
                className="w-full text-sm p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setSelectedLeave(null);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(selectedLeave.id)}
                  className="px-3 py-2 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedLeave.id)}
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-all"
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
