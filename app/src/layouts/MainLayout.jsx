import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, HandCoins, CreditCard, PiggyBank, TrendingUp, Settings, Menu, X, Bell, RefreshCw } from 'lucide-react';

const MainLayout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Transacciones', path: '/transactions', icon: HandCoins },
        { name: 'Cuentas', path: '/accounts', icon: CreditCard },
        { name: 'Metas', path: '/goals', icon: PiggyBank },
        { name: 'Deudas y Pagos', path: '/recurring', icon: RefreshCw },
        { name: 'Análisis', path: '/analysis', icon: TrendingUp },
        { name: 'Alertas', path: '/settings', icon: Bell }, // Temporalmente en settings o página propia?
        // Mejor creo una página separada si es importante.
        // El usuario pidió "Alertas de Pago". 
        // Voy a usar Settings para alertas y config general para no saturar el menú.
        // O mejor, agrego 'Configuración' al final y 'Alertas' no.
        // Espera, el usuario pidió "Sección para dar de alta diferentes tarjetas... Alertas de Pago...".
        // Voy a poner "Configuración" y dentro de Configuración o Dashboard las alertas.
        // Pero para cumplir "Clean UI", mejor tenerlo visible si es importante.
        // Dejaré 'Configuración' que sirve para todo. 
        // Y añadiré un badge de notificación si hay alertas.
        { name: 'Configuración', path: '/settings', icon: Settings },
    ];

    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                        <span className="text-3xl">🪙</span> Finanzas
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
                    <h1 className="text-xl font-bold text-indigo-600">Finanzas</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-10">
                        <nav className="p-4 space-y-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={closeMenu}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
