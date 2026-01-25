import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCategoryAlerts, formatCurrency } from '../utils/financialUtils';
import { getRuleStatus } from '../utils/projectionUtils';

export const useSmartInsights = () => {
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

        const sortedCards = [...analyzedCards].sort((a, b) => b.daysToCut - a.daysToCut);
        const recommended = sortedCards[0];
        const top3 = sortedCards.slice(0, 3);

        return {
            recommended,
            topCards: top3,
            allCards: analyzedCards
        };
    }, [accounts, currentDay]);

    // 2. Motor de Estrategia Inteligente
    const smartInsights = useMemo(() => {
        const insights = [];

        // A. Alertas de Gasto Crítico
        const alerts = getCategoryAlerts(transactions.filter(t => {
            const date = t.MesAfectacion || t.Fecha;
            return date && date.substring(0, 7) === today.toISOString().substring(0, 7);
        }));

        alerts.forEach(alert => {
            insights.push({
                id: `spend-${alert.name}`,
                type: 'warning',
                title: `Gasto Elevado en ${alert.name}`,
                desc: `Representa el ${alert.percentage.toFixed(1)}% de tu mes. Considera reducir un 10% para ahorrar ${formatCurrency(alert.value * 0.1)}.`,
                action: 'Ahorrar'
            });
        });

        // B. Recomendaciones de Tarjetas (Estrategia)
        if (cardInsights) {
            const best = cardInsights.recommended;
            insights.push({
                id: 'card-best',
                type: 'success',
                title: `¡Usa hoy: ${best.Nombre}!`,
                desc: `Tienes ${best.daysToCut} días hasta el corte. Es tu mejor opción para diferir pagos al máximo plazo.`,
                action: 'Estrategia'
            });

            cardInsights.allCards.forEach(card => {
                const paymentIn = card.paymentDay - currentDay;
                if (paymentIn >= 0 && paymentIn <= 3) {
                    insights.push({
                        id: `card-pay-${card.ID}`,
                        type: 'danger',
                        title: `Pagar ${card.Nombre}`,
                        desc: `Faltan solo ${paymentIn} días para tu fecha de pago (Día ${card.paymentDay}). Evita intereses.`,
                        action: 'Urgente'
                    });
                }
            });
        }

        // C. Análisis de Déficit / Presupuesto
        const monthly = transactions.filter(t => (t.MesAfectacion || t.Fecha || '').substring(0, 7) === today.toISOString().substring(0, 7));
        const income = monthly.filter(t => t.Tipo === 'Ingreso').reduce((s, t) => s + parseFloat(t.Monto || 0), 0);
        const expense = monthly.filter(t => t.Tipo === 'Gasto').reduce((s, t) => s + parseFloat(t.Monto || 0), 0);

        if (expense > income && income > 0) {
            insights.push({
                id: 'budget-deficit',
                type: 'danger',
                title: 'Déficit Mensual Detectado',
                desc: `Tus gastos superan tus ingresos por ${formatCurrency(expense - income)}. Intenta reducir gastos no esenciales.`,
                action: 'Presupuesto'
            });
        }

        return insights.sort((a, b) => {
            // Prioridad: Danger > Warning > Success
            const priority = { danger: 3, warning: 2, success: 1 };
            return priority[b.type] - priority[a.type];
        });
    }, [transactions, cardInsights, today, currentDay]);

    return { cardInsights, smartInsights };
};
