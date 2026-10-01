import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sparkles,
  Users,
  Award,
  Star,
  CheckCircle,
  X,
  Layers,
  GraduationCap,
  Shield,
  Palette,
  LayoutGrid,
  Search,
  RotateCcw,
  Check,
  UserCheck,
} from 'lucide-react';
import { ImageUploadField } from '../common/ImageUploadField';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type {
  ShowcaseCard,
  ShowcaseCardPriority,
  ShowcaseCardCategory,
  ShowcaseCardTargetAudience,
  UserRole,
} from '../../types';

interface ShowcaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCardId?: string;
  initialTab?: 'cards' | 'create' | 'edit';
}

export const ShowcaseManagementModal: React.FC<ShowcaseManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCardId,
  initialTab,
}) => {
  const { currentUser, role } = useAuth();
  const [dbState, setDbState] = useState(() => dataService.getState());

  useEffect(() => {
    return dataService.subscribe(() => {
      setDbState({ ...dataService.getState() });
    });
  }, []);

  const students = dbState.students || [];
  const classes = dbState.classes || [];
  const roles = dbState.roles || [];

  const [activeTab, setActiveTab] = useState<'cards' | 'create' | 'edit'>('cards');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [formPriority, setFormPriority] = useState<ShowcaseCardPriority>(1);
  const [formCategory, setFormCategory] = useState<ShowcaseCardCategory>('apex_topper');
  const [formTitle, setFormTitle] = useState("Topper of the Rabee' Semester Examination 2026-27");
  const [formSubtitle, setFormSubtitle] = useState('Institutional Highest Academic Honors');
  const [formStudentName, setFormStudentName] = useState('');
  const [formStudentAdmission, setFormStudentAdmission] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formPercentage, setFormPercentage] = useState('98%');
  const [formScoreDetails, setFormScoreDetails] = useState('Score: 490 / 500 • Rank #1');
  const [formSectionOrClass, setFormSectionOrClass] = useState('Degree Department');
  const [formClassId, setFormClassId] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('Apex Institutional Topper 🏆');
  const [formImageUrl, setFormImageUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  );
  const [formDescription, setFormDescription] = useState(
    'Outstanding academic excellence across all semester curricula with straight A+ grades.'
  );
  const [formAccent, setFormAccent] = useState<'gold' | 'emerald' | 'sapphire' | 'ruby' | 'violet' | 'amber'>('gold');
  const [formTargetAudience, setFormTargetAudience] = useState<ShowcaseCardTargetAudience>('all');
  const [formTargetRoles, setFormTargetRoles] = useState<UserRole[]>([]);
  const [formTargetClassIds, setFormTargetClassIds] = useState<string[]>([]);
  const [formTargetStudentIds, setFormTargetStudentIds] = useState<string[]>([]);
  const [formExamName, setFormExamName] = useState("Rabee' Semester Examination 2026-27");
  const [formAcademicYear, setFormAcademicYear] = useState('2026-2027');
  const [formIsActive, setFormIsActive] = useState(true);

  // Student search in Quick Pick
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Filter cards by priority tabs
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all');

  // Confirmation dialog state (iframe-safe, zero window.confirm dependency)
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    type: 'delete_single' | 'delete_all' | 'reset_defaults';
    cardId?: string;
    cardTitle?: string;
  } | null>(null);

  const allCards = useMemo(() => {
    const cards = dbState.showcaseCards || [];
    return [...cards].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [dbState.showcaseCards]);

  const displayedCards = useMemo(() => {
    if (filterPriority === 'all') return allCards;
    return allCards.filter((c) => c.priority === filterPriority);
  }, [allCards, filterPriority]);

  // Filter enrolled students based on search query
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || '';
      return (
        s.name.toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        cls.toLowerCase().includes(q)
      );
    });
  }, [students, classes, studentSearchQuery]);

  const resetForm = () => {
    setFormPriority(1);
    setFormCategory('apex_topper');
    setFormTitle("Topper of the Rabee' Semester Examination 2026-27");
    setFormSubtitle('Institutional Highest Academic Honors');
    setFormStudentName('');
    setFormStudentAdmission('');
    setFormStudentId('');
    setFormPercentage('98%');
    setFormScoreDetails('Score: 490 / 500 • Rank #1');
    setFormSectionOrClass('Degree Department');
    setFormClassId('');
    setFormBadgeText('Apex Institutional Topper 🏆');
    setFormImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400');
    setFormDescription('Outstanding academic excellence across all semester curricula with straight A+ grades.');
    setFormAccent('gold');
    setFormTargetAudience('all');
    setFormTargetRoles([]);
    setFormTargetClassIds([]);
    setFormTargetStudentIds([]);
    setFormExamName("Rabee' Semester Examination 2026-27");
    setFormAcademicYear('2026-2027');
    setFormIsActive(true);
    setStudentSearchQuery('');
    setEditingCardId(null);
  };

  const handleSelectExistingStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    setFormStudentName(student.name);
    setFormStudentAdmission(student.admissionNumber);
    setFormStudentId(student.id);

    const cls = classes.find((c) => c.id === student.classId);
    if (cls) {
      setFormSectionOrClass(cls.name);
      setFormClassId(cls.id);
    }

    if (student.photoUrl) {
      setFormImageUrl(student.photoUrl);
    }
  };

  const startEditCard = (card: ShowcaseCard) => {
    setEditingCardId(card.id);
    setFormPriority(card.priority);
    setFormCategory(card.category);
    setFormTitle(card.title);
    setFormSubtitle(card.subtitle || '');
    setFormStudentName(card.studentName);
    setFormStudentAdmission(card.studentAdmissionNumber || '');
    setFormStudentId(card.studentId || '');
    setFormPercentage(card.percentage);
    setFormScoreDetails(card.scoreDetails || '');
    setFormSectionOrClass(card.sectionOrClass);
    setFormClassId(card.classId || '');
    setFormBadgeText(card.badgeText || '');
    setFormImageUrl(card.imageUrl || '');
    setFormDescription(card.description || '');
    setFormAccent(card.accentGradient || 'gold');
    setFormTargetAudience(card.targetAudience);
    setFormTargetRoles(card.targetRoles || []);
    setFormTargetClassIds(card.targetClassIds || []);
    setFormTargetStudentIds(card.targetStudentIds || []);
    setFormExamName(card.examName || "Rabee' Semester Examination 2026-27");
    setFormAcademicYear(card.academicYear || '2026-2027');
    setFormIsActive(card.isActive);
    setStudentSearchQuery('');
    setActiveTab('edit');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCardId) {
        const card = allCards.find((c) => c.id === initialCardId);
        if (card) {
          startEditCard(card);
          return;
        }
      }
      if (initialTab) {
        setActiveTab(initialTab);
        if (initialTab === 'create') resetForm();
      }
    }
  }, [isOpen, initialCardId, initialTab, allCards]);

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStudentName.trim() || !formPercentage.trim()) {
      setStatusMessage({ text: 'Please fill in Title, Student Name, and Percentage', type: 'error' });
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };

    if (activeTab === 'edit' && editingCardId) {
      dataService.updateShowcaseCard(
        editingCardId,
        {
          title: formTitle,
          subtitle: formSubtitle,
          studentName: formStudentName,
          studentAdmissionNumber: formStudentAdmission,
          studentId: formStudentId,
          percentage: formPercentage,
          scoreDetails: formScoreDetails,
          sectionOrClass: formSectionOrClass,
          classId: formClassId,
          category: formCategory,
          priority: formPriority,
          badgeText: formBadgeText,
          imageUrl: formImageUrl,
          description: formDescription,
          accentGradient: formAccent,
          targetAudience: formTargetAudience,
          targetRoles: formTargetRoles,
          targetClassIds: formTargetClassIds,
          targetStudentIds: formTargetStudentIds.length > 0 ? formTargetStudentIds : (formStudentId ? [formStudentId] : []),
          examName: formExamName,
          academicYear: formAcademicYear,
          isActive: formIsActive,
        },
        actor
      );
      setStatusMessage({ text: 'Showcase card updated successfully!', type: 'success' });
    } else {
      const order = allCards.filter((c) => c.priority === formPriority).length + 1;
      dataService.addShowcaseCard(
        {
          title: formTitle,
          subtitle: formSubtitle,
          studentName: formStudentName,
          studentAdmissionNumber: formStudentAdmission,
          studentId: formStudentId,
          percentage: formPercentage,
          scoreDetails: formScoreDetails,
          sectionOrClass: formSectionOrClass,
          classId: formClassId,
          category: formCategory,
          priority: formPriority,
          badgeText: formBadgeText,
          imageUrl: formImageUrl,
          description: formDescription,
          accentGradient: formAccent,
          targetAudience: formTargetAudience,
          targetRoles: formTargetRoles,
          targetClassIds: formTargetClassIds,
          targetStudentIds: formTargetStudentIds.length > 0 ? formTargetStudentIds : (formStudentId ? [formStudentId] : []),
          order,
          isActive: formIsActive,
          examName: formExamName,
          academicYear: formAcademicYear,
          createdBy: actor.id,
          createdByName: actor.name,
        },
        actor
      );
      setStatusMessage({ text: 'New showcase card published successfully!', type: 'success' });
    }

    resetForm();
    setActiveTab('cards');
    if (onSuccess) onSuccess();
  };

  const handleDeleteCard = (id: string, title: string) => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    const success = dataService.deleteShowcaseCard(id, actor);
    if (success) {
      setDbState({ ...dataService.getState() });
      setStatusMessage({ text: `Card "${title}" deleted successfully.`, type: 'success' });
      if (editingCardId === id) {
        resetForm();
        setActiveTab('cards');
      }
      if (onSuccess) onSuccess();
    }
    setActionConfirm(null);
  };

  const handleDeleteAllCards = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.deleteAllShowcaseCards(actor);
    setDbState({ ...dataService.getState() });
    resetForm();
    setActiveTab('cards');
    setStatusMessage({ text: 'All Spotlight & Topper cards have been deleted.', type: 'success' });
    if (onSuccess) onSuccess();
    setActionConfirm(null);
  };

  const handleResetToDefault = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.resetShowcaseCardsToDefault(actor);
    setDbState({ ...dataService.getState() });
    setStatusMessage({ text: 'Default topper slides restored successfully!', type: 'success' });
    if (onSuccess) onSuccess();
    setActionConfirm(null);
  };

  const handleToggleActive = (id: string) => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.toggleShowcaseCardActive(id, actor);
    setDbState({ ...dataService.getState() });
    if (onSuccess) onSuccess();
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const list = [...displayedCards];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };

    dataService.reorderShowcaseCards(
      list.map((c) => c.id),
      actor
    );
    setDbState({ ...dataService.getState() });
    if (onSuccess) onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div
      id="showcase-management-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="showcase-management-modal-dialog"
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Dashboard Spotlight & Toppers Hub
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Slide Manager
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure priority topper slides, ad cards, visibility rules, and class topper listings.
              </p>
            </div>
          </div>

          <button
            id="close-showcase-management-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('cards');
                resetForm();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Spotlight Cards ({allCards.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                resetForm();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Card
            </button>
            {activeTab === 'edit' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Editing Card
              </span>
            )}
          </div>

          {statusMessage && (
            <div
              className={`text-xs px-3 py-1 rounded-lg font-semibold animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-100/50 dark:bg-slate-950/40">
          {activeTab === 'cards' ? (
            <div>
              {/* Priority Filter Bar & Hub Management Actions */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterPriority('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      filterPriority === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All Priorities ({allCards.length})
                  </button>
                  <button
                    onClick={() => setFilterPriority(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 ${
                      filterPriority === 1
                        ? 'bg-amber-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <Trophy className="w-3 h-3" />
                    Priority 1: Apex Hero ({allCards.filter((c) => c.priority === 1).length})
                  </button>
                  <button
                    onClick={() => setFilterPriority(2)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 ${
                      filterPriority === 2
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    Priority 2: Section Slides ({allCards.filter((c) => c.priority === 2).length})
                  </button>
                  <button
                    onClick={() => setFilterPriority(3)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 ${
                      filterPriority === 3
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    Priority 3: Class Toppers ({allCards.filter((c) => c.priority === 3).length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionConfirm({ isOpen: true, type: 'reset_defaults' })}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Restore standard Rabee' semester examination demo topper slides"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Defaults
                  </button>
                  {allCards.length > 0 && (
                    <button
                      type="button"
                      id="delete-all-hub-cards-btn"
                      onClick={() => setActionConfirm({ isOpen: true, type: 'delete_all' })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Clear all added cards from the Spotlight & Toppers Hub"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All Hub Cards
                    </button>
                  )}
                </div>
              </div>

              {/* Cards List Table */}
              {displayedCards.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/50">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      No Spotlight Cards in Hub
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                      {allCards.length === 0
                        ? 'The Spotlight & Toppers Hub has been cleared. Add a new topper card or restore the institution defaults.'
                        : 'No cards match the selected priority filter.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setActiveTab('create');
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Topper Slide
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore Default Slides
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedCards.map((card, idx) => (
                  <div
                    key={card.id}
                    id={`showcase-mgmt-card-${card.id}`}
                    className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      card.isActive
                        ? 'border-slate-200 dark:border-slate-800 shadow-sm'
                        : 'border-dashed border-slate-300 dark:border-slate-700 opacity-65 bg-slate-50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Drag / Reorder Controls */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Move up in slide sequence"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === displayedCards.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Move down in slide sequence"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card Thumbnail */}
                      <div className="relative shrink-0">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.studentName}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center">
                            {card.studentName.charAt(0)}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black text-white ${
                            card.priority === 1
                              ? 'bg-amber-600'
                              : card.priority === 2
                              ? 'bg-indigo-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          P{card.priority}
                        </span>
                      </div>

                      {/* Card Meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              card.priority === 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : card.priority === 2
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {card.priority === 1
                              ? 'Priority 1 • Apex Hero'
                              : card.priority === 2
                              ? 'Priority 2 • Section Slide'
                              : 'Priority 3 • Class Topper'}
                          </span>

                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {card.percentage}
                          </span>

                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            • {card.sectionOrClass}
                          </span>

                          {card.targetAudience !== 'all' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                              Audience: {card.targetAudience}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {card.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          <strong>{card.studentName}</strong>
                          {card.studentAdmissionNumber && ` (Adm #${card.studentAdmissionNumber})`} •{' '}
                          {card.scoreDetails || card.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleToggleActive(card.id)}
                        className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          card.isActive
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                        title={card.isActive ? 'Active on dashboards' : 'Hidden from dashboards'}
                      >
                        {card.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">{card.isActive ? 'Active' : 'Hidden'}</span>
                      </button>

                      <button
                        onClick={() => startEditCard(card)}
                        className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Card"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        id={`delete-card-${card.id}-btn`}
                        onClick={() => setActionConfirm({ isOpen: true, type: 'delete_single', cardId: card.id, cardTitle: card.title })}
                        className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          ) : (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleSaveCard} className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {activeTab === 'edit' ? 'Edit Spotlight Topper Card' : 'Create Spotlight Topper Card'}
                </h3>

                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Slide Priority & Display Format *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormPriority(1);
                        setFormCategory('apex_topper');
                        setFormBadgeText('Apex Institutional Topper 🏆');
                        setFormAccent('gold');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formPriority === 1
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          Priority 1 • Apex Hero
                        </span>
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Grand, largest hero card shown first at the top of the dashboard.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormPriority(2);
                        setFormCategory('section_topper');
                        setFormBadgeText('Section Gold Medalist 🥇');
                        setFormAccent('emerald');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formPriority === 2
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          Priority 2 • Section Slide
                        </span>
                        <Award className="w-4 h-4 text-indigo-500" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Next slide in top banner (Secondary, Senior Secondary, Degree).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormPriority(3);
                        setFormCategory('class_topper');
                        setFormBadgeText('Class 1 Topper 🌟');
                        setFormAccent('sapphire');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formPriority === 3
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          Priority 3 • Class Topper
                        </span>
                        <Star className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Cataloged in the "See class toppers" interactive viewer (Class 1, etc).
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quick Student Selection with Live Search Bar */}
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Quick Pick Student from Enrolled Database (Optional)
                      </label>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {filteredStudents.length} of {students.length} students matched
                    </span>
                  </div>

                  {/* Live Student Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="quick-pick-student-search-input"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Search student by name, admission no, roll no, or class..."
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                    {studentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStudentSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                        title="Clear search query"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Select Option Dropdown */}
                  <div>
                    <select
                      id="quick-pick-student-select"
                      value={formStudentId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectExistingStudent(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- Choose enrolled student to auto-fill ({filteredStudents.length} available) --</option>
                      {filteredStudents.map((s) => {
                        const clsName = classes.find((c) => c.id === s.classId)?.name || 'General';
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} (Adm #{s.admissionNumber} • {clsName})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quick match suggestion chips when search query is active */}
                  {studentSearchQuery.trim() && filteredStudents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Quick select:</span>
                      {filteredStudents.slice(0, 6).map((s) => {
                        const clsName = classes.find((c) => c.id === s.classId)?.name || '';
                        const isSelected = formStudentId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectExistingStudent(s.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                          >
                            <span>{s.name}</span>
                            <span className="text-[10px] opacity-75 font-mono">#{s.admissionNumber}</span>
                            {clsName && <span className="text-[10px] opacity-60">({clsName})</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Selected Student indicator */}
                  {formStudentName && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Selected Student: <strong>{formStudentName}</strong>
                          {formStudentAdmission && ` (Adm #${formStudentAdmission})`}
                          {formSectionOrClass && ` • ${formSectionOrClass}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormStudentName('');
                          setFormStudentAdmission('');
                          setFormStudentId('');
                        }}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer shrink-0 ml-2"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                {/* Core Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Main Banner Title *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Topper of the Rabee' Semester Examination 2026-27"
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subtitle / Distinction Tag
                    </label>
                    <input
                      type="text"
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      placeholder="e.g. Grand Institutional Honors • Rabee' 2026-27"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      value={formStudentName}
                      onChange={(e) => setFormStudentName(e.target.value)}
                      placeholder="e.g. Zayd Ahmed Hudawi"
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admission Number
                    </label>
                    <input
                      type="text"
                      value={formStudentAdmission}
                      onChange={(e) => setFormStudentAdmission(e.target.value)}
                      placeholder="e.g. 2001"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Percentage / Grade Achieved *
                    </label>
                    <input
                      type="text"
                      value={formPercentage}
                      onChange={(e) => setFormPercentage(e.target.value)}
                      placeholder="e.g. 98.4% or 98%"
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Score Details / Marks Breakdown
                    </label>
                    <input
                      type="text"
                      value={formScoreDetails}
                      onChange={(e) => setFormScoreDetails(e.target.value)}
                      placeholder="e.g. Score: 492 / 500 • Rank #1"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Section or Class Name *
                    </label>
                    <input
                      type="text"
                      value={formSectionOrClass}
                      onChange={(e) => setFormSectionOrClass(e.target.value)}
                      placeholder="e.g. Degree Department, Secondary, Class 10-A, Class 1"
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ribbon Badge Text
                    </label>
                    <input
                      type="text"
                      value={formBadgeText}
                      onChange={(e) => setFormBadgeText(e.target.value)}
                      placeholder="e.g. Apex Institutional Topper 🏆"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Student Photo Upload & Accent Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <ImageUploadField
                      id="showcase-photo-upload"
                      label="Student Photo (Upload File or URL)"
                      value={formImageUrl}
                      onChange={(val) => setFormImageUrl(val)}
                      helperText="Photos are compressed and stored locally in browser storage & synced to cloud Firestore."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Accent Color Theme
                    </label>
                    <select
                      value={formAccent}
                      onChange={(e) => setFormAccent(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                    >
                      <option value="gold">Gold & Amber (Imperial Honors)</option>
                      <option value="emerald">Emerald Green (Distinct High Rank)</option>
                      <option value="sapphire">Sapphire Blue (Excellence Citation)</option>
                      <option value="violet">Violet & Purple (Degree Department)</option>
                      <option value="ruby">Ruby Red (Outstanding Achievement)</option>
                      <option value="amber">Warm Amber (Class Merit)</option>
                    </select>
                  </div>
                </div>

                {/* Target Audience (In selected and specific user login first dashboards) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Target Audience / Dashboard Visibility
                      </label>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Controls which user logins see this card on their dashboard
                    </span>
                  </div>

                  {/* Main Target Audience Select Option */}
                  <select
                    id="target-audience-select"
                    value={formTargetAudience}
                    onChange={(e) => setFormTargetAudience(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="all">All Users (Administrators, Teachers, and Students)</option>
                    <option value="students_only">Students Only (Student & Parent Dashboards)</option>
                    <option value="teachers_only">Faculty & Teachers Only</option>
                    <option value="admins_only">Portal Administrators & Super Admins Only</option>
                    <option value="teachers_and_students">Teachers & Students (Staff & Pupils)</option>
                    <option value="admins_and_teachers">Staff & Faculty (Admins & Teachers Only)</option>
                    <option value="specific_roles">Specific Assigned Roles...</option>
                    <option value="specific_classes">Specific Academic Classes...</option>
                    <option value="specific_student">Specific Individual Student (Personalized Banner)</option>
                  </select>

                  {/* Descriptive Scope Note */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formTargetAudience === 'all' && '✓ Visible on every user dashboard regardless of role or academic wing.'}
                    {formTargetAudience === 'students_only' && '✓ Visible exclusively on student dashboards upon login.'}
                    {formTargetAudience === 'teachers_only' && '✓ Visible only to logged-in teachers and academic faculty.'}
                    {formTargetAudience === 'admins_only' && '✓ Visible exclusively to administrative and management roles.'}
                    {formTargetAudience === 'teachers_and_students' && '✓ Visible to both teachers and students; hidden from portal administrators.'}
                    {formTargetAudience === 'admins_and_teachers' && '✓ Visible to administrative staff and teachers; hidden from students.'}
                    {formTargetAudience === 'specific_roles' && '✓ Choose exact designated user roles below.'}
                    {formTargetAudience === 'specific_classes' && '✓ Choose target classes below (students in these classes will see this slide).'}
                    {formTargetAudience === 'specific_student' && '✓ Displayed as an exclusive personal honor banner on the designated student’s first login.'}
                  </p>

                  {formTargetAudience === 'specific_roles' && (
                    <div className="pt-2 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">Select visible roles:</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTargetRoles(roles.map((r) => r.id as any))}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => setFormTargetRoles([])}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Dropdown selector for roles */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value as any;
                          if (val && !formTargetRoles.includes(val)) {
                            setFormTargetRoles([...formTargetRoles, val]);
                          }
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Add role from select list --</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id} disabled={formTargetRoles.includes(r.id as any)}>
                            {r.name} {formTargetRoles.includes(r.id as any) ? '(Added)' : ''}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {roles.map((r) => {
                          const isSelected = formTargetRoles.includes(r.id as any);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setFormTargetRoles(
                                  isSelected
                                    ? formTargetRoles.filter((id) => id !== (r.id as any))
                                    : [...formTargetRoles, r.id as any]
                                );
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {r.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formTargetAudience === 'specific_classes' && (
                    <div className="pt-2 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">Select visible classes:</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTargetClassIds(classes.map((c) => c.id))}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => setFormTargetClassIds([])}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Dropdown selector for classes */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !formTargetClassIds.includes(val)) {
                            setFormTargetClassIds([...formTargetClassIds, val]);
                          }
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Add class from select list --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id} disabled={formTargetClassIds.includes(c.id)}>
                            {c.name} {formTargetClassIds.includes(c.id) ? '(Added)' : ''}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {classes.map((c) => {
                          const isSelected = formTargetClassIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormTargetClassIds(
                                  isSelected
                                    ? formTargetClassIds.filter((id) => id !== c.id)
                                    : [...formTargetClassIds, c.id]
                                );
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formTargetAudience === 'specific_student' && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                        Choose Designated Student for Personalized Dashboard Spotlight:
                      </p>
                      <select
                        value={formStudentId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectExistingStudent(e.target.value);
                            setFormTargetStudentIds([e.target.value]);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">-- Select enrolled student from database --</option>
                        {students.map((s) => {
                          const clsName = classes.find((c) => c.id === s.classId)?.name || '';
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} (Adm #{s.admissionNumber} {clsName ? `• ${clsName}` : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Description Quote */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Congratulatory Message / Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Enter inspiring quotation or examination distinction citation..."
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="showcase-is-active-check"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="showcase-is-active-check" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Publish immediately and make visible on designated dashboards
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {activeTab === 'edit' && editingCardId && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionConfirm({
                        isOpen: true,
                        type: 'delete_single',
                        cardId: editingCardId,
                        cardTitle: formTitle,
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer flex items-center gap-1.5 mr-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete this Card
                  </button>
                )}

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('cards');
                      resetForm();
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-showcase-card-btn"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {activeTab === 'edit' ? 'Update Card' : 'Publish Spotlight Card'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* In-App Action Confirmation Dialog (Iframe Safe) */}
      {actionConfirm?.isOpen && (
        <div
          id="showcase-mgmt-confirm-dialog"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  actionConfirm.type === 'reset_defaults'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                }`}
              >
                {actionConfirm.type === 'reset_defaults' ? (
                  <RotateCcw className="w-6 h-6" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {actionConfirm.type === 'delete_single' && 'Delete Spotlight Card'}
                  {actionConfirm.type === 'delete_all' && 'Delete All Showcase Cards'}
                  {actionConfirm.type === 'reset_defaults' && 'Restore Default Toppers'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {actionConfirm.type === 'delete_single' && 'This action will immediately remove this card.'}
                  {actionConfirm.type === 'delete_all' && 'This will remove all spotlight banners from all dashboards.'}
                  {actionConfirm.type === 'reset_defaults' && "Restores the original Rabee' examination slides."}
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {actionConfirm.type === 'delete_single' && (
                <span>
                  Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{actionConfirm.cardTitle}"</strong>?
                </span>
              )}
              {actionConfirm.type === 'delete_all' && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ Are you sure you want to delete ALL cards from the Spotlight & Toppers Hub? This action cannot be undone.
                </span>
              )}
              {actionConfirm.type === 'reset_defaults' && (
                <span>
                  Restore default institution topper slides for the Rabee' Semester Examination?
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-mgmt-confirm-btn"
                type="button"
                onClick={() => setActionConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="execute-mgmt-confirm-btn"
                type="button"
                onClick={() => {
                  if (actionConfirm.type === 'delete_single' && actionConfirm.cardId) {
                    handleDeleteCard(actionConfirm.cardId, actionConfirm.cardTitle || 'Card');
                  } else if (actionConfirm.type === 'delete_all') {
                    handleDeleteAllCards();
                  } else if (actionConfirm.type === 'reset_defaults') {
                    handleResetToDefault();
                  }
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  actionConfirm.type === 'reset_defaults'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {actionConfirm.type === 'reset_defaults' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Yes, Restore Defaults
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {actionConfirm.type === 'delete_all' ? 'Yes, Delete All Cards' : 'Yes, Delete Card'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
