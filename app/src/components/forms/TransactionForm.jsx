import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';

const TransactionForm = ({ onSuccess, initialData = null }) => {
    const { addTransaction, updateTransaction, accounts, settings, addCategory } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Estado inicial por defecto
    const defaultState = {
        id: null, // [NEW] Track ID internally
        isVirtual: false, // [NEW] Track virtual status
        type: 'Gasto',
        amount: '',
        category: '',
        account: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        monthEffect: new Date().toISOString().slice(0, 7)
    };

    const [formData, setFormData] = useState(defaultState);

    // Efecto para cargar datos iniciales si vienen (ej: confirmar proyección)
    React.useEffect(() => {
        if (initialData) {
            let mEff = initialData.MesAfectacion || initialData.Fecha;
            if (mEff && mEff.length > 7) mEff = mEff.slice(0, 7);

            setFormData({
                id: initialData.ID, // Persist ID
                isVirtual: !!initialData.IsVirtual, // Persist Virtual status
                type: initialData.Tipo,
                amount: initialData.Monto,
                category: initialData.Categoria,
                account: initialData.Cuenta,
                description: initialData.Descripcion,
                date: initialData.Fecha.split('T')[0],
                monthEffect: mEff,
                // Preservamos estado validado si viene de proyección
                Estado: 'Validado'
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'date') {
                newData.monthEffect = value.slice(0, 7);
            }
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        console.log("Submitting form with data:", formData); // Debug
        try {
            const txData = { ...formData };
            txData.amount = parseFloat(txData.amount);

            // Logic using internal state
            if (formData.id && !formData.isVirtual) {
                // Keep original status if editing existing real transaction
                if (initialData?.Estado) txData.Estado = initialData.Estado;
            } else if (formData.isVirtual) {
                txData.Estado = 'Validado';
            }

            let success;
            // UPDATE: if it has ID and is NOT virtual
            if (formData.id && !formData.isVirtual) {
                console.log("UPDATING Transaction", formData.id);
                success = await updateTransaction({
                    id: formData.id,
                    date: txData.date,
                    type: txData.type,
                    category: txData.category,
                    amount: parseFloat(txData.amount),
                    account: txData.account,
                    description: txData.description,
                    MesAfectacion: txData.monthEffect,
                    Estado: txData.Estado
                });
            } else {
                // CREATE: New or Confirming Projection
                console.log("CREATING Transaction");
                success = await addTransaction({
                    ...txData,
                    MesAfectacion: txData.monthEffect
                });

                // Lógica especial para Pago de Tarjetas
                if (success && txData.category === 'Pago de Tarjetas' && txData.targetAccount) {
                    console.log("AUTO-CREATING Card Income Move");
                    await addTransaction({
                        date: txData.date,
                        type: 'Ingreso',
                        category: 'Pago de Tarjetas',
                        amount: txData.amount,
                        account: txData.targetAccount,
                        description: `Abono desde ${txData.account}`,
                        MesAfectacion: txData.targetMonth || txData.monthEffect,
                        Estado: 'Validado'
                    });
                }
            }

            if (success) {
                // Clear form if it was a create action (or we want to reset)
                // For editing, we usually close the modal, handled by onSuccess
                if (!formData.id || formData.isVirtual) {
                    setFormData(defaultState);
                }

                if (onSuccess) onSuccess();
            } else {
                alert("Error al guardar. IMPORTANTE: Asegúrate de haber hecho 'Nueva Implementación' en el Script de Google (Backend).");
            }
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setLoading(true); // Re-use loading state or specific one
        try {
            const success = await addCategory(formData.type, newCategoryName);
            if (success) {
                setFormData({ ...formData, category: newCategoryName });
                setIsAddingCategory(false);
                setNewCategoryName('');
            } else {
                alert("Error al crear categoría");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar categorías según tipo
    const validCategories = settings.filter(s => s.Tipo === formData.type);

    // Obtener cuentas (si no hay, mostrar advertencia)
    const accountOptions = accounts.map(a => a.Nombre);

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-800 text-sm">{initialData?.ID && !initialData?.IsVirtual ? 'Editar Transacción' : 'Nueva Transacción'}</h3>
                {initialData?.ID && !initialData?.IsVirtual && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Editando</span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <label className={`cursor-pointer text-center py-1.5 rounded-lg font-medium text-sm transition-colors ${formData.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" name="type" value="Ingreso" checked={formData.type === 'Ingreso'} onChange={handleChange} className="hidden" />
                    Ingreso
                </label>
                <label className={`cursor-pointer text-center py-1.5 rounded-lg font-medium text-sm transition-colors ${formData.type === 'Gasto' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" name="type" value="Gasto" checked={formData.type === 'Gasto'} onChange={handleChange} className="hidden" />
                    Gasto
                </label>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mes Afectación</label>
                    <input
                        type="month"
                        name="monthEffect"
                        value={formData.monthEffect}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                    {isAddingCategory ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Nueva Categoría"
                                className="w-full px-3 py-1.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                disabled={loading}
                                className="bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600"
                            >
                                <Save size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(false)}
                                className="bg-gray-200 text-gray-600 p-1.5 rounded-lg hover:bg-gray-300"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                {validCategories.map((cat, idx) => (
                                    <option key={idx} value={cat.Valor}>{cat.Valor}</option>
                                ))}
                                {validCategories.length === 0 && <option value="Otros">Otros</option>}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(true)}
                                className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                title="Nueva Categoría"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-indigo-600 mb-1 uppercase tracking-wider">
                    {formData.category === 'Pago de Tarjetas' ? 'Pagar desde... (Origen)' : 'Cuenta / Tarjeta'}
                </label>
                <select
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                >
                    <option value="">Seleccionar...</option>
                    {(() => {
                        const groups = accounts.reduce((acc, curr) => {
                            const type = curr.Tipo || 'Otras';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(curr);
                            return acc;
                        }, {});

                        return Object.entries(groups).map(([type, accs]) => (
                            <optgroup key={type} label={type}>
                                {accs.map((acc, idx) => (
                                    <option key={idx} value={acc.Nombre}>{acc.Nombre}</option>
                                ))}
                            </optgroup>
                        ));
                    })()}
                    {accounts.length === 0 && <option value="Efectivo">Efectivo (Default)</option>}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Ej: Supermercado"
                />
            </div>

            {formData.category === 'Pago de Tarjetas' && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3 animate-fadeIn">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Detalles del Abono</p>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tarjeta a Pagar</label>
                        <select
                            name="targetAccount"
                            value={formData.targetAccount || ''}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                        >
                            <option value="">Seleccionar Tarjeta...</option>
                            {accounts.filter(a => a.Tipo === 'Tarjeta de Crédito').map(a => (
                                <option key={a.ID} value={a.Nombre}>{a.Nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mes que estás pagando</label>
                        <input
                            type="month"
                            name="targetMonth"
                            value={formData.targetMonth || formData.monthEffect}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <p className="text-[10px] text-indigo-400 mt-1">Este abono reducirá la deuda de este mes en la tarjeta.</p>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {formData.id && !formData.isVirtual ? 'Actualizar Transacción' : 'Guardar Transacción'}
            </button>
        </form>
    );
};

export default TransactionForm;
