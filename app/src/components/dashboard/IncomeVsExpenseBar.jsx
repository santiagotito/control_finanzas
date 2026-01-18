import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { calculateMonthlyTotals, formatCurrency } from '../../utils/financialUtils';

const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    return (
        <text
            x={x + width + 5}
            y={y + 20}
            fill="#6b7280"
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={500}
        >
            {formatCurrency(value)}
        </text>
    );
};

const IncomeVsExpenseBar = ({ transactions }) => {
    const { income, expense } = calculateMonthlyTotals(transactions);

    const data = [
        { name: 'Ingresos', amount: income, color: '#10b981' }, // Emerald-500
        { name: 'Gastos', amount: expense, color: '#ef4444' },  // Red-500
    ];

    if (income === 0 && expense === 0) {
        return <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex items-center justify-center text-gray-400">Sin movimientos este mes</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4">Balance Mensual</h3>
            <div className="flex-1 min-h-0"> {/* min-h-0 allows flex child to shrink properly */}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontWeight: 500 }} />
                        <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="amount" content={<CustomLabel />} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default IncomeVsExpenseBar;
