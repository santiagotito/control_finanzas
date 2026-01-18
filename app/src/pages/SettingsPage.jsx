import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Bell, CreditCard, Calendar } from 'lucide-react';
import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';

// Placeholder para alertas
// En una app real, estas fechas vendrían de la configuración de la tarjeta (día de corte/pago)
// Aquí simularemos algunas alertas basadas en las cuentas de tarjeta de crédito
const PaymentAlerts = ({ accounts }) => {
    const creditCards = accounts.filter(a => a.Tipo === 'Tarjeta de Crédito');
    const today = new Date();

    // Simulación: Asumimos pago el 5 de cada mes para demo
    const alerts = creditCards.map(card => {
        const nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, 5);
        const daysLeft = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

        return {
            id: card.ID,
            cardName: card.Nombre,
            date: nextPayment,
            daysLeft: daysLeft,
            amount: card.SaldoActual // Asumimos que se debe pagar el saldo actual (simplificación)
        };
    });

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Bell className="text-indigo-600" size={20} />
                Alertas de Pago Próximas
            </h3>

            <div className="space-y-3">
                {alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-full text-orange-500">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">Pagar {alert.cardName}</p>
                                <p className="text-xs text-gray-500">Vence el {format(alert.date, 'dd/MM/yyyy')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-gray-900">{alert.daysLeft} días</p>
                            <p className="text-xs text-orange-600 font-medium">Restantes</p>
                        </div>
                    </div>
                ))}
                {alerts.length === 0 && (
                    <p className="text-gray-400 text-sm">No tienes tarjetas de crédito registradas o pagos pendientes.</p>
                )}
            </div>
        </div>
    );
};

// Componente simple para ver la URL configurada
const ConfigInfo = () => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">Configuración de Conexión</h3>
            <p className="text-sm text-gray-500 mb-4">
                Estado de conexión con Google Sheets.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 break-all text-xs text-gray-600 font-mono">
                src/config.js
            </div>
        </div>
    )
}

const SettingsPage = () => {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-800">Cuentas y Filtros</h2>
                <p className="text-gray-500">Configuración global del sistema</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ConfigInfo />
            </div>
        </div>
    );
};

export default SettingsPage;
