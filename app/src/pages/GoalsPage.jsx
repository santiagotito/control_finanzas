import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { Loader2, Plus, Target, CheckCircle2, Trash2, Edit, TrendingUp, DollarSign } from 'lucide-react';

const GoalsPage = () => {
    const { goals, addGoal, updateGoal, updateGoalFull, deleteGoal, loading } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [savingAmount, setSavingAmount] = useState({ id: null, amount: '' });

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        color: '#6366f1' // Indigo-500 default
    });

    const resetForm = () => {
        setShowForm(false);
        setEditingGoal(null);
        setFormData({ name: '', targetAmount: '', deadline: '', color: '#6366f1' });
    };

    const handleEdit = (goal) => {
        setEditingGoal(goal);
        setFormData({
            name: goal.Nombre,
            targetAmount: goal.MontoObjetivo,
            deadline: goal.FechaLimite ? goal.FechaLimite.split('T')[0] : '',
            color: goal.Color || '#6366f1'
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar esta meta?")) {
            await deleteGoal(id);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let success;
            if (editingGoal) {
                success = await updateGoalFull({ ...formData, id: editingGoal.ID });
            } else {
                success = await addGoal(formData);
            }

            if (success) {
                resetForm();
            } else {
                alert("Error al guardar meta");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddSaving = async (id) => {
        if (!savingAmount.amount || parseFloat(savingAmount.amount) <= 0) return;
        setSubmitting(true);
        try {
            const success = await updateGoal(id, parseFloat(savingAmount.amount));
            if (success) {
                setSavingAmount({ id: null, amount: '' });
            } else {
                alert("Error al registrar ahorro");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Metas de Ahorro</h2>
                    <p className="text-gray-500 text-sm">Visualiza y alcanza tus objetivos financieros</p>
                </div>
                <button
                    onClick={showForm ? resetForm : () => setShowForm(true)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium ${showForm ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'}`}
                >
                    {showForm ? 'Cancelar' : <><Plus size={20} /> Nueva Meta</>}
                </button>
            </header>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-indigo-50 animate-fadeIn mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                    <h3 className="font-bold text-gray-800 mb-4">{editingGoal ? 'Editar Meta' : 'Configurar Nueva Meta'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Nombre de la Meta</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej. Viaje a Europa, Casa propia..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Monto Objetivo</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="number"
                                    value={formData.targetAmount}
                                    onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                                    required
                                    placeholder="0,00"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Fecha Límite</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Color Distintivo</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-gray-600 ring-2 ring-offset-2 ring-gray-200' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        {editingGoal && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 rounded-lg font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Descartar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : editingGoal ? 'Actualizar Meta' : 'Crear Objetivo'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(goals || []).map((goal) => {
                    const progress = Math.min(100, (goal.MontoAhorrado / goal.MontoObjetivo) * 100);
                    const isSaving = savingAmount.id === goal.ID;

                    return (
                        <div key={goal.ID} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-all duration-300">
                            {/* Card Header */}
                            <div className="p-5 flex justify-between items-start border-b border-gray-50">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: goal.Color || '#6366f1' }}>
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{goal.Nombre}</h3>
                                        <p className="text-xs text-gray-400 font-medium">Límite: {goal.FechaLimite ? goal.FechaLimite.split('T')[0] : 'Sin fecha'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(goal)}
                                        className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Editar meta"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(goal.ID)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Eliminar meta"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-grow space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-tight">HAS AHORRADO</p>
                                        <p className="text-2xl font-black text-gray-900">{formatCurrency(goal.MontoAhorrado)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-tight">OBJETIVO</p>
                                        <p className="text-sm font-bold text-gray-600">{formatCurrency(goal.MontoObjetivo)}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="w-full bg-gray-100 rounded-full h-4 relative overflow-hidden p-0.5">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 flex items-center justify-end px-2"
                                            style={{ width: `${progress}%`, backgroundColor: goal.Color || '#6366f1' }}
                                        >
                                            {progress > 15 && <span className="text-[10px] text-white font-bold">{progress.toFixed(0)}%</span>}
                                        </div>
                                    </div>
                                    {progress <= 15 && <p className="text-[10px] text-gray-400 font-bold ml-1">{progress.toFixed(1)}% COMPLETADO</p>}
                                </div>

                                {progress >= 100 && (
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3 animate-bounce-subtle">
                                        <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                                        <p className="text-xs font-bold text-emerald-700">¡FELICIDADES! HAS ALCANZADO TU META</p>
                                    </div>
                                )}
                            </div>

                            {/* Card Action */}
                            <div className="px-5 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                                {isSaving ? (
                                    <div className="flex gap-2 animate-fadeIn">
                                        <input
                                            type="number"
                                            value={savingAmount.amount}
                                            onChange={e => setSavingAmount({ ...savingAmount, amount: e.target.value })}
                                            placeholder="Monto a sumar"
                                            autoFocus
                                            className="flex-grow px-3 py-1.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                        />
                                        <button
                                            onClick={() => handleAddSaving(goal.ID)}
                                            disabled={submitting}
                                            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                                        >
                                            Confirmar
                                        </button>
                                        <button
                                            onClick={() => setSavingAmount({ id: null, amount: '' })}
                                            className="text-gray-400 hover:text-gray-600 p-1.5"
                                        >
                                            X
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSavingAmount({ id: goal.ID, amount: '' })}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                    >
                                        <Plus size={14} /> Registrar Ahorro / Avance
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {(goals || []).length === 0 && !loading && (
                    <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
                            <Target size={40} />
                        </div>
                        <h3 className="font-bold text-gray-500 text-lg italic">"Un viaje de mil millas comienza con un solo paso"</h3>
                        <p className="text-sm mt-1">Todavía no has definido ninguna meta. ¡Añade una para empezar!</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-6 text-indigo-600 font-bold text-sm underline hover:text-indigo-800"
                        >
                            + Crear mi primera meta
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoalsPage;
