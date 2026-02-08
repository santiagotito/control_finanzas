import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export const calculateMonthlyTotals = (transactions) => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const monthlyTransactions = transactions.filter(tx =>
        isWithinInterval(parseISO(tx.FechaCreacion || tx.Fecha), { start, end })
    );

    const income = monthlyTransactions
        .filter(tx => tx.Tipo === 'Ingreso')
        .reduce((acc, curr) => acc + (parseFloat(curr.Monto) || 0), 0);

    const expense = monthlyTransactions
        .filter(tx => tx.Tipo === 'Gasto')
        .reduce((acc, curr) => acc + (parseFloat(curr.Monto) || 0), 0);

    return { income, expense, balance: income - expense };
};

export const calculateCategoryTotals = (transactions) => {
    const totals = {};

    transactions
        .filter(tx => tx.Tipo === 'Gasto')
        .forEach(tx => {
            const amount = parseFloat(tx.Monto) || 0;
            if (totals[tx.Categoria]) {
                totals[tx.Categoria] += amount;
            } else {
                totals[tx.Categoria] = amount;
            }
        });

    return Object.keys(totals).map(cat => ({
        name: cat,
        value: totals[cat]
    })).sort((a, b) => b.value - a.value);
};

export const formatCurrency = (value) => {
    const num = parseFloat(value);
    const safeValue = isNaN(num) ? 0 : num;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(safeValue);
};

export const getCategoryAlerts = (transactions) => {
    const categoryTotals = calculateCategoryTotals(transactions);
    const totalExpense = categoryTotals.reduce((acc, curr) => acc + curr.value, 0);

    if (totalExpense === 0) return [];

    return categoryTotals
        .map(cat => ({
            ...cat,
            percentage: (cat.value / totalExpense) * 100
        }))
        .filter(cat => cat.percentage > 25) // Alerta si una categoría supera el 25%
        .sort((a, b) => b.percentage - a.percentage);
};

export const calculateFinancialScore = (income, expense, totalDebt, totalSavings) => {
    let score = 0;

    // 1. Salud del Flujo de Caja (Max 40 pts)
    if (income > 0) {
        const savingsRate = ((income - expense) / income) * 100;
        if (savingsRate >= 20) score += 40;
        else if (savingsRate >= 10) score += 30;
        else if (savingsRate > 0) score += 20;
        else score += 0; // Déficit
    }

    // 2. Nivel de Endeudamiento (Max 30 pts)
    // Sano: Deuda < 30% de Ingreso Mensual (Simulado)
    const debtRatio = income > 0 ? (totalDebt / income) * 100 : 100;
    if (debtRatio === 0) score += 30;
    else if (debtRatio < 30) score += 25;
    else if (debtRatio < 50) score += 15;
    else score += 5;

    // 3. Liquidez / Ahorro Acumulado (Max 30 pts)
    // Sano: Tener al menos 1 mes de gastos cubierto
    if (expense > 0 && totalSavings > expense) score += 30;
    else if (expense > 0 && totalSavings > (expense * 0.5)) score += 15;
    else if (totalSavings > 0) score += 5;

    return Math.min(100, Math.max(0, score));
};

export const getFinancialKPIs = (transactions, accounts) => {
    const monthlyStats = calculateMonthlyTotals(transactions);

    // Total Ahorros (Cuentas que NO son TC y NO son Efectivo si se quiere, pero asumamos todo lo liquido positivo)
    const totalSavings = accounts
        .filter(a => a.Tipo !== 'Tarjeta de Crédito')
        .reduce((sum, a) => sum + (parseFloat(a.SaldoActual) || 0), 0);

    const totalDebt = accounts
        .filter(a => a.Tipo === 'Tarjeta de Crédito')
        .reduce((sum, a) => sum + Math.abs(parseFloat(a.SaldoActual) || 0), 0);

    // Días de Supervivencia: Cuánto duro si dejo de ganar dinero hoy
    // Gasto diario promedio
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dailyExpense = dayOfMonth > 0 ? monthlyStats.expense / dayOfMonth : 0;
    const survivalDays = dailyExpense > 0 ? Math.floor(totalSavings / dailyExpense) : (totalSavings > 0 ? 999 : 0);

    return {
        score: calculateFinancialScore(monthlyStats.income, monthlyStats.expense, totalDebt, totalSavings),
        savingsRate: monthlyStats.income > 0 ? ((monthlyStats.income - monthlyStats.expense) / monthlyStats.income) * 100 : 0,
        survivalDays,
        totalSavings,
        totalDebt,
        monthlyIncome: monthlyStats.income,
        monthlyExpense: monthlyStats.expense
    };
};
