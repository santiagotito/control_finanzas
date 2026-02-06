import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { calculateMonthlyTotals, formatCurrency } from '../../utils/financialUtils';
import { generateProjectedTransactions } from '../../utils/projectionUtils';

const BudgetGauge = ({ transactions, budgetLimit = 0, currentMonthExpense = 0, recurringRules = [] }) => {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'annual'

    // Cálculo de datos según el modo
    const { expenseValue, limitValue, labelText } = useMemo(() => {
        if (viewMode === 'monthly') {
            return {
                expenseValue: currentMonthExpense,
                limitValue: budgetLimit > 0 ? budgetLimit : 1,
                labelText: 'Gastado (Mes)'
            };
        } else {
            // Modo ANUAL (Hasta Diciembre)
            const today = new Date();
            const currentYear = today.getFullYear();
            let totalProjectedExpense = 0;
            let totalProjectedIncome = 0;

            // 1. Sumar lo que ya pasó en el año (Transacciones Reales de Enero a Hoy)
            (transactions || []).forEach(t => {
                const d = new Date(t.Fecha || t.MesAfectacion);
                if (d.getFullYear() === currentYear) {
                    const amt = parseFloat(t.Monto) || 0;
                    if (t.Tipo === 'Gasto') totalProjectedExpense += amt;
                    else if (t.Tipo === 'Ingreso') totalProjectedIncome += amt;
                }
            });

            // 2. Sumar Proyecciones Futuras (Mes actual + 1 hasta Diciembre)
            // Nota: Para el mes actual, se asume que las 'Reales' ya incluyen lo pagado, faltaría sumar solo lo 'Pendiente' proyectado?
            // Para simplificar y ser conservadores: Generamos proyecciones desde el mes SIGUIENTE hasta Diciembre.
            // LO IDEAL: Proyectar desde HOY hasta 31-Dic.

            const startMonth = today.getMonth() + 1; // Próximo mes
            if (startMonth < 12) {
                for (let m = startMonth; m < 12; m++) {
                    const d = new Date(currentYear, m, 1);
                    const yearMonth = d.toISOString().slice(0, 7);

                    // Generar virtuales
                    const virtuals = generateProjectedTransactions(recurringRules, yearMonth, transactions);
                    virtuals.forEach(v => {
                        const amt = parseFloat(v.Monto) || 0;
                        if (v.Tipo === 'Gasto') totalProjectedExpense += amt;
                        else if (v.Tipo === 'Ingreso') totalProjectedIncome += amt;
                    });
                }
            }

            // Para el mes ACTUAL, sumamos lo PENDIENTE de las proyecciones (que no sea real) para completar
            // Ya tenemos las reales sumadas arriba.
            // (Simplificación: Usamos lo acumulado real + proyecciones futuras para "Annual Forecast")

            return {
                expenseValue: totalProjectedExpense,
                limitValue: totalProjectedIncome > 0 ? totalProjectedIncome : (totalProjectedExpense * 1.2), // Si no hay ingresos, gap del 20%
                labelText: 'Proyectado (Año)'
            };
        }
    }, [viewMode, transactions, budgetLimit, currentMonthExpense, recurringRules]);

    // Porcentaje (Permitir que supere el 100% para mostrar sobregiro)
    const percentage = Math.max(0, (expenseValue / limitValue) * 100);

    const data = [
        { name: 'Gastado', value: Math.min(expenseValue, limitValue) },
        { name: 'Excedente', value: Math.max(0, expenseValue - limitValue) },
        { name: 'Restante', value: Math.max(0, limitValue - expenseValue) }
    ];

    const cx = 50;
    const cy = 50;

    const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col items-center justify-center relative">
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                <h3 className="font-bold text-gray-800">Presupuesto</h3>
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="text-xs border border-gray-200 rounded-md p-1 bg-gray-50 text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual (Est.)</option>
                </select>
            </div>

            <div className="relative w-full h-full flex items-center justify-center mt-4">
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
                            stroke="none"
                        >
                            <Cell fill={percentage > 90 ? '#ef4444' : '#10b981'} /> {/* Gastado */}
                            <Cell fill="#ef4444" /> {/* Excedente (Siempre rojo si existe) */}
                            <Cell fill="#f3f4f6" /> {/* Restante */}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-3xl font-bold text-gray-800">{Math.round(percentage)}%</p>
                    <p className="text-sm text-gray-500">{labelText}</p>
                    <p className="text-xs text-coolGray-400 mt-1 whitespace-nowrap">{formatCurrency(expenseValue)} / {formatCurrency(limitValue)}</p>
                </div>
            </div>
        </div>
    );
};

export default BudgetGauge;
