import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import BudgetGauge from '../components/dashboard/BudgetGauge';
import CashFlowChart from '../components/dashboard/CashFlowChart';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import IncomeVsExpenseBar from '../components/dashboard/IncomeVsExpenseBar';
import DeferredCalculator from '../components/tools/DeferredCalculator';
import { Plus, X } from 'lucide-react';
import { calculateMonthlyTotals, formatCurrency } from '../utils/financialUtils';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { loading, error, transactions } = useAppContext();
    const [showCalculator, setShowCalculator] = useState(false);

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

    const { balance } = calculateMonthlyTotals(transactions);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel Principal</h2>
                    <p className="text-gray-500">Resumen de este mes</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 hidden sm:block">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Balance Mensual</span>
                        <div className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(balance)}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                    >
                        {showCalculator ? 'Ocultar Calc' : 'Calculadora'}
                    </button>

                    <Link to="/transactions" className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                        <Plus size={24} />
                    </Link>
                </div>
            </header>

            {/* Calculadora Expandible */}
            {showCalculator && (
                <div className="animate-fadeIn">
                    <DeferredCalculator />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI: Presupuesto (Gauge) */}
                <BudgetGauge transactions={transactions} />

                {/* KPI: Balance (Barra) */}
                <IncomeVsExpenseBar transactions={transactions} />

                {/* KPI: Flujo de Caja (Nuevo) */}
                <CashFlowChart transactions={transactions} />

                {/* KPI: Categorías (Pastel) */}
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
                                <th className="px-6 py-3 font-medium">Categoría</th>
                                <th className="px-6 py-3 font-medium text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.slice(0, 5).map((tx, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.Descripcion || 'Sin descripción'}</td>
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
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                        No hay transacciones recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
