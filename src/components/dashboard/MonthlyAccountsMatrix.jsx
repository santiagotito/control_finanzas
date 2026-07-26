import React, { useMemo } from 'react';
import { formatCurrency, isEmergencyAccount } from '../../utils/financialUtils';
import { generateProjectedTransactions } from '../../utils/projectionUtils';
import { CalendarRange } from 'lucide-react';

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const monthLabel = (ym) => {
    const [y, m] = ym.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]}-${y.slice(2)}`;
};

const addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Normaliza MesAfectacion/Fecha a "YYYY-MM"
const txMonth = (t) => {
    const raw = t.MesAfectacion || t['Mes Afectación'] || t.Fecha;
    if (!raw) return null;
    return raw.length > 7 ? raw.slice(0, 7) : raw;
};

const Cell = ({ value, bold = false, colorClass = 'text-gray-700' }) => (
    <td className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${colorClass}`}>
        {Math.abs(value) > 0.005 ? formatCurrency(value) : <span className="text-gray-300">—</span>}
    </td>
);

const Row = ({ label, values, labelClass, cellColor, bold = false }) => (
    <tr className="border-b border-gray-100 last:border-0">
        <td className={`px-3 py-1.5 whitespace-nowrap sticky left-0 z-10 text-[11px] font-bold uppercase tracking-wide ${labelClass}`}>
            {label}
        </td>
        {values.map((v, i) => (
            <Cell key={i} value={v} bold={bold} colorClass={cellColor} />
        ))}
    </tr>
);

/**
 * Matriz Meses × Cuentas: cuánto hay (saldo en el mes actual) y cuánto está
 * comprometido (pendientes + proyecciones de reglas) por cuenta y por mes.
 * Los meses pasados van en 0: ese dinero ya está reflejado en el saldo actual.
 */
