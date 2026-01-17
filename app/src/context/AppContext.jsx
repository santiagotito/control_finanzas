import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [goals, setGoals] = useState([]);
    const [recurringRules, setRecurringRules] = useState([]);
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar datos al iniciar
    const loadData = async () => {
        setLoading(true);
        try {
            const result = await api.getData();
            if (result && result.status === 'success') {
                const { data } = result;
                setTransactions(data.transactions || []);
                setAccounts(data.accounts || []);
                setGoals(data.goals || []);
                setRecurringRules(data.recurring || []);
                setSettings(data.settings || []);
            } else if (result === null) {
                // URL no configurada
                setError("API_URL_MISSING");
            }
        } catch (err) {
            setError("Error cargando datos. Verifica tu conexión o la URL del script.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Acciones
    const addTransaction = async (tx) => {
        const result = await api.addTransaction(tx);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const addAccount = async (acc) => {
        const result = await api.addAccount(acc);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const updateAccount = async (acc) => {
        const result = await api.updateAccount(acc);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const deleteAccount = async (id) => {
        const result = await api.deleteAccount(id);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const addGoal = async (goal) => {
        const result = await api.addGoal(goal);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const addRecurringRule = async (rule) => {
        const result = await api.addRecurringRule(rule);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const updateRecurringRule = async (rule) => {
        const result = await api.updateRecurringRule(rule);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const deleteRecurringRule = async (id) => {
        const result = await api.deleteRecurringRule(id);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const addCategory = async (type, name) => {
        // Validar duplicados localmente
        const exists = settings.some(s => s.Tipo === type && s.Valor.toLowerCase() === name.toLowerCase());
        if (exists) return true; // Ya existe, retornamos true simulando éxito

        const result = await api.addSetting(type, name);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    return (
        <AppContext.Provider value={{
            transactions,
            accounts,
            goals,
            settings,
            loading,
            error,
            refreshData: loadData,
            addTransaction,
            addAccount,
            deleteAccount,
            addGoal,
            recurringRules,
            addRecurringRule,
            addRecurringRule,
            updateRecurringRule,
            deleteRecurringRule,
            addCategory
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
