import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import BudgetGauge from '../components/dashboard/BudgetGauge';
import ProjectedCashFlow from '../components/dashboard/ProjectedCashFlow';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import IncomeVsExpenseBar from '../components/dashboard/IncomeVsExpenseBar';
import DeferredCalculator from '../components/tools/DeferredCalculator';
import { Plus, X } from 'lucide-react';
import { calculateMonthlyTotals, formatCurrency } from '../utils/financialUtils';
import { generateProjectedTransactions } from '../utils/projectionUtils'; // [NEW]
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { loading, error, transactions, recurringRules, accounts } = useAppContext(); // [MODIFIED] Added accounts
    const [showCalculator, setShowCalculator] = useState(false);
    const [selectedDrillDown, setSelectedDrillDown] = useState(null); // { title: string, transactions: [] }
    const [sortConfig, setSortConfig] = useState({ key: 'Fecha', direction: 'desc' });
    const [drillSortConfig, setDrillSortConfig] = useState({ key: 'Fecha', direction: 'desc' });

    // [NEW] Filtros Independientes para Dashboard
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedAccount, setSelectedAccount] = useState('Todas');

    // ... (rest of stats calculation remains the same) ...
    const stats = React.useMemo(() => {
        let incomeReal = 0;
        let expenseReal = 0;
        let pendingIncome = 0; // Por si acaso
        let pendingExpense = 0;

        (transactions || []).forEach(t => {
            // Protección contra datos corruptos
            if (!t || !t.Fecha) return;

            // [FIX] Normalización de Mes de Afectación
            let rawDate = t.MesAfectacion || t.Fecha;
            const targetMonth = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;

            if (targetMonth !== selectedMonth) return;

            // [NEW] Filtro por Cuenta
            if (selectedAccount !== 'Todas' && t.Cuenta !== selectedAccount) return;

            // Protección contra Monto inválido
            let amount = parseFloat(t.Monto);
            if (isNaN(amount)) amount = 0;

            if (t.Estado === 'Pendiente') {
                if (t.Tipo === 'Ingreso') pendingIncome += amount;
                else pendingExpense += amount;
            } else {
                // Validado
                if (t.Tipo === 'Ingreso') incomeReal += amount;
                else expenseReal += amount;
            }
        });

        // 2. Sumar Virtuales (Proyecciones para el mes seleccionado)
        // [New] Esto sincroniza las cartas con el gráfico de flujo de caja
        if (recurringRules && recurringRules.length > 0) {
            // Filtramos reglas primero por cuenta
            const applicableRules = recurringRules.filter(r => selectedAccount === 'Todas' || r.Cuenta === selectedAccount);

            // Generamos las virtuales
            const virtuals = generateProjectedTransactions(applicableRules, selectedMonth, transactions);

            // Sumamos al "Pendiente" (ya que son proyecciones a futuro)
            virtuals.forEach(v => {
                let amount = parseFloat(v.Monto) || 0;
                if (v.Tipo === 'Ingreso') pendingIncome += amount;
                else pendingExpense += amount;
            });
        }

        // Calculamos un "Límite de Presupuesto" dinámico basado en Ingresos Totales (Real + Pendiente)
        // Si no hay ingresos, ponemos un default para que no se rompa la gráfica (ej. 1000 o lo que se haya gastado)
        const totalIncome = incomeReal + pendingIncome;
        const totalExpense = expenseReal + pendingExpense;
        const budgetLimit = totalIncome > 0 ? totalIncome : (totalExpense > 0 ? totalExpense * 1.2 : 1000);

        // [NEW] Filtramos las transacciones reales que cumplen con los filtros
        const filteredTransactions = transactions.filter(t => {
            if (!t || !t.Fecha) return false;
            let rawDate = t.MesAfectacion || t.Fecha;
            const targetMonth = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;
            if (targetMonth !== selectedMonth) return false;
            if (selectedAccount !== 'Todas' && t.Cuenta !== selectedAccount) return false;
            return true;
        });

        return {
            incomeReal,
            expenseReal,
            pendingIncome,
            pendingExpense,
            balanceReal: incomeReal - expenseReal,
            balanceTotal: (incomeReal + pendingIncome) - (expenseReal + pendingExpense),
            budgetLimit, // Pasaremos esto al Gauge
            filteredTransactions // [NEW] Pasar las transacciones filtradas
        };
    }, [transactions, selectedMonth, selectedAccount, recurringRules]);

    const handleBarClick = (data) => {
        if (!data || !data.payload) return;
        const type = data.payload.name === 'Ingresos' ? 'Ingreso' : 'Gasto';
        const drillTransactions = stats.filteredTransactions.filter(t => t.Tipo === type);
        setSelectedDrillDown({
            title: `Detalle de ${data.payload.name}`,
            transactions: drillTransactions
        });
    };

    const handleSliceClick = (entry) => {
        if (!entry) return;
        const drillTransactions = stats.filteredTransactions.filter(t => t.Categoria === entry.name);
        setSelectedDrillDown({
            title: `Categoría: ${entry.name}`,
            transactions: drillTransactions
        });
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedTransactions = React.useMemo(() => {
        const items = [...transactions.slice(0, 15)];
        return items.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle numeric values
            if (sortConfig.key === 'Monto') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortConfig]);

    const handleDrillSort = (key) => {
        setDrillSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedDrillTransactions = React.useMemo(() => {
        if (!selectedDrillDown) return [];
        const items = [...selectedDrillDown.transactions];
        return items.sort((a, b) => {
            let valA = a[drillSortConfig.key];
            let valB = b[drillSortConfig.key];

            if (drillSortConfig.key === 'Monto') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return drillSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return drillSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [selectedDrillDown, drillSortConfig]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 animate-pulse">Cargando datos financieros...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold">Error de Conexión</h3>
                <p>{error}</p>
                <p className="text-sm mt-2">
                    Verifica la configuración en <code>src/config.js</code> y asegúrate de haber desplegado el script de Google.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel Principal</h2>
                    <p className="text-gray-500">Resumen Financiero</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* [NEW] Filtros Dashboard */}
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="pl-2 pr-1 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                    />

                    <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="pl-2 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-600 shadow-sm max-w-[140px]"
                    >
                        <option value="Todas">Todas las Cuentas</option>
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

                    <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
                    >
                        {showCalculator ? 'Ocultar Calc' : 'Calculadora'}
                    </button>

                    <Link to="/transactions" className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                        <Plus size={20} />
                    </Link>
                </div>
            </header>

            {/* RESUMEN MENSUAL CLAVE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* INGRESOS */}
                <div
                    onClick={() => handleBarClick({ payload: { name: 'Ingresos' } })}
                    className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full"></div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Ingresos (Mes)</h3>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                        {formatCurrency(stats.incomeReal + stats.pendingIncome)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                            {formatCurrency(stats.incomeReal)} Cobrado
                        </span>
                        <span className="text-gray-400">
                            + {formatCurrency(stats.pendingIncome)} Pendiente
                        </span>
                    </div>
                </div>

                {/* GASTOS */}
                <div
                    onClick={() => handleBarClick({ payload: { name: 'Gastos' } })}
                    className="bg-white p-6 rounded-xl shadow-sm border border-red-100 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="w-16 h-16 bg-red-500 rounded-full"></div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Gastos (Mes)</h3>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                        {formatCurrency(stats.expenseReal + stats.pendingExpense)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                            {formatCurrency(stats.expenseReal)} Pagado
                        </span>
                        <span className="text-gray-400">
                            + {formatCurrency(stats.pendingExpense)} Pendiente
                        </span>
                    </div>
                </div>

                {/* BALANCE / DISPONIBLE */}
                <div className={`bg-white p-6 rounded-xl shadow-sm border relative overflow-hidden ${stats.balanceTotal >= 0 ? 'border-blue-100' : 'border-red-100'
                    }`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${stats.balanceTotal >= 0 ? 'bg-blue-500' : 'bg-red-500'
                        }`}></div>

                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">
                        {stats.balanceTotal >= 0 ? 'Te Sobra (Estimado)' : 'Te Falta (Déficit)'}
                    </h3>
                    <div className={`text-4xl font-extrabold mb-1 tracking-tight ${stats.balanceTotal >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(stats.balanceTotal)}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-400">Disponible Real (Hoy):</span>
                        <span className={`text-sm font-bold ${stats.balanceReal >= 0 ? 'text-gray-700' : 'text-red-500'
                            }`}>
                            {formatCurrency(stats.balanceReal)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Calculadora Expandible */}
            {
                showCalculator && (
                    <div className="animate-fadeIn">
                        <DeferredCalculator />
                    </div>
                )
            }

            <div className="flex flex-col gap-6">

                {/* FILA 1: Presupuesto y Balance (50% / 50%) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BudgetGauge
                        transactions={stats.filteredTransactions}
                        budgetLimit={stats.budgetLimit}
                        currentMonthExpense={stats.expenseReal + stats.pendingExpense}
                        recurringRules={recurringRules}
                    />
                    <IncomeVsExpenseBar
                        income={stats.incomeReal + stats.pendingIncome}
                        expense={stats.expenseReal + stats.pendingExpense}
                        onBarClick={handleBarClick}
                    />
                </div>

                {/* FILA 2: Flujo de Caja Proyectado (100%) */}
                <ProjectedCashFlow
                    transactions={stats.filteredTransactions}
                    recurringRules={recurringRules}
                    currentBalance={stats.balanceReal}
                    selectedAccount={selectedAccount}
                />

                {/* FILA 3: Categorías (100%) */}
                <CategoryPieChart
                    transactions={stats.filteredTransactions}
                    onSliceClick={handleSliceClick}
                />

            </div>

            {/* Sección de Transacciones Recientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Últimos Movimientos</h3>
                    <Link to="/transactions" className="text-indigo-600 text-sm font-medium hover:text-indigo-800">Ver todo</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Fecha')}>Fecha {sortConfig.key === 'Fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Descripcion')}>Descripción {sortConfig.key === 'Descripcion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Estado')}>Estado {sortConfig.key === 'Estado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Categoria')}>Categoría {sortConfig.key === 'Categoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors text-right" onClick={() => handleSort('Monto')}>Monto {sortConfig.key === 'Monto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedTransactions.map((tx, idx) => (
                                <tr key={tx.ID || idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.Descripcion || 'Sin descripción'}</td>
                                    <td className="px-6 py-4">
                                        {tx.Estado === 'Pendiente' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                Pendiente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                Validado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {tx.Categoria}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                    </td>
                                </tr>
                            ))}
                            {sortedTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                        No hay transacciones recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE DESGLOSE (Drill-down) */}
            {selectedDrillDown && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-scaleIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{selectedDrillDown.title}</h3>
                                <p className="text-xs text-gray-500">{selectedDrillDown.transactions.length} movimientos encontrados</p>
                            </div>
                            <button onClick={() => setSelectedDrillDown(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <Plus className="rotate-45 text-gray-400 hover:text-gray-600" size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Fecha')}>Fecha {drillSortConfig.key === 'Fecha' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                        <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Descripcion')}>Descripción {drillSortConfig.key === 'Descripcion' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                        <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Cuenta')}>Cuenta {drillSortConfig.key === 'Cuenta' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                        <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors text-right" onClick={() => handleDrillSort('Monto')}>Monto {drillSortConfig.key === 'Monto' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedDrillTransactions.map((tx, idx) => (
                                        <tr key={tx.ID || idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{tx.Descripcion}</td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">{tx.Cuenta}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                            </td>
                                        </tr>
                                    ))}
                                    {sortedDrillTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400">No hay movimientos en esta selección</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end items-center gap-4">
                            <div className="text-sm">
                                <span className="text-gray-500 mr-2">Total en vista:</span>
                                <span className="font-bold text-gray-800 text-lg">
                                    {formatCurrency(selectedDrillDown.transactions.reduce((acc, curr) => acc + (parseFloat(curr.Monto) || 0), 0))}
                                </span>
                            </div>
                            <button onClick={() => setSelectedDrillDown(null)} className="px-5 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
