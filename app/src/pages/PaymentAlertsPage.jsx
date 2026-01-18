import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { getInstallmentInfo } from '../utils/projectionUtils';
import { Bell, CreditCard, Calendar, AlertCircle, CheckCircle2, Info, ArrowRight, Zap } from 'lucide-react';

const PaymentAlertsPage = () => {
    const { accounts, recurringRules, transactions } = useAppContext();
    const today = new Date();
    const currentDay = today.getDate();

    // 1. Optimización de Tarjetas de Crédito
    const cardInsights = useMemo(() => {
        const creditCards = accounts.filter(a => a.Tipo === 'Tarjeta de Crédito');
        if (creditCards.length === 0) return null;

        const analyzedCards = creditCards.map(card => {
            const cutoff = parseInt(card.DiaCorte || 1);
            const payment = parseInt(card.DiaPago || 1);

            // Días restantes para el próximo corte
            let daysToCut;
            if (currentDay < cutoff) {
                daysToCut = cutoff - currentDay;
            } else {
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                daysToCut = (lastDayOfMonth - currentDay) + cutoff;
            }

            return {
                ...card,
                daysToCut,
                paymentDay: payment,
                cutoffDay: cutoff
            };
        });

        // La mejor tarjeta es la que tiene más días para el próximo corte (mayor plazo)
        const recommended = [...analyzedCards].sort((a, b) => b.daysToCut - a.daysToCut)[0];

        return {
            recommended,
            allCards: analyzedCards
        };
    }, [accounts, currentDay]);

    // 2. Alertas de Pagos Escalonados (Cuotas 1/X)
    const installmentAlerts = useMemo(() => {
        // Reglas que son Gastos y tienen Fecha de Fin (indicativo de cuotas/créditos)
        return recurringRules
            .filter(rule => rule.Tipo === 'Gasto' && rule.FechaFin)
            .map(rule => {
                const dateStr = today.toISOString().split('T')[0];
                const installment = getInstallmentInfo(rule, dateStr);
                const dueDay = parseInt(rule.DiaEjecucion);

                let daysToPay;
                if (currentDay <= dueDay) {
                    daysToPay = dueDay - currentDay;
                } else {
                    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                    daysToPay = (lastDayOfMonth - currentDay) + dueDay;
                }

                return {
                    ...rule,
                    installment,
                    daysToPay,
                    isNear: daysToPay <= 7
                };
            })
            .sort((a, b) => a.daysToPay - b.daysToPay);
    }, [recurringRules, currentDay]);

    return (
        <div className="space-y-8 animate-fadeIn">
            <header>
                <h2 className="text-2xl font-bold text-gray-800">Alertas de Pago y Optimización</h2>
                <p className="text-gray-500 text-sm">Estrategias para mejorar tu flujo de caja y recordatorios de cuotas</p>
            </header>

            {/* Recomendación de Tarjeta */}
            {cardInsights && (
                <section className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                            <Zap size={14} className="fill-current" /> Tarjeta Recomendada Hoy
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h3 className="text-3xl font-black mb-1">{cardInsights.recommended.Nombre}</h3>
                                <p className="text-indigo-100 text-sm max-w-md">
                                    Esta es tu mejor opción hoy porque faltan <span className="font-bold text-white text-lg">{cardInsights.recommended.daysToCut} días</span> para su próximo corte, dándote el máximo plazo de financiación disponible.
                                </p>
                            </div>
                            <div className="bg-white text-indigo-700 p-4 rounded-xl flex flex-col items-center justify-center min-w-[140px] shadow-lg">
                                <span className="text-[10px] font-bold uppercase text-indigo-400">Días de Gracia</span>
                                <span className="text-4xl font-black">{cardInsights.recommended.daysToCut}</span>
                                <span className="text-[10px] font-bold uppercase text-indigo-400">Hasta Corte</span>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lista de Tarjetas y sus Estados */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 px-1">
                        <CreditCard size={18} className="text-indigo-500" /> Estados de Tarjetas
                    </h3>
                    <div className="space-y-3">
                        {cardInsights?.allCards.map(card => (
                            <div key={card.ID} className={`bg-white p-4 rounded-xl border transition-all ${card.ID === cardInsights.recommended.ID ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${card.ID === cardInsights.recommended.ID ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <CreditCard size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{card.Nombre}</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">CORTE: DÍA {card.cutoffDay} • PAGO: DÍA {card.paymentDay}</p>
                                        </div>
                                    </div>
                                    {card.ID === cardInsights.recommended.ID && (
                                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">RECOMENDADA</span>
                                    )}
                                </div>
                                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${card.daysToCut < 5 ? 'bg-red-500' : card.daysToCut < 15 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.max(10, (card.daysToCut / 30) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[11px]">
                                    <span className="text-gray-400">Deuda actual: <span className="font-bold text-gray-700">{formatCurrency(Math.abs(card.SaldoActual))}</span></span>
                                    <span className={`${card.daysToCut < 5 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>Cierra en {card.daysToCut} días</span>
                                </div>
                            </div>
                        ))}
                        {(!cardInsights || cardInsights.allCards.length === 0) && (
                            <div className="bg-white p-6 rounded-xl border border-dashed border-gray-200 text-center text-gray-400">
                                <Info size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No hay tarjetas de crédito configuradas</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Próximas Cuotas y Créditos */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 px-1">
                        <Calendar size={18} className="text-emerald-500" /> Vencimientos de Cuotas
                    </h3>
                    <div className="space-y-3">
                        {installmentAlerts.map(rule => (
                            <div key={rule.ID} className={`flex items-center justify-between p-4 rounded-xl border transition-all bg-white ${rule.isNear ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${rule.isNear ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 leading-tight">{rule.Nombre}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-indigo-600">{rule.installment}</span>
                                            <span className="text-[10px] text-gray-400">• Vence el día {rule.DiaEjecucion}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">{formatCurrency(rule.Monto)}</p>
                                    <p className={`text-[10px] font-bold uppercase ${rule.isNear ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
                                        {rule.isNear ? `¡Vence en ${rule.daysToPay} días!` : `En ${rule.daysToPay} días`}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {installmentAlerts.length === 0 && (
                            <div className="bg-white p-6 rounded-xl border border-dashed border-gray-200 text-center text-gray-400">
                                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No tienes créditos o cuotas programadas</p>
                            </div>
                        )}
                    </div>

                    {/* Nota aclaratoria */}
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                        <AlertCircle className="text-amber-600 shrink-0" size={18} />
                        <p className="text-[11px] text-amber-800">
                            <strong>Nota:</strong> Los vencimientos se calculan basados en el "Día de Ejecución" configurado en tus reglas recurrentes. La recomendación de tarjeta busca optimizar tu liquidez dándote más tiempo antes de que la compra se refleje en tu extracto.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentAlertsPage;