const MonthlyAccountsMatrix = ({ transactions, recurringRules, accounts, monthsBack = 2, monthsForward = 9 }) => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const months = useMemo(() => {
        const arr = [];
        for (let i = -monthsBack; i <= monthsForward; i++) arr.push(addMonths(currentMonth, i));
        return arr;
    }, [currentMonth, monthsBack, monthsForward]);

    const matrix = useMemo(() => {
        const cardNames = new Set(
            accounts.filter(a => a.Tipo === 'Tarjeta de Crédito').map(a => a.Nombre)
        );

        // key: `${mes}|${cuenta}` -> monto
        const income = {};
        const expense = {};
        const add = (map, month, cuenta, amt) => {
            if (!amt) return;
            const key = `${month}|${cuenta || 'Sin cuenta'}`;
            map[key] = (map[key] || 0) + amt;
        };

        const futureMonths = months.filter(m => m >= currentMonth);

        // 1. Pendientes reales (comprometido ya registrado)
        (transactions || []).forEach(t => {
            if (!t || t.Estado !== 'Pendiente') return;
            const m = txMonth(t);
            if (!m || m < currentMonth || !months.includes(m)) return;
            const amt = parseFloat(t.Monto) || 0;
            if (t.Tipo === 'Ingreso') add(income, m, t.Cuenta, amt);
            else add(expense, m, t.Cuenta, amt);
        });

        // 1b. Validados del mes actual en tarjetas (ya ocurrieron pero deben verse en el dashboard)
        (transactions || []).forEach(t => {
            if (!t || t.Estado !== 'Validado') return;
            const m = txMonth(t);
            if (!m || m !== currentMonth || !cardNames.has(t.Cuenta)) return;
            const amt = parseFloat(t.Monto) || 0;
            if (t.Tipo === 'Ingreso') add(income, currentMonth, t.Cuenta, amt);
            else add(expense, currentMonth, t.Cuenta, amt);
        });

        // 2. Proyecciones de reglas recurrentes (comprometido futuro)
        futureMonths.forEach(m => {
            generateProjectedTransactions(recurringRules || [], m, transactions || []).forEach(v => {
                const amt = parseFloat(v.Monto) || 0;
                if (v.Tipo === 'Ingreso') add(income, m, v.Cuenta, amt);
                else add(expense, m, v.Cuenta, amt);
            });
        });

        // 3. "Cuánto hay": saldo actual de cuentas de dinero, sumado al mes corriente
        accounts.forEach(a => {
            if (a.Tipo === 'Tarjeta de Crédito') return;
            const saldo = parseFloat(a.SaldoActual) || 0;
            if (saldo !== 0) add(income, currentMonth, a.Nombre, saldo);
        });

        // Filas: cuentas registradas + cuentas que aparezcan en los datos
        const emergencyNames = new Set(
            accounts.filter(a => a.Tipo !== 'Tarjeta de Crédito' && isEmergencyAccount(a)).map(a => a.Nombre)
        );
        const namesInData = new Set(
            Object.keys(income).concat(Object.keys(expense)).map(k => k.split('|')[1])
        );
        const moneyNames = accounts
            .filter(a => a.Tipo !== 'Tarjeta de Crédito' && !isEmergencyAccount(a))
            .map(a => a.Nombre);
        [...namesInData].forEach(n => {
            if (!moneyNames.includes(n) && !cardNames.has(n) && !emergencyNames.has(n)) moneyNames.push(n);
        });

        const get = (map, month, cuenta) => map[`${month}|${cuenta}`] || 0;

        const incomeRows = moneyNames.map(name => ({
            name,
            values: months.map(m => get(income, m, name))
        }));
        const expenseRows = moneyNames.map(name => ({
            name,
            values: months.map(m => get(expense, m, name))
        }));
        const cardRows = [...cardNames].map(name => ({
            name,
            values: months.map(m => get(expense, m, name) + get(income, m, name) * -1)
        }));
        // Ahorro/emergencia: movimiento neto del mes (ingresos - gastos), fuera de los totales
        const emergencyRows = [...emergencyNames].map(name => ({
            name,
            values: months.map(m => get(income, m, name) - get(expense, m, name))
        }));

        const incomeTotal = months.map((_, i) => incomeRows.reduce((s, r) => s + r.values[i], 0));
        const expenseTotal = months.map((_, i) =>
            expenseRows.reduce((s, r) => s + r.values[i], 0) +
            cardRows.reduce((s, r) => s + r.values[i], 0)
        );
        const net = months.map((_, i) => incomeTotal[i] - expenseTotal[i]);

        // Ocultar filas totalmente en cero para no llenar la tabla de ruido
        const hasData = (row) => row.values.some(v => Math.abs(v) > 0.005);

        return {
            incomeRows: incomeRows.filter(hasData),
            expenseRows: expenseRows.filter(hasData),
            cardRows: cardRows.filter(hasData),
            emergencyRows: emergencyRows.filter(hasData),
            incomeTotal,
            expenseTotal,
            net
        };
    }, [transactions, recurringRules, accounts, months, currentMonth]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <CalendarRange size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Resumen Mensual por Cuenta</h3>
                        <p className="text-[11px] text-gray-400">
                            Mes actual: saldo disponible + pendientes · Meses futuros: comprometido (pendientes y recurrentes) · Meses pasados: 0 (el dinero ya pasó al saldo)
                        </p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 sticky left-0 z-10 bg-gray-50 text-gray-400 font-bold uppercase text-[10px] min-w-[170px]">Cuenta</th>
                            {months.map(m => (
                                <th
                                    key={m}
                                    className={`px-2 py-2 text-right font-bold whitespace-nowrap min-w-[80px] ${m === currentMonth ? 'bg-indigo-600 text-white' : m < currentMonth ? 'text-gray-300' : 'text-gray-500'}`}
                                >
                                    {monthLabel(m)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* INGRESOS / DISPONIBLE */}
                        {matrix.incomeRows.map(r => (
                            <Row key={`in-${r.name}`} label={r.name} values={r.values} labelClass="bg-emerald-50 text-emerald-800" cellColor="text-emerald-700" />
                        ))}
                        <Row label="Ingreso / Disponible Total" values={matrix.incomeTotal} labelClass="bg-emerald-600 text-white" cellColor="text-emerald-700" bold />

                        {/* GASTOS POR CUENTA */}
                        {matrix.expenseRows.map(r => (
                            <Row key={`ex-${r.name}`} label={`Gasto ${r.name}`} values={r.values} labelClass="bg-red-50 text-red-800" cellColor="text-red-600" />
                        ))}

                        {/* TARJETAS */}
                        {matrix.cardRows.map(r => (
                            <Row key={`card-${r.name}`} label={r.name} values={r.values} labelClass="bg-orange-50 text-orange-800" cellColor="text-orange-700" />
                        ))}
                        <Row label="Total Comprometido" values={matrix.expenseTotal} labelClass="bg-red-600 text-white" cellColor="text-red-600" bold />

                        {/* NETO */}
                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                            <td className="px-3 py-2 sticky left-0 z-10 bg-gray-50 text-gray-800 font-black uppercase text-[11px]">Total Libre</td>
                            {matrix.net.map((v, i) => (
                                <td key={i} className={`px-2 py-2 text-right whitespace-nowrap tabular-nums font-black ${v >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {Math.abs(v) > 0.005 ? formatCurrency(v) : <span className="text-gray-300">—</span>}
                                </td>
                            ))}
                        </tr>

                        {/* AHORRO / EMERGENCIA — fuera de todos los totales */}
                        {matrix.emergencyRows.map(r => (
                            <Row
                                key={`em-${r.name}`}
                                label={`${r.name} (aparte)`}
                                values={r.values}
                                labelClass="bg-emerald-900 text-emerald-100"
                                cellColor="text-emerald-900"
                                bold
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MonthlyAccountsMatrix;
