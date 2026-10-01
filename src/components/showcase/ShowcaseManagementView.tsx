import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Sparkles,
  Award,
  Star,
  Trash2,
  Edit2,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Users,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { DashboardShowcaseBanner } from './DashboardShowcaseBanner';
import { ShowcaseManagementModal } from './ShowcaseManagementModal';
import { dataService } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import type { ShowcaseCard } from '../../types';

export const ShowcaseManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const [dbState, setDbState] = useState(() => dataService.getState());

  useEffect(() => {
    return dataService.subscribe(() => {
      setDbState({ ...dataService.getState() });
    });
  }, []);

  const allCards = useMemo(() => {
    const cards = dbState.showcaseCards || [];
    return [...cards].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [dbState.showcaseCards]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialCardId, setModalInitialCardId] = useState<string | undefined>(undefined);
  const [modalInitialTab, setModalInitialTab] = useState<'cards' | 'create' | 'edit'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // In-App Confirmation state (iframe-safe, zero window.confirm dependency)
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    type: 'delete_single' | 'delete_all' | 'reset_defaults';
    card?: ShowcaseCard;
  } | null>(null);

  // Filtered cards
  const filteredCards = useMemo(() => {
    let list = allCards;
    if (filterPriority !== 'all') {
      list = list.filter((c) => c.priority === filterPriority);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.studentName?.toLowerCase().includes(q) ||
          c.studentAdmissionNumber?.toLowerCase().includes(q) ||
          c.sectionOrClass?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allCards, filterPriority, searchQuery]);

  const p1Count = allCards.filter((c) => c.priority === 1).length;
  const p2Count = allCards.filter((c) => c.priority === 2).length;
  const p3Count = allCards.filter((c) => c.priority === 3).length;

  const handleOpenCreate = () => {
    setModalInitialCardId(undefined);
    setModalInitialTab('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cardId: string) => {
    setModalInitialCardId(cardId);
    setModalInitialTab('edit');
    setIsModalOpen(true);
  };

  const handleDeleteCard = (card: ShowcaseCard) => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.deleteShowcaseCard(card.id, actor);
    setDbState({ ...dataService.getState() });
    setStatusMessage(`Deleted slide "${card.title}".`);
    setTimeout(() => setStatusMessage(null), 3000);
    setActionConfirm(null);
  };

  const handleDeleteAllHubCards = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.deleteAllShowcaseCards(actor);
    setDbState({ ...dataService.getState() });
    setStatusMessage('All Spotlight & Topper cards have been deleted.');
    setTimeout(() => setStatusMessage(null), 3500);
    setActionConfirm(null);
  };

  const handleResetToDefault = () => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.resetShowcaseCardsToDefault(actor);
    setDbState({ ...dataService.getState() });
    setStatusMessage('Default topper slides restored successfully!');
    setTimeout(() => setStatusMessage(null), 3500);
    setActionConfirm(null);
  };

  const handleToggleActive = (id: string) => {
    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : { id: 'admin', name: 'Administrator', role: 'super_admin' };
    dataService.toggleShowcaseCardActive(id, actor);
    setDbState({ ...dataService.getState() });
  };

  const getTargetAudienceLabel = (target: string) => {
    switch (target) {
      case 'all':
        return 'All Dashboards';
      case 'students_only':
        return 'Students Only';
      case 'teachers_only':
        return 'Teachers Only';
      case 'teachers_and_students':
        return 'Teachers & Students';
      case 'admins_and_teachers':
        return 'Staff & Teachers';
      case 'specific_class':
        return 'Target Classes';
      case 'specific_student':
        return 'Specific Student';
      default:
        return target;
    }
  };

  return (
    <div id="showcase-management-view" className="space-y-8">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header Banner Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            Spotlight & Toppers Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure examination toppers, hero spotlight ads, and audience visibility for login dashboards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            id="hub-restore-defaults-btn"
            onClick={() => setActionConfirm({ isOpen: true, type: 'reset_defaults' })}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Restore standard Rabee' semester examination demo slides"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Defaults
          </button>

          {allCards.length > 0 && (
            <button
              type="button"
              id="hub-delete-all-btn"
              onClick={() => setActionConfirm({ isOpen: true, type: 'delete_all' })}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Delete all spotlight and topper cards"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Hub Cards
            </button>
          )}

          <button
            type="button"
            id="hub-add-topper-btn"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Topper Slide
          </button>
        </div>
      </div>

      {/* Live Preview Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Live Dashboard Preview
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Interactive preview showing how cards render to logged-in users
          </span>
        </div>
        <DashboardShowcaseBanner />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterPriority(1)}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-sm ${
            filterPriority === 1
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold mb-3">
            <Trophy className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Priority 1: Apex Hero
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grandest institutional topper card shown first with radiant gold framing and high prominence.
          </p>
          <div className="mt-3 text-xs font-bold text-amber-600 flex items-center justify-between">
            <span>{p1Count} Active Slide(s)</span>
            {filterPriority === 1 && <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">Filtering</span>}
          </div>
        </div>

        <div
          onClick={() => setFilterPriority(2)}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-sm ${
            filterPriority === 2
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Priority 2: Section Slides
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sequential rotating slides for Secondary, Senior Secondary, and Degree Department distinctions.
          </p>
          <div className="mt-3 text-xs font-bold text-indigo-600 flex items-center justify-between">
            <span>{p2Count} Section Slide(s)</span>
            {filterPriority === 2 && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md">Filtering</span>}
          </div>
        </div>

        <div
          onClick={() => setFilterPriority(3)}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-sm ${
            filterPriority === 3
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold mb-3">
            <Star className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Priority 3: Class Toppers
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cataloged in the interactive modal drawer accessible via the "See Class Toppers" banner ribbon.
          </p>
          <div className="mt-3 text-xs font-bold text-emerald-600 flex items-center justify-between">
            <span>{p3Count} Class Record(s)</span>
            {filterPriority === 3 && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">Filtering</span>}
          </div>
        </div>
      </div>

      {/* Hub Inventory Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Spotlight Cards Inventory ({allCards.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage, edit, reorder, or delete individual cards published across institutional dashboards.
            </p>
          </div>

          {/* Search & Priority Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, student, class..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPriority === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPriority(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPriority === 1
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                P1 Hero
              </button>
              <button
                onClick={() => setFilterPriority(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPriority === 2
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                P2 Section
              </button>
              <button
                onClick={() => setFilterPriority(3)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPriority === 3
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                P3 Class
              </button>
            </div>
          </div>
        </div>

        {/* Cards Table / List */}
        {filteredCards.length === 0 ? (
          <div className="rounded-2xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {allCards.length === 0 ? 'Spotlight & Toppers Hub is Empty' : 'No matching cards found'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {allCards.length === 0
                  ? 'All cards have been deleted. You can create a new student celebration card or restore the institution defaults.'
                  : 'Try clearing your search query or switching priority filters.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Topper Slide
              </button>
              {allCards.length === 0 && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Defaults
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                id={`inventory-card-${card.id}`}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  card.isActive
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar / Photo */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-white font-black text-sm shadow-sm ${
                        card.priority === 1
                          ? 'ring-2 ring-amber-400 bg-gradient-to-tr from-amber-600 to-yellow-500'
                          : card.priority === 2
                          ? 'ring-2 ring-indigo-400 bg-gradient-to-tr from-indigo-600 to-blue-500'
                          : 'ring-1 ring-emerald-400 bg-gradient-to-tr from-emerald-600 to-teal-500'
                      }`}
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.studentName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        card.studentName.charAt(0)
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          card.priority === 1
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : card.priority === 2
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {card.priority === 1
                          ? 'P1 Apex Hero'
                          : card.priority === 2
                          ? 'P2 Section Slide'
                          : 'P3 Class Topper'}
                      </span>

                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {getTargetAudienceLabel(card.targetAudience)}
                      </span>

                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {card.percentage}%
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                      {card.title}
                    </h4>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {card.studentName}
                      </span>
                      {card.studentAdmissionNumber && (
                        <span>• Adm: {card.studentAdmissionNumber}</span>
                      )}
                      <span>• {card.sectionOrClass}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
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
                    type="button"
                    onClick={() => handleOpenEdit(card.id)}
                    className="p-2 text-slate-600 hover:text-indigo-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Topper Slide"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    id={`view-delete-card-${card.id}-btn`}
                    onClick={() => setActionConfirm({ isOpen: true, type: 'delete_single', card })}
                    className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    title="Delete Topper Slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ShowcaseManagementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialCardId={modalInitialCardId}
          initialTab={modalInitialTab}
        />
      )}

      {/* In-App Action Confirmation Dialog (Iframe Safe) */}
      {actionConfirm?.isOpen && (
        <div
          id="showcase-view-confirm-dialog"
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
                  {actionConfirm.type === 'delete_single' && 'Delete Topper Slide'}
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
              {actionConfirm.type === 'delete_single' && actionConfirm.card && (
                <span>
                  Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{actionConfirm.card.title}"</strong> ({actionConfirm.card.studentName})?
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
                id="cancel-view-confirm-btn"
                type="button"
                onClick={() => setActionConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="execute-view-confirm-btn"
                type="button"
                onClick={() => {
                  if (actionConfirm.type === 'delete_single' && actionConfirm.card) {
                    handleDeleteCard(actionConfirm.card);
                  } else if (actionConfirm.type === 'delete_all') {
                    handleDeleteAllHubCards();
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
