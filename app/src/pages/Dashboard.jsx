import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSmartInsights } from '../hooks/useSmartInsights';
import { Plus, X, ArrowUpCircle, ArrowDownCircle, Target, Zap, ShieldAlert, TrendingDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../utils/financialUtils';
import { generateProjectedTransactions } from '../utils/projectionUtils';
import { Link } from 'react-router-dom';
import BudgetGauge from '../components/dashboard/BudgetGauge';
import ProjectedCashFlow from '../components/dashboard/ProjectedCashFlow';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import IncomeVsExpenseBar from '../components/dashboard/IncomeVsExpenseBar';
import DeferredCalculator from '../components/tools/DeferredCalculator';

const Dashboard = () => {
    const { loading, error, transactions, recurringRules, accounts, goals } = useAppContext();
    const { smartInsights, cardInsights } = useSmartInsights();
    const [showCalculator, setShowCalculator] = useState(false);
    const [selectedDrillDown, setSelectedDrillDown] = useState(null); // { title: string, transactions: [] }
    const [sortConfig, setSortConfig] = useState({ key: 'Fecha', direction: 'desc' });
    const [drillSortConfig, setDrillSortConfig] = useState({ key: 'Fecha', direction: 'desc' });

    // [NEW] Filtros Independientes para Dashboard
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedAccount, setSelectedAccount] = useState('Todas');

    // ... (rest of stats calculation remains the same) ...
    const stats = React.useMemo(() => {
        let incomeReal = 0;
        let expenseReal = 0;
        let pendingIncome = 0; // Por si acaso
        let pendingExpense = 0;

        (transactions || []).forEach(t => {
            // Protección contra datos corruptos
            if (!t || !t.Fecha) return;

            // [FIX] Normalización de Mes de Afectación
            let rawDate = t.MesAfectacion || t.Fecha;
            const targetMonth = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;

            if (targetMonth !== selectedMonth) return;

            // [NEW] Filtro por Cuenta
            if (selectedAccount !== 'Todas' && t.Cuenta !== selectedAccount) return;

            // Protección contra Monto inválido
            let amount = parseFloat(t.Monto);
            if (isNaN(amount)) amount = 0;

            if (t.Estado === 'Pendiente') {
                if (t.Tipo === 'Ingreso') pendingIncome += amount;
                else pendingExpense += amount;
            } else {
                // Validado
                if (t.Tipo === 'Ingreso') incomeReal += amount;
                else expenseReal += amount;
            }
        });

        // 2. Sumar Virtuales (Proyecciones para el mes seleccionado)
        // [New] Esto sincroniza las cartas con el gráfico de flujo de caja
        if (recurringRules && recurringRules.length > 0) {
            // Filtramos reglas primero por cuenta
            const applicableRules = recurringRules.filter(r => selectedAccount === 'Todas' || r.Cuenta === selectedAccount);

            // Generamos las virtuales
            const virtuals = generateProjectedTransactions(applicableRules, selectedMonth, transactions);

            // Sumamos al "Pendiente" (ya que son proyecciones a futuro)
            virtuals.forEach(v => {
                let amount = parseFloat(v.Monto) || 0;
                if (v.Tipo === 'Ingreso') pendingIncome += amount;
                else pendingExpense += amount;
            });
        }

        // Calculamos un "Límite de Presupuesto" dinámico basado en Ingresos Totales (Real + Pendiente)
        // Si no hay ingresos, ponemos un default para que no se rompa la gráfica (ej. 1000 o lo que se haya gastado)
        const totalIncome = incomeReal + pendingIncome;
        const totalExpense = expenseReal + pendingExpense;
        const budgetLimit = totalIncome > 0 ? totalIncome : (totalExpense > 0 ? totalExpense * 1.2 : 1000);

        // [NEW] Filtramos las transacciones reales que cumplen con los filtros
        const filteredTransactions = transactions.filter(t => {
            if (!t || !t.Fecha) return false;
            let rawDate = t.MesAfectacion || t.Fecha;
            const targetMonth = rawDate.length > 7 ? rawDate.slice(0, 7) : rawDate;
            if (targetMonth !== selectedMonth) return false;
            if (selectedAccount !== 'Todas' && t.Cuenta !== selectedAccount) return false;
            return true;
        });

        return {
            incomeReal,
            expenseReal,
            pendingIncome,
            pendingExpense,
            balanceReal: incomeReal - expenseReal,
            balanceTotal: (incomeReal + pendingIncome) - (expenseReal + pendingExpense),
            budgetLimit, // Pasaremos esto al Gauge
            filteredTransactions // [NEW] Pasar las transacciones filtradas
        };
    }, [transactions, selectedMonth, selectedAccount, recurringRules]);

    const handleBarClick = (data) => {
        if (!data || !data.payload) return;
        const type = data.payload.name === 'Ingresos' ? 'Ingreso' : 'Gasto';
        const drillTransactions = stats.filteredTransactions.filter(t => t.Tipo === type);
        setSelectedDrillDown({
            title: `Detalle de ${data.payload.name}`,
            transactions: drillTransactions
        });
    };

    const handleSliceClick = (entry) => {
        if (!entry) return;
        const drillTransactions = stats.filteredTransactions.filter(t => t.Categoria === entry.name);
        setSelectedDrillDown({
            title: `Categoría: ${entry.name}`,
            transactions: drillTransactions
        });
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedTransactions = React.useMemo(() => {
        const items = [...transactions.slice(0, 15)];
        return items.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle numeric values
            if (sortConfig.key === 'Monto') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortConfig]);

    const handleDrillSort = (key) => {
        setDrillSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedDrillTransactions = React.useMemo(() => {
        if (!selectedDrillDown) return [];
        const items = [...selectedDrillDown.transactions];
        return items.sort((a, b) => {
            let valA = a[drillSortConfig.key];
            let valB = b[drillSortConfig.key];

            if (drillSortConfig.key === 'Monto') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return drillSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return drillSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [selectedDrillDown, drillSortConfig]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 animate-pulse">Cargando datos financieros...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold">Error de Conexión</h3>
                <p>{error}</p>
                <p className="text-sm mt-2">
                    Verifica la configuración en <code>src/config.js</code> y asegúrate de haber desplegado el script de Google.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel Principal</h2>
                    <p className="text-gray-500">Resumen Financiero</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* [NEW] Filtros Dashboard */}
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="pl-2 pr-1 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                    />

                    <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="pl-2 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-600 shadow-sm max-w-[140px]"
                    >
                        <option value="Todas">Todas las Cuentas</option>
                        {(() => {
                            const groups = accounts.reduce((acc, curr) => {
                                const type = curr.Tipo || 'Otras';
                                if (!acc[type]) acc[type] = [];
                                acc[type].push(curr);
                                return acc;
                            }, {});

                            return Object.entries(groups).map(([type, accs]) => (
                                <optgroup key={type} label={type}>
                                    {accs.map((acc, idx) => (
                                        <option key={idx} value={acc.Nombre}>{acc.Nombre}</option>
                                    ))}
                                </optgroup>
                            ));
                        })()}
                    </select>

                    <button
                        onClick={() => {
                            setSelectedMonth(new Date().toISOString().slice(0, 7));
                            setSelectedAccount('Todas');
                        }}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Limpiar Filtros"
                    >
                        <RefreshCw size={18} />
                    </button>

                    <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
                    >
                        {showCalculator ? 'Ocultar Calc' : 'Calculadora'}
                    </button>

                    <Link to="/transactions" className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                        <Plus size={20} />
                    </Link>
                </div>
            </header>

            {/* SECCIÓN 1: ESTRATEGIA DEL DÍA (HEADER) */}
            <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${smartInsights.length > 0 && smartInsights[0].type === 'danger' ? 'bg-gradient-to-br from-red-600 to-red-800' :
                smartInsights.length > 0 && smartInsights[0].type === 'warning' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                    'bg-gradient-to-br from-indigo-600 to-indigo-900'
                }`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                            <Zap size={14} className="fill-current" /> Tu Estrategia de Hoy
                        </div>
                        {smartInsights.length > 0 ? (
                            <>
                                <h1 className="text-3xl font-black mb-2 leading-tight">{smartInsights[0].title}</h1>
                                <p className="text-white/90 text-sm max-w-xl font-medium leading-relaxed">{smartInsights[0].desc}</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-3xl font-black mb-2 leading-tight">¡Todo bajo control!</h1>
                                <p className="text-white/90 text-sm max-w-xl font-medium leading-relaxed">No hay alertas urgentes hoy. Sigue con tu plan de gasto consciente.</p>
                            </>
                        )}
                    </div>

                    {/* Disponible Real Highlight */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl min-w-[180px] text-center">
                        <p className="text-[10px] uppercase font-bold text-indigo-100 tracking-wider mb-1">Disponible Real Hoy</p>
                        <p className="text-3xl font-black text-white">
                            {formatCurrency(stats.balanceReal - (goals || []).reduce((acc, g) => acc + (parseFloat(g.MontoAhorrado) || 0), 0))}
                        </p>
                        <p className="text-[9px] text-white/60 mt-1">Libre de ahorros y metas</p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: INSPIRACIÓN (METAS) */}
            {(goals || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    {/* Meta Principal (La más cercana a cumplirse o prioritaria) */}
                    {(() => {
                        const topGoal = [...goals].sort((a, b) => {
                            const pA = (parseFloat(a.MontoAhorrado) || 0) / (parseFloat(a.MontoObjetivo) || 1);
                            const pB = (parseFloat(b.MontoAhorrado) || 0) / (parseFloat(b.MontoObjetivo) || 1);
                            return pB - pA;
                        })[0];

                        const currentSaved = parseFloat(topGoal.MontoAhorrado) || 0;
                        const targetAmount = parseFloat(topGoal.MontoObjetivo) || 1; // Avoid division by zero
                        const progress = Math.min(100, (currentSaved / targetAmount) * 100);

                        return (
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Target size={100} className="text-emerald-500" />
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                            <Target size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tu Próximo Logro</p>
                                            <h3 className="font-bold text-gray-800 text-lg">{topGoal.Nombre}</h3>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-emerald-600">{progress.toFixed(0)}%</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                        <span>{formatCurrency(currentSaved)} ahorrados</span>
                                        <span>Meta: {formatCurrency(targetAmount)}</span>
                                    </div>
                                </div>

                                {topGoal.Inspiracion ? (
                                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-50 text-xs text-emerald-800 italic">
                                        "{topGoal.Inspiracion}"
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">"Sigue así, estás cada vez más cerca."</p>
                                )}
                            </div>
                        );
                    })()}

                    {/* Accesos Rápidos de Acción */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/transactions" className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer group">
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Plus size={24} />
                            </div>
                            <span className="font-bold text-indigo-700">Registrar</span>
                        </Link>
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col justify-center gap-3 h-full">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-400 font-bold uppercase">Mejores Tarjetas (Top 3)</p>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Más días plazo</span>
                            </div>
                            {cardInsights?.topCards?.map((card, idx) => (
                                <div key={card.ID || idx} className="flex justify-between items-center border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{card.Nombre}</p>
                                            <p className="text-[10px] text-gray-500">Corte día {card.DiaCorte}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-black ${idx === 0 ? 'text-emerald-600' : 'text-gray-600'}`}>{card.daysToCut} días</span>
                                        <p className="text-[9px] text-gray-400">para pagar</p>
                                    </div>
                                </div>
                            ))}
                            {(!cardInsights || cardInsights.topCards.length === 0) && (
                                <p className="text-xs text-gray-400 text-center py-2">No hay tarjetas registradas</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN 3: VISIÓN FINANCIERA AMPLIA (GRÁFICOS RESTAURADOS) */}
            <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Análisis y Proyecciones</h3>
                    <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-3 py-1 rounded-full">Visión Detallada</span>
                </div>

                <div className="flex flex-col gap-6">
                    {/* FILA 1: Presupuesto y Balance (50% / 50%) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BudgetGauge
                            transactions={stats.filteredTransactions}
                            budgetLimit={stats.budgetLimit}
                            currentMonthExpense={stats.expenseReal + stats.pendingExpense}
                            recurringRules={recurringRules}
                        />
                        <IncomeVsExpenseBar
                            income={stats.incomeReal + stats.pendingIncome}
                            expense={stats.expenseReal + stats.pendingExpense}
                            onBarClick={handleBarClick}
                        />
                    </div>

                    {/* FILA 2: Flujo de Caja Proyectado (100%) */}
                    <ProjectedCashFlow
                        transactions={transactions}
                        recurringRules={recurringRules}
                        currentBalance={stats.balanceReal}
                        selectedAccount={selectedAccount}
                        startMonth={selectedMonth}
                    />

                    {/* FILA 3: Categorías (100%) */}
                    <CategoryPieChart
                        transactions={stats.filteredTransactions}
                        onSliceClick={handleSliceClick}
                    />
                </div>
            </div>

            {/* Sección de Transacciones Recientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Últimos Movimientos</h3>
                    <Link to="/transactions" className="text-indigo-600 text-sm font-medium hover:text-indigo-800">Ver todo</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Fecha')}>Fecha {sortConfig.key === 'Fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Descripcion')}>Descripción {sortConfig.key === 'Descripcion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Estado')}>Estado {sortConfig.key === 'Estado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('Categoria')}>Categoría {sortConfig.key === 'Categoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors text-right" onClick={() => handleSort('Monto')}>Monto {sortConfig.key === 'Monto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedTransactions.map((tx, idx) => (
                                <tr key={tx.ID || idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.Descripcion || 'Sin descripción'}</td>
                                    <td className="px-6 py-4">
                                        {tx.Estado === 'Pendiente' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                Pendiente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                Validado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {tx.Categoria}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                    </td>
                                </tr>
                            ))}
                            {sortedTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                        No hay transacciones recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE DESGLOSE (Drill-down) */}
            {
                selectedDrillDown && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-scaleIn">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{selectedDrillDown.title}</h3>
                                    <p className="text-xs text-gray-500">{selectedDrillDown.transactions.length} movimientos encontrados</p>
                                </div>
                                <button onClick={() => setSelectedDrillDown(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <Plus className="rotate-45 text-gray-400 hover:text-gray-600" size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Fecha')}>Fecha {drillSortConfig.key === 'Fecha' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Descripcion')}>Descripción {drillSortConfig.key === 'Descripcion' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleDrillSort('Cuenta')}>Cuenta {drillSortConfig.key === 'Cuenta' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th className="px-6 py-3 font-medium cursor-pointer hover:text-indigo-600 transition-colors text-right" onClick={() => handleDrillSort('Monto')}>Monto {drillSortConfig.key === 'Monto' && (drillSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedDrillTransactions.map((tx, idx) => (
                                            <tr key={tx.ID || idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">{tx.Fecha ? tx.Fecha.split('T')[0] : ''}</td>
                                                <td className="px-6 py-4 font-medium text-gray-800">{tx.Descripcion}</td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">{tx.Cuenta}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${tx.Tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {tx.Tipo === 'Gasto' ? '-' : '+'}{formatCurrency(parseFloat(tx.Monto))}
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedDrillTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">No hay movimientos en esta selección</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end items-center gap-4">
                                <div className="text-sm">
                                    <span className="text-gray-500 mr-2">Total en vista:</span>
                                    <span className="font-bold text-gray-800 text-lg">
                                        {formatCurrency(selectedDrillDown.transactions.reduce((acc, curr) => acc + (parseFloat(curr.Monto) || 0), 0))}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedDrillDown(null)} className="px-5 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors shadow-lg">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
