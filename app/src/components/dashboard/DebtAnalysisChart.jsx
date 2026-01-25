import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/financialUtils';
import { getRuleStatus } from '../../utils/projectionUtils';

const DebtAnalysisChart = ({ accounts, recurringRules, transactions }) => {
    const data = React.useMemo(() => {
        const debtByAccount = {};

        // 1. Deuda de Tarjetas de Crédito (Saldo Actual)
        accounts.filter(a => a.Tipo === 'Tarjeta de Crédito').forEach(acc => {
            const name = acc.Nombre;
            if (!debtByAccount[name]) debtByAccount[name] = { name, tarjeta: 0, cuotas: 0, total: 0 };
            const balance = Math.abs(acc.SaldoActual || 0);
            debtByAccount[name].tarjeta += balance;
            debtByAccount[name].total += balance;
        });

        // 2. Compromisos de Cuotas Recurrentes
        recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin).forEach(rule => {
            const name = rule.Cuenta || 'Sin Cuenta';
            if (!debtByAccount[name]) debtByAccount[name] = { name, tarjeta: 0, cuotas: 0, total: 0 };
            const status = getRuleStatus(rule, transactions);
            debtByAccount[name].cuotas += status.totalDebt;
            debtByAccount[name].total += status.totalDebt;
        });

        return Object.values(debtByAccount).sort((a, b) => b.total - a.total);
    }, [accounts, recurringRules, transactions]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
                    <p className="font-bold text-gray-800 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span> {formatCurrency(entry.value)}
                        </p>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-50">
                        <p className="text-sm font-black text-gray-900">
                            Total: {formatCurrency(payload.reduce((sum, e) => sum + e.value, 0))}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) return (
        <div className="h-full flex items-center justify-center text-gray-400 italic">
            No hay deudas registradas
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Bar dataKey="tarjeta" name="Saldo Tarjeta" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="cuotas" name="Cuotas Pendientes" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default DebtAnalysisChart;
