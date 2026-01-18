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

        return {
            incomeReal,
            expenseReal,
            pendingIncome,
            pendingExpense,
            balanceReal: incomeReal - expenseReal,
            balanceTotal: (incomeReal + pendingIncome) - (expenseReal + pendingExpense),
            budgetLimit // Pasaremos esto al Gauge
        };
    }, [transactions, selectedMonth, selectedAccount]);

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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
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
                        transactions={transactions}
                        budgetLimit={stats.budgetLimit}
                        currentMonthExpense={stats.expenseReal + stats.pendingExpense}
                        recurringRules={recurringRules}
                    />
                    <IncomeVsExpenseBar transactions={transactions} />
                </div>

                {/* FILA 2: Flujo de Caja Proyectado (100%) */}
                <ProjectedCashFlow
                    transactions={transactions}
                    recurringRules={recurringRules}
                    currentBalance={stats.balanceReal}
                    selectedAccount={selectedAccount}
                />

                {/* FILA 3: Categorías (100%) */}
                <CategoryPieChart transactions={transactions} />

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
                                <th className="px-6 py-3 font-medium">Fecha</th>
                                <th className="px-6 py-3 font-medium">Descripción</th>
                                <th className="px-6 py-3 font-medium">Estado</th>
                                <th className="px-6 py-3 font-medium">Categoría</th>
                                <th className="px-6 py-3 font-medium text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.slice(0, 10).map((tx, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
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
                            {transactions.length === 0 && (
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
        </div >
    );
};

export default Dashboard;
