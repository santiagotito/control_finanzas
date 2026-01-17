import React from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateCategoryTotals, formatCurrency } from '../utils/financialUtils';
import { TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';

const AnalysisPage = () => {
    const { transactions, loading } = useAppContext();

    if (loading) return <div>Cargando...</div>;

    const categoryTotals = calculateCategoryTotals(transactions);
    const totalExpense = categoryTotals.reduce((acc, curr) => acc + curr.value, 0);

    // Identificar mayor gasto
    const topCategory = categoryTotals.length > 0 ? categoryTotals[0] : null;

    // Sugerencia de reducción (ej. 10% si es más del 30% del total)
    let suggestion = null;
    if (topCategory && totalExpense > 0) {
        const percentage = (topCategory.value / totalExpense) * 100;
        if (percentage > 20) {
            const savings = topCategory.value * 0.10;
            suggestion = {
                category: topCategory.name,
                percentage: percentage.toFixed(1),
                savings: savings
            };
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-800">Análisis de Optimización</h2>
                <p className="text-gray-500">Descubre dónde puedes ahorrar más</p>
            </header>

            {/* Insights Panel */}
            {suggestion && (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex items-start gap-4">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                        <Lightbulb size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900 text-lg">Oportunidad de Ahorro Detectada</h3>
                        <p className="text-indigo-800 mt-1">
                            La categoría <span className="font-bold">{suggestion.category}</span> representa el {suggestion.percentage}% de tus gastos totales.
                        </p>
                        <p className="text-indigo-800 mt-2">
                            Si reduces tus gastos en esta categoría un <span className="font-bold">10%</span>, podrías ahorrar <span className="font-bold text-emerald-600 bg-emerald-50 px-2 rounded">{formatCurrency(suggestion.savings)}</span> al mes.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Breakdown Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Distribución de Gastos</h3>
                    <div className="h-80">
                        <CategoryPieChart transactions={transactions} />
                    </div>
                </div>

                {/* Top Categories List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Top Categorías de Gasto</h3>
                    <div className="space-y-4">
                        {categoryTotals.map((cat, idx) => {
                            const percent = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{cat.name}</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(cat.value)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${idx === 0 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-400 text-right">{percent.toFixed(1)}%</div>
                                </div>
                            );
                        })}
                        {categoryTotals.length === 0 && <p className="text-gray-400">Sin datos</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;
