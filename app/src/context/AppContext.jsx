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
    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const result = await api.getData();
            if (result && result.status === 'success') {
                const { data } = result;

                // Guardar en caché para próxima vez
                localStorage.setItem('finance_app_cache', JSON.stringify(data));

                setTransactions(data.transactions || []);
                setAccounts(data.accounts || []);
                setGoals(data.goals || []);
                setRecurringRules(data.recurring || []);
                setSettings(data.settings || []);
            } else if (result === null) {
                setError("API_URL_MISSING");
            }
        } catch (err) {
            setError("Error cargando datos. Verifica tu conexión o la URL del script.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Optimistic Load from Cache
        const cached = localStorage.getItem('finance_app_cache');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                setTransactions(data.transactions || []);
                setAccounts(data.accounts || []);
                setGoals(data.goals || []);
                setRecurringRules(data.recurring || []);
                setSettings(data.settings || []);
                setLoading(false); // Mostrar datos cacheados inmediatamente
                loadData(true); // Recargar en segundo plano
            } catch (e) {
                console.error("Cache parsing error", e);
                loadData(false);
            }
        } else {
            loadData(false);
        }
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

    const updateTransaction = async (tx) => {
        const result = await api.updateTransaction(tx);
        if (result.status === 'success') {
            await loadData(true); // Background update
            return true;
        }
        return false;
    };

    const deleteTransaction = async (id) => {
        const result = await api.deleteTransaction(id);
        if (result.status === 'success') {
            const currentTx = transactions.filter(t => t.ID !== id);
            setTransactions(currentTx); // Optimistic UI
            await loadData(true);
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

    const updateGoal = async (id, amount) => {
        const result = await api.updateGoal(id, amount);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const updateGoalFull = async (goal) => {
        const result = await api.updateGoalFull(goal);
        if (result.status === 'success') {
            await loadData();
            return true;
        }
        return false;
    };

    const deleteGoal = async (id) => {
        const result = await api.deleteGoal(id);
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
            refreshData: () => loadData(true), // Al refrescar manual (post-acción), usamos background para no bloquear UI (o false si queremos bloquear) -> Mejor true para UX fluida, el loading de UI local se encarga.
            addTransaction,
            updateTransaction,
            deleteTransaction,
            addAccount,
            deleteAccount,
            addGoal,
            updateGoal,
            updateGoalFull,
            deleteGoal,
            recurringRules,
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
