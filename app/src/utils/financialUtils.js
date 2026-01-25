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
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
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
