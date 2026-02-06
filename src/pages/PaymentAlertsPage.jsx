import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/financialUtils';
import { getRuleStatus } from '../utils/projectionUtils';
import { useSmartInsights } from '../hooks/useSmartInsights';
import { Bell, CreditCard, Calendar, AlertCircle, CheckCircle2, Info, ArrowRight, Zap, Plus, TrendingDown, ShieldAlert, BadgeInfo, HelpCircle, BookOpen } from 'lucide-react';

const PaymentAlertsPage = () => {
    const { accounts, recurringRules, transactions } = useAppContext();
    const { cardInsights, smartInsights } = useSmartInsights();
    const [selectedDrillDown, setSelectedDrillDown] = React.useState(null); // { title, items, type: 'cards' | 'commitments' | 'total' }
    const today = new Date();
    const currentDay = today.getDate();

    // 2. Alertas de Pagos Escalonados (Cuotas 1/X) Agrupadas por Cuenta
    const groupedInstallments = useMemo(() => {
        // ... (existing logic)
        const flatAlerts = recurringRules
            .filter(rule => rule.Tipo === 'Gasto' && rule.FechaFin)
            .map(rule => {
                const status = getRuleStatus(rule, transactions);
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
                    installment: status.nextInstallment,
                    remainingDebt: status.totalDebt,
                    daysToPay,
                    isNear: daysToPay <= 7 && status.nextInstallment !== 'Completado',
                    isCompleted: status.nextInstallment === 'Completado'
                };
            })
            .filter(alert => !alert.isCompleted);

        // Agrupar
        const grouped = flatAlerts.reduce((acc, curr) => {
            const accName = curr.Cuenta || 'Sin Cuenta';
            if (!acc[accName]) {
                acc[accName] = {
                    items: [],
                    totalAmount: 0,
                    isAnyNear: false
                };
            }
            acc[accName].items.push(curr);
            acc[accName].totalAmount += parseFloat(curr.Monto) || 0;
            if (curr.isNear) acc[accName].isAnyNear = true;
            return acc;
        }, {});

        Object.values(grouped).forEach(group => {
            group.items.sort((a, b) => a.daysToPay - b.daysToPay);
        });

        return grouped;
    }, [recurringRules, transactions, currentDay, today]);


    return (
        <div className="space-y-8 animate-fadeIn">
            <header>
                <h2 className="text-2xl font-bold text-gray-800">Alertas de Pago y Optimización</h2>
                <p className="text-gray-500 text-sm">Estrategias para mejorar tu flujo de caja y recordatorios de cuotas</p>
            </header>

            {cardInsights && (
                <section className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden mb-6">
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

            {/* Smart Advice Section */}
            {smartInsights.length > 0 && (
                <section className="space-y-4">
                    <h3 className="font-black text-gray-800 flex items-center gap-2 px-1 uppercase tracking-tighter text-sm">
                        <BadgeInfo size={18} className="text-indigo-500" /> Estrategia y Recomendaciones
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {smartInsights.map(insight => (
                            <div key={insight.id} className={`p-4 rounded-2xl border flex gap-4 transition-all hover:shadow-md ${insight.type === 'danger' ? 'bg-red-50 border-red-100' :
                                insight.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                                    'bg-indigo-50 border-indigo-100'
                                }`}>
                                <div className="shrink-0 p-3 bg-white rounded-xl shadow-sm h-fit">
                                    {insight.type === 'danger' ? <ShieldAlert className="text-red-500" /> :
                                        insight.type === 'warning' ? <TrendingDown className="text-orange-500" /> :
                                            <Zap className="text-indigo-500" />}
                                </div>
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-800 text-sm leading-tight">{insight.title}</h4>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${insight.type === 'danger' ? 'bg-red-200 text-red-700' :
                                            insight.type === 'warning' ? 'bg-orange-200 text-orange-700' :
                                                'bg-indigo-200 text-indigo-700'
                                            }`}>{insight.action}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium leading-normal">{insight.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Resumen de Deuda Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    onClick={() => setSelectedDrillDown({
                        title: 'Desglose de Deuda en Tarjetas',
                        type: 'cards',
                        items: accounts.filter(a => a.Tipo === 'Tarjeta de Crédito')
                    })}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-red-200 hover:shadow-md transition-all group"
                >
                    <p className="text-xs font-bold text-gray-400 uppercase group-hover:text-red-400 transition-colors">Deuda en Tarjetas</p>
                    <p className="text-2xl font-black text-red-600">
                        {formatCurrency(accounts.filter(a => a.Tipo === 'Tarjeta de Crédito').reduce((sum, a) => sum + Math.abs(a.SaldoActual || 0), 0))}
                    </p>
                </div>
                <div
                    onClick={() => setSelectedDrillDown({
                        title: 'Desglose de Compromisos a Futuro',
                        type: 'commitments',
                        items: recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin).map(r => ({ ...r, status: getRuleStatus(r, transactions) }))
                    })}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-amber-200 hover:shadow-md transition-all group"
                >
                    <p className="text-xs font-bold text-gray-400 uppercase group-hover:text-amber-400 transition-colors">Compromisos a Futuro</p>
                    <p className="text-2xl font-black text-amber-600">
                        {formatCurrency(recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin).reduce((sum, r) => sum + getRuleStatus(r, transactions).totalDebt, 0))}
                    </p>
                </div>
                <div
                    onClick={() => setSelectedDrillDown({
                        title: 'Endeudamiento Total Consolidado',
                        type: 'total',
                        items: {
                            cards: accounts.filter(a => a.Tipo === 'Tarjeta de Crédito'),
                            commitments: recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin).map(r => ({ ...r, status: getRuleStatus(r, transactions) }))
                        }
                    })}
                    className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                    <p className="text-xs font-bold text-indigo-400 uppercase group-hover:text-indigo-600 transition-colors">Endeudamiento Total</p>
                    <p className="text-2xl font-black text-indigo-700">
                        {formatCurrency(
                            accounts.filter(a => a.Tipo === 'Tarjeta de Crédito').reduce((sum, a) => sum + Math.abs(a.SaldoActual || 0), 0) +
                            recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin).reduce((sum, r) => sum + getRuleStatus(r, transactions).totalDebt, 0)
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lista de Tarjetas y sus Estados */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 px-1">
                        <CreditCard size={18} className="text-indigo-500" /> Detalle de Tarjetas y Tiempos
                        <div className="group relative">
                            <HelpCircle size={14} className="text-gray-400 cursor-help" />
                            <div className="invisible group-hover:visible absolute left-full ml-2 top-0 w-64 p-3 bg-gray-800 text-white text-[10px] rounded-xl z-50 shadow-xl leading-relaxed">
                                <p className="font-black mb-1 uppercase text-indigo-300">¿Qué miramos aquí?</p>
                                Analizamos cuánto tiempo falta para que tu tarjeta "corte" (cierre de facturación). Entre más lejos esté el corte, más tiempo tienes para pagar lo que compres hoy.
                            </div>
                        </div>
                    </h3>
                    <div className="space-y-3">
                        {cardInsights?.allCards.map(card => {
                            const isRecommended = card.ID === cardInsights.recommended.ID;
                            const isUrgent = card.daysToCut < 5;
                            const isNeutral = card.daysToCut >= 5 && card.daysToCut < 20;
                            const isPeaceful = card.daysToCut >= 20;

                            // Calcular saldo real igual que en AccountsPage
                            const accName = String(card.Nombre || '').trim().toUpperCase();
                            const balance = Math.abs(transactions
                                .filter(tx => String(tx.Cuenta || '').trim().toUpperCase() === accName)
                                .reduce((acc, tx) => acc + (tx.Tipo === 'Ingreso' ? parseFloat(tx.Monto || 0) : -parseFloat(tx.Monto || 0)), 0));

                            return (
                                <div key={card.ID} className={`bg-white p-4 rounded-xl border transition-all ${isRecommended ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isRecommended ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{card.Nombre}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">CORTE: {card.cutoffDay} • PAGO: {card.paymentDay}</span>
                                                    {isRecommended && <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Ideal Hoy</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900 leading-none">{formatCurrency(balance)}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Deuda actual</p>
                                        </div>
                                    </div>

                                    {/* Nueva visualización de tiempo */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                            {[...Array(30)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-full flex-1 border-r border-white last:border-0 ${30 - i <= card.daysToCut
                                                        ? (isUrgent ? 'bg-red-500' : isNeutral ? 'bg-amber-400' : 'bg-indigo-500')
                                                        : 'bg-transparent'
                                                        }`}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px]">
                                        <div className="flex items-center gap-1">
                                            {isUrgent ? (
                                                <span className="text-red-600 font-black flex items-center gap-1 animate-pulse">
                                                    <AlertCircle size={12} /> CORTE INMINENTE
                                                </span>
                                            ) : isPeaceful ? (
                                                <span className="text-indigo-600 font-black flex items-center gap-1">
                                                    <Zap size={12} /> MÁXIMA GRACIA (30 DÍAS)
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 font-bold">CICLO INTERMEDIO</span>
                                            )}
                                        </div>
                                        <span className={`font-bold ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                                            Faltan {card.daysToCut} días para el cierre
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
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
                    <div className="space-y-6">
                        {Object.entries(groupedInstallments).map(([accountName, group]) => (
                            <div key={accountName} className="space-y-3">
                                <div className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <ArrowRight size={12} className="text-indigo-400" /> {accountName}
                                    </span>
                                    <span className="text-xs font-black text-gray-700">{formatCurrency(group.totalAmount)}</span>
                                </div>

                                <div className="space-y-2">
                                    {group.items.map(rule => (
                                        <div key={rule.ID} className={`flex items-center justify-between p-3 rounded-xl border transition-all bg-white ${rule.isNear ? 'border-red-100 bg-red-50/30' : 'border-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${rule.isNear ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Calendar size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 leading-tight">{rule.Nombre}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-indigo-600">{rule.installment}</span>
                                                        <span className="text-[10px] text-gray-400">• Día {rule.DiaEjecucion}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-gray-900">{formatCurrency(rule.Monto)}</p>
                                                <p className={`text-[9px] font-bold uppercase ${rule.isNear ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
                                                    {rule.isNear ? `¡Vence en ${rule.daysToPay} ds!` : `En ${rule.daysToPay} días`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {Object.keys(groupedInstallments).length === 0 && (
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

            {/* Modal de Desglose */}
            {selectedDrillDown && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-scaleIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{selectedDrillDown.title}</h3>
                                <p className="text-xs text-gray-500 font-medium">Visualización de montos detallados</p>
                            </div>
                            <button onClick={() => setSelectedDrillDown(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <Plus className="rotate-45 text-gray-400 hover:text-gray-600" size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {(selectedDrillDown.type === 'cards' || selectedDrillDown.type === 'total') && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        Deuda en Tarjetas
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(selectedDrillDown.type === 'total' ? selectedDrillDown.items.cards : selectedDrillDown.items).map(card => (
                                            <div key={card.ID} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-red-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard size={16} className="text-gray-400" />
                                                    <span className="text-sm font-bold text-gray-700">{card.Nombre}</span>
                                                </div>
                                                <span className="font-black text-red-600">{formatCurrency(Math.abs(card.SaldoActual || 0))}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(selectedDrillDown.type === 'commitments' || selectedDrillDown.type === 'total') && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                        Compromisos a Futuro
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(selectedDrillDown.type === 'total' ? selectedDrillDown.items.commitments : selectedDrillDown.items).map(rule => (
                                            <div key={rule.ID} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-100 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <Calendar size={16} className="text-gray-400" />
                                                        <span className="text-sm font-bold text-gray-700">{rule.Nombre}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-7">
                                                        <span className="text-[10px] font-bold text-indigo-500">{rule.status.nextInstallment}</span>
                                                        <span className="text-[10px] text-gray-400">• Cuenta: {rule.Cuenta}</span>
                                                    </div>
                                                </div>
                                                <span className="font-black text-amber-600">{formatCurrency(rule.status.totalDebt)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                            <div className="text-sm">
                                <span className="text-gray-500 font-medium mr-2">Total General:</span>
                                <span className="font-black text-gray-900 text-xl">
                                    {formatCurrency(
                                        (selectedDrillDown.type === 'cards' || selectedDrillDown.type === 'total'
                                            ? (selectedDrillDown.type === 'total' ? selectedDrillDown.items.cards : selectedDrillDown.items).reduce((s, c) => s + Math.abs(c.SaldoActual || 0), 0)
                                            : 0) +
                                        (selectedDrillDown.type === 'commitments' || selectedDrillDown.type === 'total'
                                            ? (selectedDrillDown.type === 'total' ? selectedDrillDown.items.commitments : selectedDrillDown.items).reduce((s, r) => s + r.status.totalDebt, 0)
                                            : 0)
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDrillDown(null)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Glosario Educativo */}
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-8">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <BookOpen size={18} className="text-indigo-500" /> Glosario: Optimiza tu Dinero
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-indigo-600 uppercase">Día de Corte</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Es el día que el banco cierra tu cuenta del mes. Lo que compres <strong>un día después</strong> de este corte, no lo pagarás en el próximo mes, sino en el siguiente (ganas hasta 45 días de financiación gratis).
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-indigo-600 uppercase">Máxima Gracia</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Significa que tu tarjeta acaba de cortar hace poco. Es el <strong>momento de oro</strong> para hacer compras grandes, ya que tendrás el tiempo máximo permitido por la ley para pagar sin intereses.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-orange-600 uppercase">Corte Inminente</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Faltan menos de 5 días para que cierre tu mes. Si compras algo hoy, te tocará pagarlo en un par de semanas. <strong>¡Mejor espera a que pase el corte!</strong>
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-emerald-600 uppercase">Ideal Hoy</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Esta tarjeta es la que más te conviene usar en este momento exacto para que tu dinero rinda más, basándonos en tu calendario de pagos.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PaymentAlertsPage;
