import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import TransactionForm from '../components/forms/TransactionForm';
import { formatCurrency } from '../utils/financialUtils';
import { generateProjectedTransactions, getInstallmentInfo } from '../utils/projectionUtils';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar as CalendarIcon, ArrowRight, Loader2, Trash2, Pencil, RotateCcw } from 'lucide-react';
import { API_URL } from '../config';

const TransactionsPage = () => {
    const { transactions, recurringRules, loading, addTransaction, updateTransaction, deleteTransaction, refreshData, accounts } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [accountFilter, setAccountFilter] = useState('Todas');

    // [NEW] Filtro Avanzado de Fechas
    const [filterMode, setFilterMode] = useState('month'); // 'month' (Mes Afectación) | 'range' (Fecha Real)
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [processingId, setProcessingId] = useState(null);
    const [transactionToEdit, setTransactionToEdit] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'Fecha', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // 1. Filtrar Transacciones Reales del Mes (y por Cuenta si aplica)
    const realTransactions = useMemo(() => {
        return transactions.filter(t => {
            let matchesDate = false;

            if (filterMode === 'month') {
                // MODO MES: Filtra por Mes de Afectación (Normalizado)
                let rawDate = t.MesAfectacion || t.Fecha;
                if (!rawDate) return false;
                const tDate = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;
                matchesDate = tDate === selectedDate;
            } else {
                // MODO RANGO: Filtra por Fecha Real (Auditoría)
                if (!t.Fecha) return false;
                const tDate = t.Fecha.split('T')[0];
                const start = dateRange.start || '0000-01-01';
                const end = dateRange.end || '9999-12-31';
                matchesDate = tDate >= start && tDate <= end;
            }

            const matchesAccount = accountFilter === 'Todas' || t.Cuenta === accountFilter;

            return matchesDate && matchesAccount;
        });
    }, [transactions, selectedDate, accountFilter, filterMode, dateRange]);

    // 2. Generar Proyecciones del Mes (Virtuales)
    const projectedTransactions = useMemo(() => {
        // En modo rango no mostramos proyecciones mensuales (son confusas)
        if (filterMode === 'range') return [];

        if (!selectedDate) return [];
        // Filtramos las reglas antes de generar las proyecciones
        const applicableRules = recurringRules.filter(r => accountFilter === 'Todas' || r.Cuenta === accountFilter);
        return generateProjectedTransactions(applicableRules, selectedDate, realTransactions);
    }, [recurringRules, selectedDate, realTransactions, accountFilter]);


    // 3. Filtrar y Ordenar Lista Final
    const allItems = useMemo(() => {
        if (!realTransactions) return [];

        // Enriquecer transacciones reales con info de cuotas (heurística por nombre)
        const enrichedReal = realTransactions.map(tx => {
            const rule = recurringRules.find(r => r.Nombre === tx.Descripcion && r.Categoria === tx.Categoria);
            if (rule) {
                return { ...tx, Installment: getInstallmentInfo(rule, tx.Fecha) };
            }
            return tx;
        });

        let items = [...enrichedReal, ...projectedTransactions];

        // Filtro por Estado (Simplificado)
        if (statusFilter !== 'Todos') {
            items = items.filter(i => {
                if (statusFilter === 'Pendiente') return i.IsVirtual || i.Estado === 'Pendiente'; // Unificar conceptos
                if (statusFilter === 'Validado') return i.Estado !== 'Pendiente' && !i.IsVirtual;
                return true;
            });
        }

        // [NEW] Filtro por Tipo
        if (typeFilter !== 'Todos') {
            items = items.filter(i => i.Tipo === typeFilter);
        }

        // Ordenamiento Dinámico
        return items.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Manejo especial para Monto (números)
            if (sortConfig.key === 'Monto') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            // Manejo especial para Estado (IsVirtual -> Pendiente -> Validado)
            if (sortConfig.key === 'Estado') {
                const getStatusWeight = (tx) => {
                    if (tx.IsVirtual) return 1;
                    if (tx.Estado === 'Pendiente') return 2;
                    return 3;
                };
                aVal = getStatusWeight(a);
                bVal = getStatusWeight(b);
            }

            if (aVal < bVal) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [realTransactions, projectedTransactions, statusFilter, recurringRules, sortConfig, typeFilter]);



    // Helper para mostrar indicador de orden
    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <span className="ml-1 text-gray-300">↕</span>;
        return <span className="ml-1 text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    // 4. Calcular KPIs Detallados
    const stats = useMemo(() => {
        const s = {
            income: { valid: 0, pending: 0, projected: 0 },
            expense: { valid: 0, pending: 0, projected: 0 }
        };

        allItems.forEach(t => {
            const amount = parseFloat(t.Monto) || 0;
            const target = t.Tipo === 'Ingreso' ? s.income : s.expense;

            if (t.IsVirtual) {
                target.pending += amount; // Sumar a pendiente (unificado visualmente, aunque logicamente sea projected)
            } else if (t.Estado === 'Pendiente') {
                target.pending += amount;
            } else {
                target.valid += amount;
            }
        });

        return s;
    }, [allItems]);

    // Helper para cards interactivas
    const StatRow = ({ label, amount, colorClass, statusValue, icon: Icon }) => (
        <div
            onClick={(e) => { e.stopPropagation(); setStatusFilter(statusValue); }}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${statusFilter === statusValue ? 'bg-gray-50 ring-1 ring-gray-200' : ''}`}
        >
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className="text-gray-400" />}
                <span className="text-sm text-gray-500">{label}</span>
            </div>
            <span className={`font-bold ${colorClass}`}>{formatCurrency(amount)}</span>
        </div>
    );


    // Handlers
    const handleValidate = async (tx) => {
        if (!window.confirm("¿Confirmar que esta transacción ya aparece en tu extracto/cuenta?")) return;
        setProcessingId(tx.ID);
        try {
            // Usamos updateTransaction del context que ya soporta API v3
            const success = await updateTransaction({
                id: tx.ID,
                date: tx.Fecha,
                type: tx.Tipo,
                category: tx.Categoria,
                amount: tx.Monto,
                account: tx.Cuenta,
                description: tx.Descripcion,
                Estado: 'Validado'
            });
            if (!success) alert("Error al validar");
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleInvalidate = async (tx) => {
        if (!window.confirm("¿Volver a estado Pendiente?")) return;
        setProcessingId(tx.ID);
        try {
            const success = await updateTransaction({
                id: tx.ID,
                date: tx.Fecha,
                type: tx.Tipo,
                category: tx.Categoria,
                amount: tx.Monto,
                account: tx.Cuenta,
                description: tx.Descripcion,
                Estado: 'Pendiente'
            });
            if (!success) alert("Error al invalidar");
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (tx) => {
        if (!window.confirm("¿Estás seguro de ELIMINAR esta transacción? No se puede deshacer.")) return;
        setProcessingId(tx.ID);
        try {
            const success = await deleteTransaction(tx.ID);
            if (!success) alert("Error al eliminar");
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmProjection = async (proj) => {
        // Quick Confirm: Pregunta y guarda directo como Validado
        if (!window.confirm(`¿Confirmar transacción de ${formatCurrency(proj.Monto)}?`)) return;

        setProcessingId(proj.ID);
        try {
            const success = await addTransaction({
                date: proj.Fecha,
                type: proj.Tipo,
                category: proj.Categoria,
                amount: proj.Monto,
                account: proj.Cuenta,
                description: proj.Descripcion,
                MesAfectacion: proj.Fecha.slice(0, 7),
                Estado: 'Validado'
            });
            if (success) await refreshData();
        } catch (e) {
            console.error(e);
            alert("Error al confirmar");
        } finally {
            setProcessingId(null);
        }
    };

    const handleEditTransaction = (tx) => {
        console.log("Editing Transaction Data:", tx); // DEBUG
        setTransactionToEdit(tx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSkipProjection = async (proj) => {
        if (!window.confirm(`¿Quieres omitir este pago de "${proj.Descripcion}" para este mes?`)) return;
        setProcessingId(proj.ID);
        try {
            const success = await addTransaction({
                date: proj.Fecha,
                type: proj.Tipo,
                category: proj.Categoria,
                amount: 0,
                account: proj.Cuenta,
                description: proj.Descripcion,
                Estado: 'Omitido'
            });
            if (success) await refreshData();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <header className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-xl font-bold text-gray-800">Transacciones</h2>
                        <span className="text-sm text-gray-400 hidden sm:inline">Historial y Proyecciones</span>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        {/* Toggle Month/Range */}
                        <div className="bg-gray-100 p-0.5 rounded-lg flex text-xs font-medium">
                            <button
                                onClick={() => setFilterMode('month')}
                                className={`px-2 py-1 rounded-md transition-all ${filterMode === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setFilterMode('range')}
                                className={`px-2 py-1 rounded-md transition-all ${filterMode === 'range' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Rango
                            </button>
                        </div>

                        {filterMode === 'month' ? (
                            <input
                                type="month"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-2 pr-1 py-1 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-[130px]"
                            />
                        ) : (
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="pl-2 pr-1 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-[110px]"
                                    placeholder="Desde"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="pl-2 pr-1 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-[110px]"
                                    placeholder="Hasta"
                                />
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-2 pr-6 py-1 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-600"
                        >
                            <option value="Todos">Todos</option>
                            <option value="Pendiente">Pendientes</option>
                            <option value="Validado">Validados</option>
                        </select>
                        <select
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                            className="pl-2 pr-6 py-1 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-600 max-w-[140px]"
                        >
                            <option value="Todas">Ctas: Todas</option>
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
                        </select>
                    </div>
                </div>

                {/* KPIs Cards - Diseño Compacto */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* CARD INGRESOS */}
                    <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden flex flex-col justify-center p-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-emerald-800 uppercase">Ingresos</span>
                            <span className="text-lg font-bold text-emerald-600">
                                +{formatCurrency(stats.income.valid + stats.income.pending)}
                            </span>
                        </div>
                        <div className="flex gap-3 text-xs">
                            <div className="flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 size={12} /> {formatCurrency(stats.income.valid)}
                            </div>
                            <div className="flex items-center gap-1 text-amber-600 font-medium">
                                <AlertCircle size={12} /> {formatCurrency(stats.income.pending)}
                            </div>
                        </div>
                    </div>

                    {/* CARD GASTOS */}
                    <div className="bg-white rounded-lg border border-red-100 shadow-sm overflow-hidden flex flex-col justify-center p-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-red-800 uppercase">Gastos</span>
                            <span className="text-lg font-bold text-red-600">
                                -{formatCurrency(stats.expense.valid + stats.expense.pending)}
                            </span>
                        </div>
                        <div className="flex gap-3 text-xs">
                            <div className="flex items-center gap-1 text-red-700 font-medium">
                                <CheckCircle2 size={12} /> {formatCurrency(stats.expense.valid)}
                            </div>
                            <div className="flex items-center gap-1 text-amber-600 font-medium">
                                <AlertCircle size={12} /> {formatCurrency(stats.expense.pending)}
                            </div>
                        </div>
                    </div>

                    {/* CARD BALANCE */}
                    <div className="bg-white rounded-lg border border-blue-100 shadow-sm overflow-hidden flex flex-col justify-center p-3 relative pl-4">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-blue-800 text-[10px] font-bold uppercase tracking-wider block">Disponible (Real)</span>
                                <span className={`text-2xl font-extrabold tracking-tight ${(stats.income.valid - stats.expense.valid) >= 0
                                    ? 'text-blue-600' : 'text-red-500'
                                    }`}>
                                    {formatCurrency(stats.income.valid - stats.expense.valid)}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-blue-400 font-medium uppercase block">Proyección Fin Mes</span>
                                <span className={`text-sm font-semibold ${(stats.income.valid + stats.income.pending) - (stats.expense.valid + stats.expense.pending) >= 0
                                    ? 'text-gray-600' : 'text-red-500'
                                    }`}>
                                    {formatCurrency(
                                        (stats.income.valid + stats.income.pending) -
                                        (stats.expense.valid + stats.expense.pending)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Layout Principal: 4 cols formulario (33%), 8 cols tabla (66%) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Formulario */}
                <div className="xl:col-span-4">
                    <TransactionForm
                        onSuccess={() => {
                            refreshData();
                            setTransactionToEdit(null);
                        }}
                        initialData={transactionToEdit}
                    />
                </div>

                {/* List Section */}
                <div className="xl:col-span-8 space-y-4">
                    {/* Tabs Tipo */}
                    <div className="flex bg-gray-100 p-1 rounded-lg w-fit text-sm font-medium">
                        {['Todos', 'Ingreso', 'Gasto'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-4 py-1.5 rounded-lg transition-all ${typeFilter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {type === 'Todos' ? 'Todos' : type === 'Ingreso' ? 'Ingresos' : 'Gastos'}
                            </button>
                        ))}
                    </div>

                    {loading && allItems.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                            <p>Cargando movimientos...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto relative min-h-[200px]">
                            {loading && (
                                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                    <div className="bg-white shadow-lg rounded-full px-4 py-1 flex items-center gap-2 text-xs font-medium text-indigo-600 border border-indigo-100">
                                        <Loader2 size={12} className="animate-spin" /> Actualizando...
                                    </div>
                                </div>
                            )}
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Fecha')}>
                                            Fecha <SortIcon colKey="Fecha" />
                                        </th>
                                        <th className="px-3 py-2 font-semibold w-full">Descripción</th>
                                        <th className="px-3 py-2 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Estado')}>
                                            Estado <SortIcon colKey="Estado" />
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Monto')}>
                                            Monto <SortIcon colKey="Monto" />
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allItems.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-3 py-3 text-gray-600 whitespace-nowrap font-mono">
                                                <div className="flex flex-col">
                                                    <span>{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</span>
                                                    {tx.MesAfectacion && tx.Fecha && tx.MesAfectacion !== tx.Fecha.slice(0, 7) && (
                                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded w-fit mt-0.5" title="Mes de Afectación">
                                                            Mes: {tx.MesAfectacion.slice(0, 7)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="font-medium text-gray-900 flex items-start flex-col sm:flex-row gap-1">
                                                    <span>{tx.Descripcion || 'Sin descripción'}</span>
                                                    <div className="flex flex-wrap gap-1 mt-0.5 sm:mt-0">
                                                        {(tx.IsVirtual || tx.Estado === 'Pendiente') && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pendiente</span>}
                                                        {tx.Installment && (
                                                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold border border-sky-200">
                                                                {tx.Installment}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">{tx.Categoria} • {tx.Cuenta}</div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {tx.IsVirtual || tx.Estado === 'Pendiente' ? (
                                                    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                                                        <Clock size={12} /> Pendiente
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                        <CheckCircle2 size={12} /> Validado
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-3 py-3 font-medium whitespace-nowrap text-right ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                {tx.IsVirtual ? (
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => handleConfirmProjection(tx)}
                                                            disabled={processingId === tx.ID}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                                                            title="Validar: Confirmar y procesar"
                                                        >
                                                            {processingId === tx.ID ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditTransaction(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                                                            title="Editar y Confirmar"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSkipProjection(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Omitir este mes"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : tx.Estado === 'Pendiente' ? (
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => handleValidate(tx)}
                                                            disabled={processingId === tx.ID}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                                                            title="Validar: Confirmar en cuenta"
                                                        >
                                                            {processingId === tx.ID ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditTransaction(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // Validado
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => handleInvalidate(tx)}
                                                            disabled={processingId === tx.ID}
                                                            className="p-1.5 text-gray-400 hover:text-amber-500 transition-colors"
                                                            title="Invalidar (Volver a Pendiente)"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditTransaction(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(tx)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {allItems.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                                No hay movimientos para este mes
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;
