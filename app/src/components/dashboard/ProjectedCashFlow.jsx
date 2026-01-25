
import React, { useMemo } from 'react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, LabelList
} from 'recharts';
import { generateProjectedTransactions } from '../../utils/projectionUtils';
import { formatCurrency } from '../../utils/financialUtils';

const ProjectedCashFlow = ({ transactions, recurringRules, currentBalance = 0, selectedAccount = 'Todas' }) => {
    const [monthsToProject, setMonthsToProject] = React.useState(12);

    const data = useMemo(() => {
        if (!recurringRules || recurringRules.length === 0) return [];

        const result = [];
        const today = new Date();

        // Proyectar X meses
        for (let i = 0; i < monthsToProject; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const yearMonth = d.toISOString().slice(0, 7); // YYYY-MM
            const monthName = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

            // 1. Obtener transacciones REALES ya existentes para ese mes y cuenta
            const realInMonth = (transactions || []).filter(t => {
                // Filtro por Cuenta
                if (selectedAccount !== 'Todas' && t.Cuenta !== selectedAccount) return false;

                // Filtro por Fecha (Normalización robusta)
                let rawDate = t.MesAfectacion || t.Fecha;
                if (!rawDate) return false;
                // Si ISO full date, cortar. Si ya es YYYY-MM, usar directo.
                const target = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;

                return target === yearMonth;
            });

            // 2. Generar VIRTUALES (evitando duplicados con las reales)
            // Filtramos reglas por cuenta antes
            const applicableRules = recurringRules.filter(r => selectedAccount === 'Todas' || r.Cuenta === selectedAccount);
            const virtuals = generateProjectedTransactions(applicableRules, yearMonth, transactions);

            // 3. Combinar
            const all = [...realInMonth, ...virtuals];

            // 4. Sumar
            let income = 0;
            let expense = 0;

            all.forEach(t => {
                if (t.Estado === 'Omitido') return;

                const amount = parseFloat(t.Monto) || 0;
                if (t.Tipo === 'Ingreso') income += amount;
                else expense += amount;
            });

            // 5. Balance MENSUAL (Net Flow) = Ingresos - Gastos
            // User request: "Balance es Ingresos menos Gastos"
            const netFlow = income - expense;

            result.push({
                name: monthName,
                Ingresos: income,
                Gastos: expense,
                Balance: netFlow, // Ahora representa el flujo neto del mes
            });
        }
        return result;
    }, [transactions, recurringRules, monthsToProject]);

    const totalBalance = useMemo(() => data.reduce((sum, item) => sum + item.Balance, 0), [data]);

    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">Sin proyecciones configuradas</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-gray-800">Flujo de Caja Proyectado</h3>
                    <p className="text-xs text-gray-500">Neto Mensual (Ingresos - Gastos)</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
                        {[6, 12, 24].map(m => (
                            <button
                                key={m}
                                onClick={() => setMonthsToProject(m)}
                                className={`px-3 py-1 rounded-md transition-all ${monthsToProject === m ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {m} Meses
                            </button>
                        ))}
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-blue-600 font-bold block leading-none">TOTAL PROYECTADO</span>
                        <span className={`text-sm font-bold ${totalBalance < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                            {formatCurrency(totalBalance)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-full h-72" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />

                        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} stackId="a" />
                        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} stackId="b" />

                        {/* Linea de Flujo Neto Mensual */}
                        <Line
                            type="monotone"
                            dataKey="Balance"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 5 }}
                        >
                            <LabelList
                                dataKey="Balance"
                                position="top"
                                content={(props) => {
                                    const { x, y, value } = props;
                                    if (value === 0) return null;
                                    return (
                                        <g>
                                            <rect
                                                x={x - 22}
                                                y={y - 22}
                                                width={44}
                                                height={14}
                                                rx={7}
                                                fill={value < 0 ? '#f59e0b' : '#3b82f6'}
                                            />
                                            <text
                                                x={x}
                                                y={y - 14}
                                                fill="#fff"
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                style={{ fontSize: '9px', fontWeight: 'bold' }}
                                            >
                                                {Math.abs(value) > 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}
                                            </text>
                                        </g>
                                    );
                                }}
                            />
                        </Line>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProjectedCashFlow;
