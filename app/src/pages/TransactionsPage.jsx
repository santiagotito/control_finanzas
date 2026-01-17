import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import TransactionForm from '../components/forms/TransactionForm';
import { formatCurrency } from '../utils/financialUtils';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar as CalendarIcon, ArrowRight, Loader2 } from 'lucide-react';
import api from '../services/api';
import { API_URL } from '../config';

const TransactionsPage = () => {
    const { transactions, recurringRules, loading, addTransaction, refreshData } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [processingId, setProcessingId] = useState(null);

    // 1. Filtrar Transacciones Reales del Mes
    const realTransactions = useMemo(() => {
        return transactions.filter(t => t.Fecha.startsWith(selectedDate));
    }, [transactions, selectedDate]);

    // 2. Generar Proyecciones del Mes (Virtuales)
    const projectedTransactions = useMemo(() => {
        const [year, month] = selectedDate.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        return recurringRules.filter(rule => {
            // Validar fechas de inicio/fin de la regla
            const start = new Date(rule.FechaInicio);
            const end = rule.FechaFin ? new Date(rule.FechaFin) : null;
            const currentMonthDate = new Date(year, month - 1, 1); // Primer día del mes seleccionado

            if (currentMonthDate < new Date(start.getFullYear(), start.getMonth(), 1)) return false; // Aún no empieza
            if (end && currentMonthDate > end) return false; // Ya terminó

            // Validar si YA existe una transacción real generada por esta regla este mes
            // (Por simplicidad, asumimos que si hay un gasto con el mismo nombre y monto en este mes, ya se hizo)
            // IDEAL: La regla debería guardar "UltimaEjecucion" en backend, o la transaccion tener "RuleID".
            // Heurística simple: Si hay una transacción real con el mismo Nombre en este mes, no proyectar.
            const alreadyExists = realTransactions.some(t => t.Descripcion === rule.Nombre);
            return !alreadyExists;

        }).map(rule => ({
            ID: `proj-${rule.ID}`,
            Fecha: `${selectedDate}-${String(rule.DiaEjecucion).padStart(2, '0')}`,
            Descripcion: rule.Nombre,
            Categoria: rule.Categoria,
            Cuenta: rule.Cuenta,
            Monto: rule.Monto,
            Tipo: rule.Tipo,
            Estado: 'Proyectado',
            IsVirtual: true,
            OriginalRule: rule
        }));
    }, [recurringRules, selectedDate, realTransactions]);

    // Combinar y ordenar
    const allItems = [...realTransactions, ...projectedTransactions].sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

    // Acciones
    const handleValidate = async (tx) => {
        // Cambiar estado de Pendiente -> Validado
        // Requiere updateTransaction en API (que agregamos soporte genérico)
        if (!window.confirm("¿Confirmar que esta transacción ya aparece en tu extracto/cuenta?")) return;

        setProcessingId(tx.ID);
        // Usamos addTransaction pero como update... espera, backend v3 soporta updateTransaction?
        // Sí, agregamos 'updateTransaction' en backend.gs.
        // Pero en api.js no lo expusimos explícitamente, podemos usar axios directo o agregarlo.
        // Vamos a asumir que updateTransaction existe o usar "add" sobreescribiendo si el ID es igual?
        // El backend v3 tiene `if (action === 'updateTransaction') return updateRow...`.
        // Necesitamos llamarlo. Por ahora simulemos usando api.js updateTransaction si existe, o raw fetch.
        // Revisando api.js anterior... no agregamos updateTransaction para Goals sí, pero Transacciones no explícito.
        // Haremos un patch rápido aquí.

        try {
            // Hot-fix: llamar directo al API para update
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateTransaction',
                    payload: { ID: tx.ID, Estado: 'Validado' }
                })
            });
            await refreshData();
        } catch (e) {
            console.error(e);
            alert("Error al validar");
        } finally {
            setProcessingId(null);
        }
    };

    const handleConfirmProjection = async (proj) => {
        // Convertir Proyección -> Real
        setProcessingId(proj.ID);
        try {
            const newTx = {
                date: proj.Fecha,
                type: proj.Tipo,
                category: proj.Categoria,
                amount: proj.Monto,
                account: proj.Cuenta,
                description: proj.Descripcion,
                // Si es TC -> Pendiente, si no -> Validado. (Backend lo maneja, pero podemos forzar)
                // Dejemos que backend decida o forzamos 'Validado' si el usuario ya dice "Confirmar"?
                // Si confirmó es que YA pasó.
                Estado: 'Validado'
            };

            // Usamos el addTransaction del context que mapea los campos
            // PERO necesitamos pasar 'Estado' extra que no está en el form standard.
            // Modificaremos addTransaction en api.js o enviamos raw.
            // El backend v3 respeta campo 'Estado' si viene.
            // api.js addTransaction mapper: Solo mapea campos fijos. Mierda.
            // Fix: Enviaremos raw request aquí para asegurar.
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'addTransaction',
                    payload: {
                        Fecha: newTx.date,
                        Tipo: newTx.type,
                        Categoria: newTx.category,
                        Monto: newTx.amount,
                        Cuenta: newTx.account,
                        Descripcion: newTx.description,
                        Estado: 'Validado'
                    }
                })
            });

            await refreshData();
        } catch (e) {
            console.error(e);
            alert("Error al confirmar proyección");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Transacciones</h2>
                    <p className="text-gray-500">Historial y Proyecciones</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                    <CalendarIcon size={20} className="text-gray-400" />
                    <input
                        type="month"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="outline-none text-gray-700 font-medium"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario (Solo visible si es mes actual o futuro? No, siempre disponible) */}
                <div className="lg:col-span-1">
                    <TransactionForm onSuccess={refreshData} />
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Cargando movimientos...</div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Fecha</th>
                                            <th className="px-4 py-3 font-medium">Descripción</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                            <th className="px-4 py-3 font-medium text-right">Monto</th>
                                            <th className="px-4 py-3 font-medium text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allItems.map((tx, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${tx.IsVirtual ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="px-4 py-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                                                    {tx.Fecha ? tx.Fecha.split('T')[0] : ''}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className={`font-medium ${tx.IsVirtual ? 'text-indigo-600 italic' : 'text-gray-900'}`}>
                                                        {tx.Descripcion || 'Sin descripción'}
                                                        {tx.IsVirtual && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">Proyectado</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{tx.Categoria} • {tx.Cuenta}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {tx.IsVirtual ? (
                                                        <span className="flex items-center gap-1 text-xs text-indigo-500">
                                                            <Clock size={14} /> Esperado
                                                        </span>
                                                    ) : tx.Estado === 'Pendiente' ? (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                            <AlertCircle size={14} /> Pendiente
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                            <CheckCircle2 size={14} /> Validado
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-4 font-medium whitespace-nowrap text-right ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {tx.IsVirtual ? (
                                                        <button
                                                            onClick={() => handleConfirmProjection(tx)}
                                                            disabled={processingId === tx.ID}
                                                            className="text-xs bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors flex items-center gap-1 mx-auto"
                                                            title="Confirmar: Se convertirá en real"
                                                        >
                                                            {processingId === tx.ID ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Confirmar
                                                        </button>
                                                    ) : tx.Estado === 'Pendiente' && (
                                                        <button
                                                            onClick={() => handleValidate(tx)}
                                                            disabled={processingId === tx.ID}
                                                            className="text-amber-500 hover:text-emerald-600 transition-colors mx-auto"
                                                            title="Marcar como Validado"
                                                        >
                                                            {processingId === tx.ID ? <Loader2 size={18} className="animate-spin" /> : <Circle size={18} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {allItems.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                                    No hay movimientos para este mes
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;
