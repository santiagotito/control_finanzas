import React, { useState } from 'react';
import { useHabits } from '../context/HabitContext';
import { Plus, Check, Trash2, Calendar, Heart, Quote, TrendingUp, Award, ChevronLeft, ChevronRight, X, Pen } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';

const MonthlyObjectivesPage = () => {
    const {
        habits, gratitudeEntries, quotesEntries, actionLoading,
        addHabit, updateHabit, toggleHabitCompletion, deleteHabit,
        addGratitude, updateGratitude, deleteGratitude,
        addQuote, updateQuote, deleteQuote
    } = useHabits();

    const [activeTab, setActiveTab] = useState('objectives');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHabitId, setEditingHabitId] = useState(null);
    const [editingEntryId, setEditingEntryId] = useState(null);

    // --- STATE FOR HABIT FORM ---
    const [newHabit, setNewHabit] = useState({
        name: '',
        frequency: 'daily',
        days: [], // [0,1,2,3,4,5,6]
        color: 'indigo'
    });

    // --- STATE FOR GRATITUDE & QUOTES INPUT ---
    const [gratitudeInput, setGratitudeInput] = useState('');
    const [quoteInput, setQuoteInput] = useState('');
    const [quoteAuthor, setQuoteAuthor] = useState('');

    // --- HELPER FUNCTIONS ---
    const getStreak = (habit) => {
        let streak = 0;
        const today = new Date();
        // Set up for calculation
        const history = habit.history || {};
        const freq = habit.frequency;

        for (let i = 0; i < 365; i++) {
            const d = subDays(today, i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dayIdx = getDay(d);

            // Is this day applicable for this habit?
            let isApplicable = true;
            if (freq === 'weekdays' && (dayIdx === 0 || dayIdx === 6)) isApplicable = false;
            else if (freq === 'weekends' && (dayIdx !== 0 && dayIdx !== 6)) isApplicable = false;
            else if (freq.includes(',')) {
                const allowed = freq.split(',').map(Number);
                if (!allowed.includes(dayIdx)) isApplicable = false;
            }

            if (!isApplicable) continue; // Skip non-applicable days

            if (history[dStr]) {
                streak++;
            } else {
                // If the day is today and it's not done, we don't break the streak yet
                if (i === 0) continue;
                break;
            }
        }
        return streak;
    };

    const handleAddHabit = async (e) => {
        e.preventDefault();
        const freqValue = newHabit.frequency === 'custom' ? newHabit.days.join(',') : newHabit.frequency;
        const habitData = { ...newHabit, frequency: freqValue };

        try {
            if (editingHabitId) {
                await updateHabit({ id: editingHabitId, ...habitData });
            } else {
                await addHabit(habitData);
            }
            setNewHabit({ name: '', frequency: 'daily', days: [], color: 'indigo' });
            setEditingHabitId(null);
            setShowAddModal(false);
        } catch (error) {
            console.error("Error saving habit:", error);
        }
    };

    const openEditModal = (habit) => {
        let freq = habit.frequency;
        let days = [];
        if (habit.frequency.includes(',')) {
            freq = 'custom';
            days = habit.frequency.split(',').map(Number);
        } else {
            freq = habit.frequency;
        }

        setNewHabit({
            name: habit.name,
            frequency: freq,
            days: days,
            color: habit.color
        });
        setEditingHabitId(habit.id);
        setShowAddModal(true);
    };

    const handleAddGratitude = async (e) => {
        e.preventDefault();
        if (!gratitudeInput.trim()) return;
        try {
            if (editingEntryId) {
                await updateGratitude(editingEntryId, gratitudeInput);
                setEditingEntryId(null);
            } else {
                await addGratitude(gratitudeInput);
            }
            setGratitudeInput('');
        } catch (error) {
            console.error("Error saving gratitude:", error);
        }
    };

    const handleAddQuote = async (e) => {
        e.preventDefault();
        if (!quoteInput.trim()) return;
        try {
            if (editingEntryId) {
                await updateQuote(editingEntryId, quoteInput, quoteAuthor);
                setEditingEntryId(null);
            } else {
                await addQuote(quoteInput, quoteAuthor);
            }
            setQuoteInput('');
            setQuoteAuthor('');
        } catch (error) {
            console.error("Error saving quote:", error);
        }
    };

    const startEditEntry = (entry, type) => {
        setEditingEntryId(entry.id);
        if (type === 'gratitude') {
            setGratitudeInput(entry.text);
        } else {
            setQuoteInput(entry.text);
            setQuoteAuthor(entry.author || '');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- RENDER SECTIONS ---

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* HERDER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-indigo-700">
                        Crecimiento Personal
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión de hábitos y bienestar diario.</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setActiveTab('objectives')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'objectives' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calendar size={18} /> Objetivos
                    </button>
                    <button
                        onClick={() => setActiveTab('gratitude')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'gratitude' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Heart size={18} /> Agradecimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('quotes')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'quotes' ? 'bg-amber-50 text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Quote size={18} /> Frases
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[500px]">
                {activeTab === 'objectives' && (
                    <ObjectivesSection
                        habits={habits}
                        onToggle={toggleHabitCompletion}
                        onDelete={deleteHabit}
                        onEdit={openEditModal}
                        onAdd={() => {
                            setNewHabit({ name: '', frequency: 'daily', days: [], color: 'indigo' });
                            setEditingHabitId(null);
                            setShowAddModal(true);
                        }}
                        getStreak={getStreak}
                        actionLoading={actionLoading}
                    />
                )}

                {activeTab === 'gratitude' && (
                    <GratitudeSection
                        entries={gratitudeEntries}
                        input={gratitudeInput}
                        setInput={setGratitudeInput}
                        onAdd={handleAddGratitude}
                        onEdit={e => startEditEntry(e, 'gratitude')}
                        onDelete={deleteGratitude}
                        isEditing={!!editingEntryId}
                        cancelEdit={() => { setEditingEntryId(null); setGratitudeInput(''); }}
                        actionLoading={actionLoading}
                    />
                )}

                {activeTab === 'quotes' && (
                    <QuotesSection
                        entries={quotesEntries}
                        input={quoteInput}
                        setInput={setQuoteInput}
                        authorInput={quoteAuthor}
                        setAuthorInput={setQuoteAuthor}
                        onAdd={handleAddQuote}
                        onEdit={e => startEditEntry(e, 'quote')}
                        onDelete={deleteQuote}
                        isEditing={!!editingEntryId}
                        cancelEdit={() => { setEditingEntryId(null); setQuoteInput(''); setQuoteAuthor(''); }}
                        actionLoading={actionLoading}
                    />
                )}
            </div>

            {/* MODAL ADD HABIT */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingHabitId ? 'Editar Objetivo' : 'Nuevo Objetivo / Hábito'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddHabit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre el Objetivo</label>
                                <input
                                    type="text"
                                    required
                                    value={newHabit.name}
                                    onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
                                    placeholder="Ej. Leer 30 minutos, Correr..."
                                    className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {[
                                        { id: 'daily', label: 'Diario' },
                                        { id: 'weekdays', label: 'Lun-Vie' },
                                        { id: 'weekends', label: 'Fin de Sem' },
                                        { id: 'custom', label: 'Personalizado' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setNewHabit({ ...newHabit, frequency: opt.id, days: opt.id === 'custom' && newHabit.days.length === 0 ? [1, 2, 3, 4, 5] : newHabit.days })}
                                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${newHabit.frequency === opt.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {newHabit.frequency === 'custom' && (
                                    <div className="flex justify-between gap-1 p-2 bg-gray-50 rounded-xl border border-gray-100">
                                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => {
                                            const isSelected = newHabit.days.includes(idx);
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = isSelected
                                                            ? newHabit.days.filter(d => d !== idx)
                                                            : [...newHabit.days, idx];
                                                        setNewHabit({ ...newHabit, days: next });
                                                    }}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-black flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-sm scale-110' : 'bg-white text-gray-300 hover:text-gray-500'}`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <div className="flex gap-2">
                                    {['indigo', 'rose', 'emerald', 'amber', 'sky', 'slate'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewHabit({ ...newHabit, color: c })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${newHabit.color === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: getColorHex(c) }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading.type === 'addHabit' || actionLoading.type === 'updateHabit'}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-slate-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:shadow-xl hover:translate-y-[-2px] transition-all mt-4 disabled:opacity-50"
                            >
                                {actionLoading.type === 'addHabit' ? 'CREANDO...' : actionLoading.type === 'updateHabit' ? 'ACTUALIZANDO...' : editingHabitId ? 'GUARDAR CAMBIOS' : 'CREAR OBJETIVO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB COMPONENTS ---

const ObjectivesSection = ({ habits, onToggle, onDelete, onEdit, onAdd, getStreak, actionLoading }) => {
    // Generate dates for current view (last 5 days + today + next 1 day) or just this week
    // Let's show a sliding 7-day window ending today
    const today = new Date();
    const daysToShow = 7;
    const dates = Array.from({ length: daysToShow }, (_, i) => subDays(today, (daysToShow - 1) - i));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* STATUS CARD */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-indigo-100 font-medium">Objetivos Activos</p>
                            <h3 className="text-4xl font-bold mt-1">{habits.length}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <TrendingUp className="text-white" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-indigo-100">
                        ¡Mantén la constancia para ver resultados!
                    </div>
                </div>

                {/* ADD CARD */}
                <button
                    onClick={onAdd}
                    className="group flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 cursor-pointer h-full min-h-[160px]"
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-3">
                        <Plus size={24} />
                    </div>
                    <span className="font-semibold text-gray-600 group-hover:text-indigo-700">Nuevo Objetivo</span>
                </button>
            </div>

            {/* HABITS LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Objetivo</th>
                                {dates.map(date => (
                                    <th key={date.toString()} className="px-2 py-4 text-center min-w-[50px]">
                                        <div className={`flex flex-col items-center ${isSameDay(date, today) ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                                            <span className="text-[10px] uppercase">{format(date, 'EEE', { locale: es })}</span>
                                            <span className="text-lg">{format(date, 'd')}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Racha</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {habits.length === 0 && (
                                <tr>
                                    <td colSpan={daysToShow + 3} className="px-6 py-12 text-center text-gray-400">
                                        No tienes objetivos aún. ¡Crea uno para empezar!
                                    </td>
                                </tr>
                            )}
                            {habits.map(habit => {
                                const streak = getStreak(habit);
                                const isDeleting = actionLoading.type === 'deleteHabit' && String(actionLoading.id) === String(habit.id);
                                const isUpdating = actionLoading.type === 'updateHabit' && String(actionLoading.id) === String(habit.id);

                                return (
                                    <tr key={habit.id} className={`hover:bg-gray-50 transition-colors relative ${isDeleting ? 'opacity-40 grayscale' : ''}`}>
                                        <td className="px-6 py-4 relative">
                                            {isDeleting && (
                                                <div className="absolute inset-y-0 left-0 w-1 bg-red-500 animate-pulse" />
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getColorHex(habit.color) }} />
                                                <span className={`font-medium ${isDeleting ? 'text-gray-400' : 'text-gray-800'}`}>
                                                    {habit.name}
                                                    {isUpdating && <span className="ml-2 text-[10px] text-indigo-500 animate-pulse uppercase font-black">Actualizando...</span>}
                                                    {isDeleting && <span className="ml-2 text-[10px] text-red-500 animate-pulse uppercase font-black">Eliminando...</span>}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 ml-6">
                                                {getFrequencyLabel(habit.frequency)}
                                            </div>
                                        </td>
                                        {dates.map(date => {
                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const isDone = habit.history[dateStr];
                                            const isFuture = date > today;
                                            const isToggling = actionLoading.type === 'toggleHabit' && String(actionLoading.id) === String(habit.id + dateStr);

                                            // Check valid days
                                            let isApplicable = true;
                                            const day = getDay(date); // 0 sun, 6 sat
                                            if (habit.frequency === 'weekdays' && (day === 0 || day === 6)) isApplicable = false;
                                            else if (habit.frequency === 'weekends' && (day !== 0 && day !== 6)) isApplicable = false;
                                            else if (habit.frequency.includes(',')) {
                                                const allowedDays = habit.frequency.split(',').map(Number);
                                                if (!allowedDays.includes(day)) isApplicable = false;
                                            }

                                            return (
                                                <td key={dateStr} className="px-2 py-4 text-center">
                                                    {!isFuture && isApplicable ? (
                                                        <button
                                                            onClick={() => onToggle(habit.id, dateStr)}
                                                            disabled={isDeleting || isToggling}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isDone
                                                                ? `shadow-sm scale-110`
                                                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200 scale-90'
                                                                } ${isToggling ? 'animate-spin opacity-50' : ''}`}
                                                            style={isDone ? { backgroundColor: getColorHex(habit.color), color: '#fff' } : {}}
                                                        >
                                                            {isToggling ? (
                                                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                                            ) : (
                                                                <Check size={16} strokeWidth={3} />
                                                            )}
                                                        </button>
                                                    ) : !isFuture && !isApplicable ? (
                                                        <div className="w-1.5 h-1.5 bg-gray-100 rounded-full mx-auto" />
                                                    ) : (
                                                        <div className="w-8 h-8 mx-auto" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-orange-500 font-bold">
                                                <span className="text-lg">{streak}</span>
                                                <span className="text-xs">días</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onEdit(habit)}
                                                    disabled={isDeleting || isUpdating}
                                                    className="p-2 text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-20"
                                                >
                                                    <Pen size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('¿Borrar hábito?')) onDelete(habit.id) }}
                                                    disabled={isDeleting}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-20"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const GratitudeSection = ({ entries, input, setInput, onAdd, onEdit, onDelete, isEditing, cancelEdit, actionLoading }) => {
    const isAdding = actionLoading.type === 'addGratitude';
    const isUpdating = actionLoading.type === 'updateGratitude';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800 p-8 rounded-[2rem] shadow-xl text-white h-fit sticky top-8 border-t-8 border-indigo-500">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-white/10 rounded-2xl">
                        <Heart size={24} className="text-white" fill="white" />
                    </div>
                    <h2 className="text-2xl font-black italic tracking-tight">Gratitud Diaria</h2>
                </div>

                <form onSubmit={onAdd} className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                        ¿Qué te hizo sonreír hoy?
                    </label>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="w-full h-40 p-5 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-indigo-400 outline-none resize-none transition-all text-white placeholder:text-slate-500 font-medium"
                        placeholder="Escribe aquí tu pensamiento..."
                        disabled={isAdding || isUpdating}
                    ></textarea>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={!input.trim() || isAdding || isUpdating}
                            className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed uppercase text-sm tracking-widest"
                        >
                            {isAdding ? 'Guardando...' : isUpdating ? 'Actualizando...' : isEditing ? 'Actualizar' : 'Guardar Reflexión'}
                        </button>
                        {isEditing && !isUpdating && (
                            <button type="button" onClick={cancelEdit} className="px-4 bg-slate-700 text-white rounded-2xl hover:bg-slate-600"><X size={20} /></button>
                        )}
                    </div>
                </form>

                <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                        "El agradecimiento fortalece el espíritu y aclara la mente. Es el hábito de los ganadores."
                    </p>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest pl-1">Historial de Gratitud</h3>
                    <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-md">{entries.length} ENTRADAS</span>
                </div>

                {entries.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-100">
                        <Heart size={48} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Aún no has registrado nada hoy.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entries.map(entry => {
                            const isDeleting = actionLoading.type === 'deleteGratitude' && actionLoading.id === entry.id;
                            return (
                                <div key={entry.id} className={`bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${isDeleting ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-800" />
                                    {isDeleting && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 animate-pulse">Eliminando...</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            {format(parseDateSafe(entry.date), "dd MMM yyyy", { locale: es })}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(entry)} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"><Pen size={12} /></button>
                                            <button onClick={() => onDelete(entry.id)} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 font-medium leading-relaxed italic">
                                        "{entry.text}"
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const QuotesSection = ({ entries, input, setInput, authorInput, setAuthorInput, onAdd, onEdit, onDelete, isEditing, cancelEdit, actionLoading }) => {
    const isAdding = actionLoading.type === 'addQuote';
    const isUpdating = actionLoading.type === 'updateQuote';

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-50">
                <div className="bg-amber-500 p-12 text-center text-white relative overflow-hidden">
                    <Quote size={200} className="absolute -top-10 -left-10 opacity-10 rotate-12" />
                    <Quote size={200} className="absolute -bottom-10 -right-10 opacity-10 rotate-12" />
                    <h2 className="text-4xl font-black relative z-10 italic uppercase tracking-tighter">Sabiduría Coleccionada</h2>
                    <p className="text-amber-100 relative z-10 mt-2 font-bold opacity-80">Frases que definen tu camino.</p>
                </div>
                <div className="p-12">
                    <form onSubmit={onAdd} className="space-y-6">
                        <div className="relative">
                            <Quote size={32} className="absolute -left-8 -top-4 text-gray-100" />
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="w-full text-center text-3xl font-serif italic p-4 border-none focus:ring-0 placeholder:text-gray-200 text-gray-800 resize-none bg-transparent"
                                placeholder='"La mejor forma de predecir el futuro es creándolo..."'
                                rows={3}
                                disabled={isAdding || isUpdating}
                            ></textarea>
                            <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent w-full"></div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <input
                                type="text"
                                value={authorInput}
                                onChange={e => setAuthorInput(e.target.value)}
                                className="text-center text-lg font-black uppercase tracking-[0.3em] text-gray-400 border-none focus:ring-0 placeholder:text-gray-100 w-full"
                                placeholder="- NOMBRE DEL AUTOR -"
                                disabled={isAdding || isUpdating}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isAdding || isUpdating}
                                    className="px-12 py-4 bg-gray-900 text-white rounded-full font-black text-sm hover:scale-105 transition-all disabled:opacity-30 uppercase tracking-widest shadow-xl"
                                >
                                    {isAdding ? 'GUARDANDO...' : isUpdating ? 'ACTUALIZANDO...' : isEditing ? 'ACTUALIZAR FRASE' : 'GUARDAR EN MI COLECCIÓN'}
                                </button>
                                {isEditing && !isUpdating && (
                                    <button type="button" onClick={cancelEdit} className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"><X size={20} /></button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-px bg-gray-200 flex-1" />
                    <h3 className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px]">Tus Inspiraciones</h3>
                    <div className="h-px bg-gray-200 flex-1" />
                </div>

                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {entries.map(entry => {
                        const isDeleting = actionLoading.type === 'deleteQuote' && actionLoading.id === entry.id;
                        return (
                            <div key={entry.id} className={`break-inside-avoid bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-1 group relative overflow-hidden ${isDeleting ? 'opacity-50 grayscale' : ''}`}>
                                {isDeleting && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 animate-pulse">Eliminando...</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-6">
                                    <Quote size={28} className="text-amber-500 fill-amber-50" />
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(entry)} disabled={isDeleting} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Pen size={14} /></button>
                                        <button onClick={() => onDelete(entry.id)} disabled={isDeleting} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <p className="text-xl font-serif text-gray-800 leading-snug italic mb-10">
                                    {entry.text}
                                </p>
                                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b-2 border-amber-500 pb-1">
                                        {entry.author || 'Anónimo'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-200">
                                        {format(parseDateSafe(entry.date), 'dd/MM/yyyy')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- UTILS ---

const parseDateSafe = (dateInput) => {
    try {
        if (!dateInput) return new Date();
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return new Date();
        return d;
    } catch (e) {
        return new Date();
    }
};

const getColorHex = (name) => {
    const colors = {
        indigo: '#4f46e5',
        rose: '#e11d48',
        emerald: '#059669',
        amber: '#d97706',
        sky: '#0284c7',
        slate: '#475569'
    };
    return colors[name] || colors.indigo;
};

const getColorText = (name) => {
    return `text-${name}-600`;
};

const getFrequencyLabel = (freq) => {
    if (!freq) return 'No definido';
    if (freq === 'daily') return 'Todos los días';
    if (freq === 'weekdays') return 'Lun a Vie';
    if (freq === 'weekends') return 'Fines de semana';
    if (freq.includes(',')) {
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const selected = freq.split(',').map(Number).map(d => days[d]);
        return selected.join(', ');
    }
    return freq;
};

export default MonthlyObjectivesPage;
