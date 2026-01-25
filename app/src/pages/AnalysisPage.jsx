import React from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, getFinancialKPIs } from '../utils/financialUtils';
import { TrendingUp, AlertTriangle, ShieldCheck, Activity, Target, BrainCircuit, Wallet, PiggyBank, X } from 'lucide-react';
import { getRuleStatus } from '../utils/projectionUtils';

const AnalysisPage = () => {
    const { transactions, accounts, recurringRules, loading } = useAppContext();
    const [selectedDrillDown, setSelectedDrillDown] = React.useState(null);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin text-indigo-600"><Activity size={32} /></div>
        </div>
    );

    const kpis = getFinancialKPIs(transactions, accounts);

    // Calcular compromisos futuros para sumarlos a la deuda total en el reporte
    const futureCommitments = recurringRules
        .filter(r => r.Tipo === 'Gasto' && r.FechaFin)
        .reduce((sum, r) => sum + getRuleStatus(r, transactions).totalDebt, 0);

    const realTotalDebt = kpis.totalDebt + futureCommitments;

    // Cálculo de Libertad Financiera (Basado en Fechas de Término Real)
    const monthlySurplus = kpis.monthlyIncome - kpis.monthlyExpense;
    let debtFreeDate = null;
    let monthsToFreedom = 0;

    // Buscar la fecha más lejana de las deudas recurrentes
    const activeDebtRules = recurringRules.filter(r => r.Tipo === 'Gasto' && r.FechaFin && getRuleStatus(r, transactions).totalDebt > 0);

    if (activeDebtRules.length > 0) {
        // Encontrar la fecha máxima
        const maxDate = activeDebtRules.reduce((max, r) => {
            const date = new Date(r.FechaFin);
            return date > max ? date : max;
        }, new Date()); // Start from now

        if (maxDate > new Date()) {
            debtFreeDate = maxDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

            // Calcular diferencia en meses
            const now = new Date();
            monthsToFreedom = (maxDate.getFullYear() - now.getFullYear()) * 12 + (maxDate.getMonth() - now.getMonth());
        }
    } else if (realTotalDebt > 0 && monthlySurplus > 0) {
        // Fallback para deuda que NO es recurrente (ej. solo saldo en tarjeta)
        monthsToFreedom = Math.ceil(realTotalDebt / monthlySurplus);
        const d = new Date();
        d.setMonth(d.getMonth() + monthsToFreedom);
        debtFreeDate = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    }
    const diagnosis = [];
    if (kpis.savingsRate >= 20) diagnosis.push({ type: 'good', text: 'Excelente hábito de ahorro (>20% del ingreso).' });
    else if (kpis.savingsRate > 0) diagnosis.push({ type: 'neutral', text: 'Ahorras, pero podrías mejorar para llegar al 20% ideal.' });
    else diagnosis.push({ type: 'bad', text: 'Estás gastando más de lo que ganas (Déficit).' });

    if (kpis.survivalDays < 30) diagnosis.push({ type: 'bad', text: 'Fondo de emergencia bajo. Menos de 1 mes de supervivencia.' });
    else if (kpis.survivalDays > 90) diagnosis.push({ type: 'good', text: 'Fondo de emergencia sólido (>3 meses cubiertos).' });

    if (realTotalDebt > kpis.monthlyIncome * 3) diagnosis.push({ type: 'bad', text: 'Nivel de endeudamiento crítico (>3x ingreso mensual).' });

    // Generar Receta (Acciones)
    const recipe = [];
    if (kpis.score < 60) {
        recipe.push("Detén gastos no esenciales inmediatamente.");
        recipe.push("Prioriza pagar la tarjeta con la deuda más pequeña (Bola de Nieve) para liberar flujo.");
    } else if (kpis.score < 80) {
        recipe.push("Aumenta tu ahorro automático un 5%.");
        recipe.push("Revisa tus suscripciones recurrentes, podrías cancelar alguna.");
    } else {
        recipe.push("Es momento de invertir el excedente de liquidez.");
        recipe.push("Plantéate una meta de ahorro más ambiciosa (vacaciones, inversión).");
    }

    const getScoreColor = (s) => {
        if (s >= 80) return 'text-emerald-500';
        if (s >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBg = (s) => {
        if (s >= 80) return 'bg-emerald-50 border-emerald-100';
        if (s >= 60) return 'bg-amber-50 border-amber-100';
        return 'bg-red-50 border-red-100';
    };

    return (
        <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                        <BrainCircuit size={24} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-800">Informe Ejecutivo Financiero</h2>
                </div>
                <p className="text-gray-500 ml-12">Diagnóstico gerencial de tu salud financiera actual.</p>
            </header>

            {/* SECCIÓN 1: EL SCORE (SEMÁFORO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center shadow-lg transform transition-all hover:scale-[1.02] ${getScoreBg(kpis.score)}`}>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">Tu Score Financiero</p>
                    <div className={`text-8xl font-black mb-2 ${getScoreColor(kpis.score)}`}>
                        {Math.round(kpis.score)}
                    </div>
                    <p className="text-gray-600 font-medium px-4">
                        {kpis.score >= 80 ? "SÓLIDO. Estás gestionando tus finanzas como un pro." :
                            kpis.score >= 60 ? "ESTABLE. Vas bien, pero hay margen de optimización." :
                                "CRÍTICO. Se requiere intervención inmediata."}
                    </p>
                </div>

                {/* KPI CARDS RAPIDOS */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><PiggyBank size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Tasa de Ahorro</p>
                                <p className="font-black text-xl text-gray-800">{kpis.savingsRate.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${kpis.savingsRate >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            Meta: 20%
                        </div>
                    </div>

                    <div
                        onClick={() => setSelectedDrillDown({
                            title: 'Detalle de Deuda Total',
                            transactions: [], // Not based on transactions but rules
                            customContent: (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 mb-2">Compromisos recurrentes pendientes:</p>
                                    {recurringRules
                                        .filter(r => r.Tipo === 'Gasto' && r.FechaFin && getRuleStatus(r, transactions).totalDebt > 0)
                                        .map((r, idx) => {
                                            const status = getRuleStatus(r, transactions);
                                            return (
                                                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                                                    <div>
                                                        <p className="font-bold text-gray-800">{r.Nombre}</p>
                                                        <p className="text-xs text-gray-500">{status.remaining} cuotas restantes</p>
                                                    </div>
                                                    <span className="font-bold text-red-600 font-mono">{formatCurrency(status.totalDebt)}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )
                        })}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Wallet size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Deuda Total Real</p>
                                <p className="font-black text-xl text-gray-800">{formatCurrency(realTotalDebt)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400">Incluye Cuotas Futuras</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><ShieldCheck size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Supervivencia</p>
                                <p className="font-black text-xl text-gray-800">{kpis.survivalDays} Días</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${kpis.survivalDays >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {kpis.survivalDays >= 90 ? 'Tranquilidad' : 'Alerta'}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN LIBERTAD FINANCIERA */}
            {realTotalDebt > 0 && (
                <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Target size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                                <Target className="text-indigo-400" /> Operación Deuda Cero
                            </h3>
                            <p className="text-indigo-200 text-sm max-w-lg">
                                Según tus compromisos actuales, tu última cuota programada termina en esa fecha. <br />
                                <span className="font-bold text-white">¡Buenas noticias!</span> Con tu superávit mensual de {formatCurrency(monthlySurplus)}, podrías acabar incluso antes si haces abonos extra.
                            </p>
                        </div>
                        <div className="text-center bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 min-w-[200px]">
                            {debtFreeDate ? (
                                <>
                                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">LIBERTAD TOTAL EN</p>
                                    <p className="text-3xl font-black text-white">{monthsToFreedom} Meses</p>
                                    <p className="text-xs font-medium text-emerald-300 mt-1">META: {debtFreeDate}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">¡FELICIDADES!</p>
                                    <p className="text-xl font-black text-white">Libre de Deudas</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN 2: DIAGNÓSTICO Y RECETA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Diagnóstico */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6 text-lg">
                        <Activity className="text-indigo-500" /> Diagnóstico Clínico
                    </h3>
                    <div className="space-y-4">
                        {diagnosis.map((d, i) => (
                            <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${d.type === 'good' ? 'bg-emerald-500' : d.type === 'neutral' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                <p className="text-sm font-medium text-gray-700">{d.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Receta */}
                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
                    <h3 className="font-bold flex items-center gap-2 mb-6 text-lg">
                        <Target className="text-indigo-200" /> Plan de Acción (Receta)
                    </h3>
                    <div className="space-y-4">
                        {recipe.map((step, i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                                    {i + 1}
                                </div>
                                <p className="font-medium leading-relaxed">{step}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-4 bg-white/10 rounded-xl text-xs text-indigo-100 italic">
                        "La consistencia es más importante que la intensidad. Aplica estos cambios hoy."
                    </div>
                </div>
            </div>

            {/* Drill Down Modal */}
            {selectedDrillDown && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-scaleIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{selectedDrillDown.title}</h3>
                            </div>
                            <button onClick={() => setSelectedDrillDown(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            {selectedDrillDown.customContent}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button onClick={() => setSelectedDrillDown(null)} className="px-5 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisPage;
