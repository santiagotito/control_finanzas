import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { RefreshCw, Plus, Save, Trash2, Calendar, Loader2, Edit } from 'lucide-react';

const RecurringRulesPage = () => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // New Category State
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const { recurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule, accounts, settings, loading, addCategory } = useAppContext();

    const [formData, setFormData] = useState({
        name: '',
        type: 'Gasto',
        amount: '',
        category: '',
        account: '',
        frequency: 'Mensual',
        executionDay: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let success;
            if (editingId) {
                success = await updateRecurringRule({ ...formData, id: editingId });
            } else {
                success = await addRecurringRule(formData);
            }

            if (success) {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                    name: '', type: 'Gasto', amount: '', category: '', account: '',
                    frequency: 'Mensual', executionDay: '', startDate: new Date().toISOString().split('T')[0], endDate: ''
                });
            } else {
                alert("Error al guardar regla");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar esta regla recurrente? Las transacciones ya creadas no se borrarán.")) {
            await deleteRecurringRule(id);
        }
    };

    const handleEdit = (rule) => {
        setFormData({
            name: rule.Nombre,
            type: rule.Tipo,
            amount: rule.Monto,
            category: rule.Categoria,
            account: rule.Cuenta,
            frequency: rule.Frecuencia,
            executionDay: rule.DiaEjecucion,
            startDate: rule.FechaInicio ? rule.FechaInicio.split('T')[0] : '',
            endDate: rule.FechaFin ? rule.FechaFin.split('T')[0] : ''
        });
        setEditingId(rule.ID);
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: '', type: 'Gasto', amount: '', category: '', account: '',
            frequency: 'Mensual', executionDay: '', startDate: new Date().toISOString().split('T')[0], endDate: ''
        });
    };

    // Calculate End Date based on Limit
    const handleInstallmentsChange = (e) => {
        const months = parseInt(e.target.value);
        if (months && months > 0 && formData.startDate) {
            const start = new Date(formData.startDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + months);
            setFormData({ ...formData, endDate: end.toISOString().split('T')[0] });
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setSubmitting(true);
        const success = await addCategory(formData.type, newCategoryName);
        if (success) {
            setFormData({ ...formData, category: newCategoryName }); // Seleccionar la nueva
            setIsAddingCategory(false);
            setNewCategoryName('');
        } else {
            alert("Error al crear categoría");
        }
        setSubmitting(false);
    };

    // Filtros para selects
    const categories = settings.filter(s => s.Tipo === formData.type);
    const accountNames = accounts.map(a => a.Nombre);

    // Cálculos de Resumen
    const totalMonthlyFixed = recurringRules
        .filter(r => r.Tipo === 'Gasto' && r.Frecuencia === 'Mensual')
        .reduce((sum, r) => sum + parseFloat(r.Monto), 0);

    const totalIncomeFixed = recurringRules
        .filter(r => r.Tipo === 'Ingreso' && r.Frecuencia === 'Mensual')
        .reduce((sum, r) => sum + parseFloat(r.Monto), 0);

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-800">Deudas y Pagos Recurrentes</h2>
                <p className="text-gray-500">Administra tus créditos, suscripciones y salarios</p>
            </header>

            {/* Resumen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 font-medium uppercase">Total Gastos Fijos (Mes)</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(totalMonthlyFixed)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium uppercase">Total Ingresos Fijos (Mes)</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalIncomeFixed)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${totalIncomeFixed - totalMonthlyFixed >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                    <p className={`text-xs font-medium uppercase ${totalIncomeFixed - totalMonthlyFixed >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Balance Estimado (Mes)</p>
                    <p className={`text-2xl font-bold ${totalIncomeFixed - totalMonthlyFixed >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                        {formatCurrency(totalIncomeFixed - totalMonthlyFixed)}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <h3 className="font-bold text-gray-700">Tus Reglas</h3>
                <button
                    onClick={showForm ? resetForm : () => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    {showForm ? 'Cancelar' : <><Plus size={20} /> Nuevo Crédito / Recurrente</>}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fadeIn space-y-4">
                    <h3 className="font-bold text-gray-800">{editingId ? 'Editar Regla' : 'Nueva Regla Recurrente'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo */}
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={formData.type === 'Gasto'} onChange={() => setFormData({ ...formData, type: 'Gasto' })} />
                                <span className="text-sm font-medium text-gray-700">Gasto / Deuda</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={formData.type === 'Ingreso'} onChange={() => setFormData({ ...formData, type: 'Ingreso' })} />
                                <span className="text-sm font-medium text-gray-700">Ingreso Fijo</span>
                            </label>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre / Concepto</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej. Crédito Vehículo"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Monto Estimado</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                                step="0.01"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Frecuencia */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Frecuencia</label>
                            <select
                                value={formData.frequency}
                                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="Mensual">Mensual</option>
                                <option value="Quincenal">Quincenal</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>

                        {/* Dia Ejecución */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Día del Mes (Ej. 15)</label>
                            <input
                                type="number"
                                min="1" max="31"
                                value={formData.executionDay}
                                onChange={e => setFormData({ ...formData, executionDay: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Categoria */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Nueva Categoría"
                                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        disabled={submitting}
                                        className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600"
                                    >
                                        <Save size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCategory(false)}
                                        className="bg-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-300"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categories.map((c, i) => <option key={i} value={c.Valor}>{c.Valor}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCategory(true)}
                                        className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                        title="Nueva Categoría"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Cuenta */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Cuenta de Origen/Destino</label>
                            <select
                                value={formData.account}
                                onChange={e => setFormData({ ...formData, account: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="">Seleccionar...</option>
                                {Object.entries(accounts.reduce((acc, curr) => {
                                    if (!acc[curr.Tipo]) acc[curr.Tipo] = [];
                                    acc[curr.Tipo].push(curr);
                                    return acc;
                                }, {})).map(([type, accs]) => (
                                    <optgroup key={type} label={type}>
                                        {accs.map(a => <option key={a.ID} value={a.Nombre}>{a.Nombre}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Fechas Limite */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Inicio</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Fin (Opcional)</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" placeholder="Indefinido" />
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-gray-400">O calcula por cuotas:</span>
                                <input
                                    type="number"
                                    placeholder="# Meses"
                                    className="w-20 px-2 py-1 border border-gray-200 rounded text-xs outline-none"
                                    onChange={handleInstallmentsChange}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar Regla
                        </button>
                    </div>
                </form>
            )}

            {/* Lista de Reglas */}
            {loading ? <div className="text-center py-10">Cargando reglas...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurringRules.map(rule => (
                        <div key={rule.ID} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-full ${rule.Tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {rule.Tipo === 'Ingreso' ? <RefreshCw size={20} /> : <Calendar size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{rule.Nombre}</h4>
                                    <div className="text-sm text-gray-500 flex flex-col">
                                        <span className="font-medium text-indigo-600 text-xs">{rule.Cuenta}</span>
                                        <span>{rule.Frecuencia} • Día {rule.DiaEjecucion}</span>
                                        {rule.FechaFin && rule.FechaInicio && (
                                            <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded w-fit my-1">
                                                Cuota {(() => {
                                                    const start = new Date(rule.FechaInicio);
                                                    const now = new Date();
                                                    // Diferencia en meses
                                                    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;

                                                    const end = new Date(rule.FechaFin);
                                                    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

                                                    return `${Math.max(1, diffMonths)} / ${Math.max(1, totalMonths)}`;
                                                })()}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {rule.FechaFin ? `Hasta ${rule.FechaFin.split('T')[0]}` : 'Indefinido'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${rule.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(rule.Monto)}
                                </p>
                                <button
                                    onClick={() => handleEdit(rule)}
                                    className="mt-2 p-2 text-gray-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 mr-1"
                                    title="Editar regla"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(rule.ID)}
                                    className="mt-2 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar regla"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {recurringRules.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            No tienes reglas recurrentes configuradas.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecurringRulesPage;
