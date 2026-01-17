import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { CreditCard, Wallet, Plus, Save, Loader2, Trash2, Edit, X } from 'lucide-react';

const AccountsPage = () => {
    const { accounts, addAccount, updateAccount, deleteAccount, loading } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Cuenta Bancaria',
        initialBalance: 0,
        currency: 'COP',
        cutoffDay: '',
        paymentDay: '',
        accountNumber: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let success;
            if (editingId) {
                success = await updateAccount({ ...formData, id: editingId });
            } else {
                success = await addAccount(formData);
            }

            if (success) {
                resetForm();
            } else {
                alert("Error al guardar cuenta");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', type: 'Cuenta Bancaria', initialBalance: 0, currency: 'COP', cutoffDay: '', paymentDay: '', accountNumber: '' });
    };

    const handleEdit = (acc) => {
        setFormData({
            name: acc.Nombre,
            type: acc.Tipo,
            initialBalance: acc.SaldoInicial,
            currency: acc.Moneda || 'COP',
            cutoffDay: acc.DiaCorte || '',
            paymentDay: acc.DiaPago || '',
            accountNumber: acc.NumeroCuenta || ''
        });
        setEditingId(acc.ID);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Estás seguro de eliminar la cuenta "${name}"?`)) {
            await deleteAccount(id);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Cuentas y Tarjetas</h2>
                    <p className="text-gray-500">Gestiona tus fuentes de dinero</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    {showForm ? 'Cancelar' : <><Plus size={20} /> Nueva Cuenta</>}
                </button>
            </header>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fadeIn mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">{editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                required
                                placeholder="EJ. BANCO PRINCIPAL"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                            />
                        </div>
                        {['Cuenta Bancaria', 'Tarjeta de Crédito'].includes(formData.type) && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {formData.type === 'Tarjeta de Crédito' ? 'Últimos 4 dígitos' : 'Número de Cuenta'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.accountNumber}
                                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                    placeholder={formData.type === 'Tarjeta de Crédito' ? 'Ej. 4321' : 'Ej. 1234567890'}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value, accountNumber: '' })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option>Cuenta Bancaria</option>
                                <option>Tarjeta de Crédito</option>
                                <option>Efectivo</option>
                                <option>Inversión</option>
                            </select>
                        </div>


                        {formData.type === 'Tarjeta de Crédito' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Día de Corte (1-31)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.cutoffDay}
                                        onChange={e => setFormData({ ...formData, cutoffDay: e.target.value })}
                                        required
                                        placeholder="Ej. 15"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Día en que cierra la facturación.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Día de Pago (1-31)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.paymentDay}
                                        onChange={e => setFormData({ ...formData, paymentDay: e.target.value })}
                                        required
                                        placeholder="Ej. 30"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Fecha límite de pago mensual.</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar
                        </button>
                    </div>
                </form>
            )
            }

            {
                loading ? (
                    <div className="text-center py-10 text-gray-500">Cargando cuentas...</div>
                ) : (
                    <div className="space-y-8">
                        {/* Agrupar cuentas por tipo */}
                        {[...new Set(accounts.map(a => a.Tipo))].sort().map(type => {
                            const typeAccounts = accounts.filter(a => a.Tipo === type);
                            if (typeAccounts.length === 0) return null;

                            return (
                                <div key={type} className="animate-fadeIn">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                                        {type === 'Tarjeta de Crédito' ? <CreditCard size={20} className="text-purple-600" /> : <Wallet size={20} className="text-blue-600" />}
                                        {type}s
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {typeAccounts.map((acc, idx) => (
                                            <div key={acc.ID} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${acc.Tipo === 'Tarjeta de Crédito' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {acc.Tipo === 'Tarjeta de Crédito' ? <CreditCard size={24} /> : <Wallet size={24} />}
                                                    </div>
                                                    {/* <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-500">{acc.Tipo}</span> */}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{acc.Nombre}</h3>
                                                    {acc.NumeroCuenta && <p className="text-xs text-gray-400 mb-2 font-mono tracking-wider">{acc.NumeroCuenta}</p>}
                                                    <p className="text-gray-500 text-sm">Saldo Actual</p>
                                                    <p className={`text-2xl font-bold mt-1 ${parseFloat(acc.SaldoActual) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {formatCurrency(acc.SaldoActual)}
                                                    </p>
                                                </div>

                                                <div className="flex justify-end gap-2 mt-4 border-t border-gray-50 pt-3">
                                                    <button
                                                        onClick={() => handleEdit(acc)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(acc.ID, acc.Nombre)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {accounts.length === 0 && !loading && (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">No tienes cuentas registradas</p>
                                <button onClick={() => setShowForm(true)} className="text-indigo-600 font-medium mt-2">Crear mi primera cuenta</button>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default AccountsPage;
