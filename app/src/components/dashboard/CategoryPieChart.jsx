import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { calculateCategoryTotals, formatCurrency } from '../../utils/financialUtils';

const COLORS = [
    '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b',
    '#3b82f6', '#ef4444', '#10b981', '#f97316', '#64748b'
];

const CategoryPieChart = ({ transactions, onSliceClick }) => {
    const data = calculateCategoryTotals(transactions) || [];
    const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">Sin datos de gastos</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4">Gastos por Categoría</h3>

            <div className="flex flex-col md:flex-row gap-6 flex-1">
                {/* Gráfico */}
                <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                onClick={(entry) => onSliceClick && onSliceClick(entry)}
                                style={{ cursor: 'pointer' }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centro con Total */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <span className="text-xs text-gray-400 uppercase">Total</span>
                        <div className="text-lg font-bold text-gray-700">{formatCurrency(total)}</div>
                    </div>
                </div>

                {/* Tabla de Detalles */}
                <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 border-b border-gray-100 uppercase sticky top-0 bg-white">
                            <tr>
                                <th className="text-left py-2">Cat</th>
                                <th className="text-right py-2">Monto</th>
                                <th className="text-right py-2">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((entry, index) => (
                                <tr
                                    key={index}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => onSliceClick && onSliceClick(entry)}
                                >
                                    <td className="py-2 flex items-center gap-2 text-gray-600">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="truncate max-w-[200px] inline-block" title={entry.name}>{entry.name}</span>
                                    </td>
                                    <td className="py-2 text-right font-medium text-gray-800">
                                        {formatCurrency(entry.value)}
                                    </td>
                                    <td className="py-2 text-right text-gray-400 text-xs">
                                        {Math.round((entry.value / total) * 100)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CategoryPieChart;
