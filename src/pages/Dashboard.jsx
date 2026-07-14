import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import MonthlyAccountsMatrix from '../components/dashboard/MonthlyAccountsMatrix';

const Dashboard = () => {
    const { loading, error, transactions, recurringRules, accounts } = useAppContext();

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
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel Principal</h2>
                    <p className="text-gray-500">Resumen mensual: cuánto hay y cuánto está comprometido</p>
                </div>
                <Link to="/transactions" className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                    <Plus size={20} />
                </Link>
            </header>

            {/* MATRIZ MENSUAL POR CUENTA (cuánto hay / cuánto comprometido) */}
            <MonthlyAccountsMatrix
                transactions={transactions}
                recurringRules={recurringRules}
                accounts={accounts}
            />
        </div>
    );
};

export default Dashboard;
