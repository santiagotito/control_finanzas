import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, Loader2 } from 'lucide-react';

const TransactionForm = ({ onSuccess }) => {
    const { addTransaction, accounts, settings } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Gasto',
        amount: '',
        category: '',
        account: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const success = await addTransaction(formData);
            if (success) {
                setFormData({
                    type: 'Gasto',
                    amount: '',
                    category: '',
                    account: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                });
                if (onSuccess) onSuccess();
            } else {
                alert("Error al guardar transacción. Verifica la consola.");
            }
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar.");
        } finally {
            setLoading(false);
        }
    };

    // Filtrar categorías según tipo
    const validCategories = settings.filter(s => s.Tipo === formData.type);

    // Obtener cuentas (si no hay, mostrar advertencia)
    const accountOptions = accounts.map(a => a.Nombre);

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 mb-2">Nueva Transacción</h3>

            <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer text-center py-2 rounded-lg font-medium transition-colors ${formData.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" name="type" value="Ingreso" checked={formData.type === 'Ingreso'} onChange={handleChange} className="hidden" />
                    Ingreso
                </label>
                <label className={`cursor-pointer text-center py-2 rounded-lg font-medium transition-colors ${formData.type === 'Gasto' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" name="type" value="Gasto" checked={formData.type === 'Gasto'} onChange={handleChange} className="hidden" />
                    Gasto
                </label>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                        <option value="">Seleccionar...</option>
                        {validCategories.map((cat, idx) => (
                            <option key={idx} value={cat.Valor}>{cat.Valor}</option>
                        ))}
                        {validCategories.length === 0 && <option value="Otros">Otros</option>}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cuenta / Tarjeta</label>
                <select
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    <option value="">Seleccionar...</option>
                    {accountOptions.map((acc, idx) => (
                        <option key={idx} value={acc}>{acc}</option>
                    ))}
                    {/* Fallback si no hay cuentas configuradas */}
                    {accountOptions.length === 0 && <option value="Efectivo">Efectivo (Default)</option>}
                </select>
                {accountOptions.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Nota: Crea cuentas en la sección "Cuentas"</p>
                )}
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej: Supermercado"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Guardar Transacción
            </button>
        </form>
    );
};

export default TransactionForm;
