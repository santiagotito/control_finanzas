import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar sesión al cargar
        const storedUser = localStorage.getItem('finance_app_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user session", e);
                localStorage.removeItem('finance_app_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const result = await api.login(email, password);
            if (result && result.status === 'success') {
                const userData = result.user;
                setUser(userData);
                localStorage.setItem('finance_app_user', JSON.stringify(userData));
                return { success: true };
            } else {
                return { success: false, message: result?.message || 'Credenciales inválidas' };
            }
        } catch (error) {
            console.error("Login error", error);
            return { success: false, message: 'Error de conexión' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('finance_app_user');
        // Opcional: Limpiar caché de datos financieros si es necesario
        // localStorage.removeItem('finance_app_cache'); 
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
