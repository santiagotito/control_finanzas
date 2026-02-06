import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '../../utils/financialUtils';
import { parseISO, format, getMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';

const CashFlowChart = ({ transactions }) => {
    // 1. Agrupar por mes de PAGO REAL
    const monthlyData = {};

    transactions.forEach(tx => {
        // Usar FechaPagoReal si existe, si no Fecha normal
        // El backend debe haber rellenado FechaPagoReal para todas (si no, fallback a Fecha)
        const dateToUse = tx.FechaPagoReal ? parseISO(tx.FechaPagoReal) : parseISO(tx.Fecha);
        if (isNaN(dateToUse)) return; // Skip invalid dates

        const monthKey = format(dateToUse, 'yyyy-MM'); // "2024-02"
        const monthLabel = format(dateToUse, 'MMM yy', { locale: es });

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthKey,
                label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
                ingresos: 0,
                pagos: 0, // Incluye gastos efectivos y cuotas TC que vencen este mes
            };
        }

        const amount = parseFloat(tx.Monto);
        if (tx.Tipo === 'Ingreso') {
            monthlyData[monthKey].ingresos += amount;
        } else if (tx.Tipo === 'Gasto') {
            monthlyData[monthKey].pagos += amount;
        }
    });

    // 2. Convertir a array y ordenar
    const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Tomar últimos 6 meses (o futuros si hay cuotas)
    // Mostremos una ventana de rango dinámico

    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">Sin datos de flujo de caja</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-96">
            <h3 className="font-bold text-gray-800 mb-2">Flujo de Caja Real (Cash Flow)</h3>
            <p className="text-sm text-gray-500 mb-4">Ingresos vs. Pagos reales (incluyendo vencimientos de Tarjeta)</p>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="pagos" name="Pagos Reales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CashFlowChart;
