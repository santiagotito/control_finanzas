import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { calculateMonthlyTotals, formatCurrency } from '../../utils/financialUtils';

const BudgetGauge = ({ transactions, budgetLimit = 5000 }) => { // Budget dummy por ahora
    // TODO: Permitir configurar Budget en Settings
    const { expense } = calculateMonthlyTotals(transactions);
    const percentage = Math.min(100, Math.max(0, (expense / budgetLimit) * 100));

    const data = [
        { name: 'Gastado', value: expense },
        { name: 'Restante', value: Math.max(0, budgetLimit - expense) }
    ];

    const cx = 50;
    const cy = 50;
    // No recharts gauge native, using Pie

    const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col items-center justify-center relative">
            <h3 className="font-bold text-gray-800 absolute top-6 left-6">Presupuesto</h3>
            <div className="relative w-full h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            dataKey="value"
                            startAngle={180}
                            endAngle={0}
                            data={data}
                            cx="50%"
                            cy="70%"
                            innerRadius={80}
                            outerRadius={100}
                            paddingAngle={0}
                        >
                            <Cell fill={color} />
                            <Cell fill="#f3f4f6" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-3xl font-bold text-gray-800">{Math.round(percentage)}%</p>
                    <p className="text-sm text-gray-500">Gastado</p>
                    <p className="text-xs text-gray-400 mt-1">{formatCurrency(expense)} / {formatCurrency(budgetLimit)}</p>
                </div>
            </div>
        </div>
    );
};

export default BudgetGauge;
