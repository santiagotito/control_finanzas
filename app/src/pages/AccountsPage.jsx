import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { getRuleStatus } from '../utils/projectionUtils';
import { CreditCard, Wallet, Plus, Save, Loader2, Trash2, Edit, ChevronDown, ChevronUp, Filter, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const AccountsPage = () => {
    const { accounts, transactions, addAccount, updateAccount, deleteAccount, loading } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedAccount, setExpandedAccount] = useState(null);

    // Filtros independientes para el detalle de cuenta
    const [filters, setFilters] = useState({
        tipo: 'Todos',
        estado: 'Todos',
        mes: 'Todos'
    });

    const [formData, setFormData] = useState({
        name: '',
        type: 'Cuenta Bancaria',
        initialBalance: 0,
        currency: 'COP',
        cutoffDay: '',
        paymentDay: '',
        accountNumber: ''
    });

    // Obtener meses disponibles de las transacciones
    const availableMonths = useMemo(() => {
        const months = new Set();
        transactions.forEach(tx => {
            if (tx.Fecha) {
                // Extraer año y mes directamente del string para evitar problemas de zona horaria
                const dateStr = String(tx.Fecha);
                const match = dateStr.match(/^(\d{4})-(\d{2})/);
                if (match) {
                    const monthKey = `${match[1]}-${match[2]}`;
                    months.add(monthKey);
                }
            }
        });
        return Array.from(months).sort().reverse();
    }, [transactions]);

    // Calcular saldo por cuenta con desglose
    const getAccountDetails = (acc, appliedFilters = filters) => {
        const accName = String(acc.Nombre || '').trim().toUpperCase();
        const accountTxs = transactions.filter(tx => String(tx.Cuenta || '').trim().toUpperCase() === accName);

        // Aplicar filtros (usar los pasados o los del estado)
        let filtered = accountTxs;
        if (appliedFilters.tipo !== 'Todos') {
            filtered = filtered.filter(tx => tx.Tipo === appliedFilters.tipo);
        }
        if (appliedFilters.estado !== 'Todos') {
            filtered = filtered.filter(tx => tx.Estado === appliedFilters.estado);
        }
        if (appliedFilters.mes !== 'Todos') {
            filtered = filtered.filter(tx => {
                if (!tx.Fecha) return false;
                const dateStr = String(tx.Fecha);
                const match = dateStr.match(/^(\d{4})-(\d{2})/);
                if (match) {
                    const monthKey = `${match[1]}-${match[2]}`;
                    return monthKey === appliedFilters.mes;
                }
                return false;
            });
        }

        // Calcular totales
        let totalIngresos = 0;
        let totalGastos = 0;
        let ingresosValidados = 0;
        let gastosValidados = 0;

        filtered.forEach(tx => {
            const amount = parseFloat(tx.Monto || 0);
            if (tx.Tipo === 'Ingreso') {
                totalIngresos += amount;
                if (tx.Estado === 'Validado') ingresosValidados += amount;
            } else if (tx.Tipo === 'Gasto') {
                totalGastos += amount;
                if (tx.Estado === 'Validado') gastosValidados += amount;
            }
        });

        return {
            transactions: filtered.sort((a, b) => {
                const dateA = String(a.Fecha || '');
                const dateB = String(b.Fecha || '');
                return dateB.localeCompare(dateA);
            }),
            totalIngresos,
            totalGastos,
            ingresosValidados,
            gastosValidados,
            saldoReal: ingresosValidados - gastosValidados,
            saldoTotal: totalIngresos - totalGastos
        };
    };

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

    const toggleAccountDetail = (accId) => {
        if (expandedAccount === accId) {
            setExpandedAccount(null);
        } else {
            setExpandedAccount(accId);
            // Reset filters when opening a new account
            setFilters({ tipo: 'Todos', estado: 'Todos', mes: 'Todos' });
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        // Manejar formato YYYY-MM-DD sin problemas de zona horaria
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [year, month, day] = dateStr.split('T')[0].split('-');
            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
        }
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getNextPaymentDate = (day) => {
        if (!day) return null;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const currentDay = now.getDate();

        let paymentDate = new Date(year, month, parseInt(day));
        if (currentDay > parseInt(day)) {
            paymentDate = new Date(year, month + 1, parseInt(day));
        }
        return paymentDate;
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
            )}

            {loading ? (
                <div className="text-center py-10 text-gray-500">Cargando cuentas...</div>
            ) : (
                <div className="space-y-8">
                    {[...new Set(accounts.map(a => a.Tipo))].sort().map(type => {
                        const typeAccounts = accounts.filter(a => a.Tipo === type);
                        if (typeAccounts.length === 0) return null;

                        return (
                            <div key={type} className="animate-fadeIn">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {type === 'Tarjeta de Crédito' ? <CreditCard size={20} className="text-purple-600" /> : <Wallet size={20} className="text-blue-600" />}
                                    {type}s
                                </h3>
                                <div className="space-y-4">
                                    {typeAccounts
                                        .sort((a, b) => {
                                            if (type === 'Tarjeta de Crédito') {
                                                const dateA = getNextPaymentDate(a.DiaPago);
                                                const dateB = getNextPaymentDate(b.DiaPago);
                                                if (dateA && dateB) return dateA - dateB;
                                                return 0;
                                            }
                                            return (a.Nombre || '').localeCompare(b.Nombre || '');
                                        })
                                        .map((acc) => {
                                            const isExpanded = expandedAccount === acc.ID;
                                            // Para el header, calculamos el saldo TOTAL (sin filtros)
                                            const headerStats = getAccountDetails(acc, { tipo: 'Todos', estado: 'Todos', mes: 'Todos' });
                                            // Para el detalle, usamos los filtros activos
                                            const details = isExpanded ? getAccountDetails(acc) : null;

                                            return (
                                                <div key={acc.ID} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                    {/* Card Header */}
                                                    <div className="p-6 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-xl ${acc.Tipo === 'Tarjeta de Crédito' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {acc.Tipo === 'Tarjeta de Crédito' ? <CreditCard size={24} /> : <Wallet size={24} />}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-800 text-lg">{acc.Nombre}</h3>
                                                                <div className="flex flex-col">
                                                                    {acc.NumeroCuenta && <span className="text-xs text-gray-400 font-mono tracking-wider">{acc.NumeroCuenta}</span>}
                                                                    {acc.Tipo === 'Tarjeta de Crédito' && acc.DiaPago && (
                                                                        <span className="text-[10px] text-indigo-500 font-semibold uppercase mt-0.5">
                                                                            Siguiente Pago: {getNextPaymentDate(acc.DiaPago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-gray-500 text-xs">
                                                                    {acc.Tipo === 'Tarjeta de Crédito' ? 'Deuda Total' : 'Saldo Real'}
                                                                </p>
                                                                <p className={`text-2xl font-bold ${(() => {
                                                                    const balance = acc.Tipo === 'Tarjeta de Crédito' ? headerStats.saldoTotal : headerStats.saldoReal;
                                                                    return Math.abs(balance) < 0.01 ? 'text-green-600' : 'text-red-600';
                                                                })()}`}>
                                                                    {acc.Tipo === 'Tarjeta de Crédito'
                                                                        ? formatCurrency(Math.abs(headerStats.saldoTotal))
                                                                        : formatCurrency(headerStats.saldoReal)
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleAccountDetail(acc.ID)}
                                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title="Ver detalle"
                                                                >
                                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                                </button>
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
                                                    </div>

                                                    {/* Expanded Detail */}
                                                    {isExpanded && details && (
                                                        <div className="border-t border-gray-100 bg-gray-50">
                                                            {/* Filtros */}
                                                            <div className="p-4 border-b border-gray-200 bg-white">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Filter size={16} className="text-gray-500" />
                                                                    <span className="text-sm font-medium text-gray-700">Filtros independientes</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-3">
                                                                    <select
                                                                        value={filters.mes}
                                                                        onChange={e => setFilters({ ...filters, mes: e.target.value })}
                                                                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                                                    >
                                                                        <option value="Todos">Todos los meses</option>
                                                                        {availableMonths.map(m => (
                                                                            <option key={m} value={m}>{m}</option>
                                                                        ))}
                                                                    </select>
                                                                    <select
                                                                        value={filters.tipo}
                                                                        onChange={e => setFilters({ ...filters, tipo: e.target.value })}
                                                                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                                                    >
                                                                        <option value="Todos">Todos los tipos</option>
                                                                        <option value="Ingreso">Ingresos</option>
                                                                        <option value="Gasto">Gastos</option>
                                                                    </select>
                                                                    <select
                                                                        value={filters.estado}
                                                                        onChange={e => setFilters({ ...filters, estado: e.target.value })}
                                                                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                                                    >
                                                                        <option value="Todos">Todos los estados</option>
                                                                        <option value="Validado">Validados</option>
                                                                        <option value="Pendiente">Pendientes</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* Resumen */}
                                                            <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                                    <p className="text-xs text-gray-500">Ingresos Validados</p>
                                                                    <p className="text-lg font-bold text-green-600">{formatCurrency(details.ingresosValidados)}</p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                                    <p className="text-xs text-gray-500">Gastos Validados</p>
                                                                    <p className="text-lg font-bold text-red-600">{formatCurrency(details.gastosValidados)}</p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200 ring-2 ring-indigo-50 ring-inset">
                                                                    <p className="text-xs text-gray-500">
                                                                        {acc.Tipo === 'Tarjeta de Crédito' ? 'Deuda Estimada (Todo)' : 'Saldo Real (Validados)'}
                                                                    </p>
                                                                    <p className={`text-lg font-bold ${acc.Tipo === 'Tarjeta de Crédito'
                                                                        ? (details.saldoTotal < 0 ? 'text-red-600' : 'text-green-600')
                                                                        : (details.saldoReal < 0 ? 'text-red-600' : 'text-indigo-600')
                                                                        }`}>
                                                                        {acc.Tipo === 'Tarjeta de Crédito'
                                                                            ? formatCurrency(Math.abs(details.saldoTotal))
                                                                            : formatCurrency(details.saldoReal)
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                                    <p className="text-xs text-gray-500">Compromisos Futuros</p>
                                                                    <p className="text-lg font-bold text-amber-600">
                                                                        {formatCurrency(
                                                                            recurringRules
                                                                                .filter(r => r.Tipo === 'Gasto' && r.FechaFin && r.Cuenta === acc.Nombre)
                                                                                .reduce((sum, r) => sum + getRuleStatus(r, transactions).totalDebt, 0)
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                                    <p className="text-xs text-gray-500">Total Transacciones</p>
                                                                    <p className="text-lg font-bold text-gray-700">{details.transactions.length}</p>
                                                                </div>
                                                            </div>

                                                            {/* Lista de transacciones */}
                                                            <div className="p-4">
                                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Transacciones ({details.transactions.length})</h4>
                                                                {details.transactions.length === 0 ? (
                                                                    <p className="text-center text-gray-400 py-4">No hay transacciones con estos filtros</p>
                                                                ) : (
                                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
                                                                        <table className="w-full text-sm">
                                                                            <thead className="bg-gray-50 sticky top-0">
                                                                                <tr>
                                                                                    <th className="text-left px-4 py-2 text-gray-600 font-medium">Fecha</th>
                                                                                    <th className="text-left px-4 py-2 text-gray-600 font-medium">Descripción</th>
                                                                                    <th className="text-left px-4 py-2 text-gray-600 font-medium">Categoría</th>
                                                                                    <th className="text-left px-4 py-2 text-gray-600 font-medium">Estado</th>
                                                                                    <th className="text-right px-4 py-2 text-gray-600 font-medium">Monto</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {details.transactions.map((tx, idx) => (
                                                                                    <tr key={tx.ID || idx} className="hover:bg-gray-50">
                                                                                        <td className="px-4 py-2 text-gray-600">{formatDate(tx.Fecha)}</td>
                                                                                        <td className="px-4 py-2 text-gray-800">
                                                                                            <div className="flex items-center gap-2">
                                                                                                {tx.Tipo === 'Ingreso' ?
                                                                                                    <ArrowUpCircle size={14} className="text-green-500" /> :
                                                                                                    <ArrowDownCircle size={14} className="text-red-500" />
                                                                                                }
                                                                                                {tx.Descripcion || '-'}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-gray-600">{tx.Categoria || '-'}</td>
                                                                                        <td className="px-4 py-2">
                                                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.Estado === 'Validado'
                                                                                                ? 'bg-green-100 text-green-700'
                                                                                                : 'bg-yellow-100 text-yellow-700'
                                                                                                }`}>
                                                                                                {tx.Estado || 'Sin estado'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className={`px-4 py-2 text-right font-medium ${tx.Tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'
                                                                                            }`}>
                                                                                            {tx.Tipo === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.Monto)}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
            )}
        </div>
    );
};

export default AccountsPage;
