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
    return new Intl.NumberFormat('es-CO', { // Asumiendo formato Latam/CO por el usuario "Santi"
        style: 'currency',
        currency: 'COP', // O USD, dejaré COP por probabilidad, o genérico. Mejor USD si no sé. 
        // "Santi" y "Control Financiero" suena genérico hispano. Usaré USD por defecto para no errar, o local.
        // Voy a usar style currency sin currency definido para usar locale default o poner '$'.
        // Mejor: opción configurable, pero por ahora USD.
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};
