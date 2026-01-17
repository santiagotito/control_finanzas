import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { Loader2, Plus, Target, CheckCircle2 } from 'lucide-react';

const GoalsPage = () => {
    const { goals, addGoal, loading } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        color: '#6366f1' // Indigo-500 default
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const success = await addGoal(formData);
            if (success) {
                setShowForm(false);
                setFormData({ name: '', targetAmount: '', deadline: '', color: '#6366f1' });
            } else {
                alert("Error al crear meta");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Metas de Ahorro</h2>
                    <p className="text-gray-500">Visualiza y alcanza tus objetivos</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    {showForm ? 'Cancelar' : <><Plus size={20} /> Nueva Meta</>}
                </button>
            </header>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fadeIn mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">Nueva Meta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la Meta</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej. Pagar Universidad"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Monto Objetivo</label>
                            <input
                                type="number"
                                value={formData.targetAmount}
                                onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Límite</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                            <div className="flex gap-2 mt-1">
                                {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        className={`w-8 h-8 rounded-full border-2 ${formData.color === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Meta'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal, idx) => {
                    const progress = Math.min(100, (goal.MontoAhorrado / goal.MontoObjetivo) * 100);
                    return (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: goal.Color || '#6366f1' }}></div>
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <h3 className="font-bold text-gray-800 text-lg">{goal.Nombre}</h3>
                                {progress >= 100 && <CheckCircle2 className="text-emerald-500" size={24} />}
                            </div>

                            <div className="pl-2 space-y-4">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Ahorrado: <span className="font-bold text-gray-900">{formatCurrency(goal.MontoAhorrado)}</span></span>
                                    <span>Meta: {formatCurrency(goal.MontoObjetivo)}</span>
                                </div>

                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%`, backgroundColor: goal.Color || '#6366f1' }}
                                    ></div>
                                </div>

                                <div className="text-xs text-gray-400 text-right">
                                    {progress.toFixed(1)}% completado
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">Fecha límite: {goal.FechaLimite ? goal.FechaLimite.split('T')[0] : 'Sin fecha'}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {goals.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        <Target size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No tienes metas definidas aún.</p>
                        <p className="text-sm">¡Define un objetivo para empezar a ahorrar!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default GoalsPage;
