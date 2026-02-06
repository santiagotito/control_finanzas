import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppContext } from './AppContext';
import api from '../services/api';

const HabitContext = createContext();

export const useHabits = () => {
    return useContext(HabitContext);
};

export const HabitProvider = ({ children }) => {
    const {
        habits: serverHabits,
        habitsLog,
        gratitudeEntries: serverGratitude,
        quotesEntries: serverQuotes,
        refreshData
    } = useAppContext();

    // --- LOCAL OPTIMISTIC STATE ---
    const [localHabits, setLocalHabits] = useState([]);
    const [localGratitude, setLocalGratitude] = useState([]);
    const [localQuotes, setLocalQuotes] = useState([]);
    const [actionLoading, setActionLoading] = useState({ type: null, id: null });

    // Cuando los datos del servidor cambian, limpiamos los locales
    useEffect(() => {
        setLocalHabits([]);
        setLocalGratitude([]);
        setLocalQuotes([]);
    }, [serverHabits, serverGratitude, serverQuotes]);

    // --- MERGE STATE ---

    // Process Server Habits
    const processedServerHabits = serverHabits.map(h => {
        const history = {};
        if (habitsLog) {
            habitsLog
                .filter(log => log.ID_Habito === h.ID)
                .forEach(log => {
                    const dateStr = log.Fecha ? log.Fecha.substring(0, 10) : '';
                    history[dateStr] = true;
                });
        }
        return {
            id: h.ID,
            name: h.Nombre,
            frequency: h.Frecuencia,
            color: h.Color,
            createdAt: h.FechaCreado,
            history: history,
            source: 'server'
        };
    });

    const habits = [...processedServerHabits, ...localHabits];

    // Process Gratitude
    const processedServerGratitude = serverGratitude.map(g => ({
        id: g.ID,
        date: g.Fecha,
        text: g.Texto,
        source: 'server'
    }));
    const gratitudeEntries = [...processedServerGratitude, ...localGratitude].sort((a, b) => {
        // Safe sort
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        if (isNaN(dA.getTime())) return 1;
        if (isNaN(dB.getTime())) return -1;
        return dB - dA;
    });

    // Process Quotes
    const processedServerQuotes = serverQuotes.map(q => ({
        id: q.ID,
        date: q.Fecha,
        text: q.Texto,
        author: q.Autor,
        source: 'server'
    }));
    const quotesEntries = [...processedServerQuotes, ...localQuotes].sort((a, b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        if (isNaN(dA.getTime())) return 1;
        if (isNaN(dB.getTime())) return -1;
        return dB - dA;
    });


    // ---- ACTIONS ----

    const addHabit = async (habit) => {
        setActionLoading({ type: 'addHabit', id: null });
        const tempId = 'temp-' + Date.now();
        const newLocalHabit = {
            id: tempId,
            name: habit.name,
            frequency: habit.frequency,
            color: habit.color,
            createdAt: new Date().toISOString(),
            history: {},
            source: 'local'
        };

        setLocalHabits(prev => [...prev, newLocalHabit]);

        try {
            await api.addHabit(habit);
            await refreshData();
        } catch (e) {
            console.error(e);
            alert("Error guardando. Se mantiene en local hasta recargar.");
        } finally {
            setActionLoading({ type: null, id: null });
        }
    };

    const updateHabit = async (habit) => {
        setActionLoading({ type: 'updateHabit', id: habit.id });
        try {
            if (habit.source === 'local') {
                setLocalHabits(prev => prev.map(h => h.id === habit.id ? { ...h, ...habit } : h));
            } else {
                await api.updateHabit(habit);
                await refreshData();
            }
        } finally {
            setActionLoading({ type: null, id: null });
        }
    };

    const deleteHabit = async (id) => {
        if (String(id).startsWith('temp-')) {
            setLocalHabits(prev => prev.filter(h => h.id !== id));
        } else {
            setActionLoading({ type: 'deleteHabit', id: id });
            try {
                await api.deleteHabit(id);
                await refreshData();
            } finally {
                setActionLoading({ type: null, id: null });
            }
        }
    };

    const toggleHabitCompletion = async (id, dateStr) => {
        setActionLoading({ type: 'toggleHabit', id: id + dateStr });
        try {
            await api.logHabit(id, dateStr);
            await refreshData();
        } finally {
            setActionLoading({ type: null, id: null });
        }
    };

    const addGratitude = async (text) => {
        setActionLoading({ type: 'addGratitude', id: null });
        setLocalGratitude(prev => [{
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            text: text,
            source: 'local'
        }, ...prev]);

        try {
            await api.addGratitude(text);
            await refreshData();
        } finally {
            setActionLoading({ type: null, id: null });
        }
    };

    const addQuote = async (text, author) => {
        setActionLoading({ type: 'addQuote', id: null });
        setLocalQuotes(prev => [{
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            text: text,
            author: author,
            source: 'local'
        }, ...prev]);

        try {
            await api.addQuote(text, author);
            await refreshData();
        } finally {
            setActionLoading({ type: null, id: null });
        }
    };

    return (
        <HabitContext.Provider value={{
            habits,
            gratitudeEntries,
            quotesEntries,
            actionLoading,
            addHabit,
            updateHabit,
            deleteHabit,
            toggleHabitCompletion,
            addGratitude,
            updateGratitude: async (id, text) => {
                setActionLoading({ type: 'updateGratitude', id });
                await api.updateGratitude(id, text);
                await refreshData();
                setActionLoading({ type: null, id: null });
            },
            deleteGratitude: async (id) => {
                if (!confirm('¿Estás seguro de eliminar este registro?')) return;
                setActionLoading({ type: 'deleteGratitude', id });
                await api.deleteGratitude(id);
                await refreshData();
                setActionLoading({ type: null, id: null });
            },
            addQuote,
            updateQuote: async (id, text, author) => {
                setActionLoading({ type: 'updateQuote', id });
                await api.updateQuote(id, text, author);
                await refreshData();
                setActionLoading({ type: null, id: null });
            },
            deleteQuote: async (id) => {
                if (!confirm('¿Estás seguro de eliminar esta frase?')) return;
                setActionLoading({ type: 'deleteQuote', id });
                await api.deleteQuote(id);
                await refreshData();
                setActionLoading({ type: null, id: null });
            }
        }}>
            {children}
        </HabitContext.Provider>
    );
};
