import axios from 'axios';
import { API_URL } from '../config';

// Servicio para comunicar con Google Sheets
const api = {
    // Obtener todos los datos
    login: async (email, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append('action', 'login');
            // Enviar campos planos para que GAS los lea en e.parameter
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Login failed:", error);
            return { status: 'error', message: 'Error de red' };
        }
    },

    getData: async () => {
        try {
            if (API_URL.includes("TU_URL_AQUI")) {
                console.warn("API_URL no configurada");
                return null;
            }
            const response = await axios.get(`${API_URL}?action=getData`);

            // Transformar respuesta (keys en español -> inglés para la app)
            // Esto es opcional si la app usa las keys en español, pero por consistencia:
            // Por simplicidad, la app consumirá los datos tal cual vienen del backend (Headers Español)
            // o idealmente mapeamos para tener intellisense.
            // Dejaremos que pase "raw" por ahora y el AppContext lo maneje o la UI se adapte.

            return response.data;
        } catch (error) {
            console.error("Error al obtener datos:", error);
            throw error;
        }
    },

    // Agregar una transacción
    addTransaction: async (transaction) => {
        const payload = {
            Fecha: transaction.date,
            Tipo: transaction.type,
            Categoria: transaction.category,
            Monto: transaction.amount,
            Cuenta: transaction.account,
            Descripcion: transaction.description,
            MesAfectacion: transaction.MesAfectacion,
            Estado: transaction.Estado,
            MetaID: transaction.MetaID // [NEW] Link to Goal
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addTransaction',
                payload: payload
            }), {
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar transacción:", error);
            throw error;
        }
    },

    // Actualizar una transacción [NEW]
    updateTransaction: async (transaction) => {
        const payload = {
            ID: transaction.id,
            Fecha: transaction.date,
            Tipo: transaction.type,
            Categoria: transaction.category,
            Monto: transaction.amount,
            Cuenta: transaction.account,
            Descripcion: transaction.description,
            MesAfectacion: transaction.MesAfectacion, // [NEW]
            Estado: transaction.Estado,
            MetaID: transaction.MetaID // [NEW]
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateTransaction',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar transacción:", error);
            throw error;
        }
    },

    // Eliminar transacción [NEW]
    deleteTransaction: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteTransaction',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar transacción:", error);
            throw error;
        }
    },

    // Agregar una cuenta/tarjeta
    addAccount: async (account) => {
        const payload = {
            Nombre: account.name,
            Tipo: account.type,
            SaldoInicial: account.initialBalance,
            Moneda: account.currency,
            DiaCorte: account.cutoffDay,
            DiaPago: account.paymentDay,
            NumeroCuenta: account.accountNumber
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addAccount',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar cuenta:", error);
            throw error;
        }
    },

    // Actualizar una cuenta
    updateAccount: async (account) => {
        const payload = {
            ID: account.id, // ID must be mapped to ID
            Nombre: account.name,
            Tipo: account.type,
            // SaldoInicial no se actualiza usualmente, pero lo enviamos
            SaldoInicial: account.initialBalance,
            Moneda: account.currency,
            DiaCorte: account.cutoffDay,
            DiaPago: account.paymentDay,
            NumeroCuenta: account.accountNumber
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateAccount',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar cuenta:", error);
            throw error;
        }
    },

    // Eliminar una cuenta
    deleteAccount: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteAccount',
                payload: { ID: id } // Map id to ID
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar cuenta:", error);
            throw error;
        }
    },

    // Agregar una meta
    addGoal: async (goal) => {
        const payload = {
            Nombre: goal.name,
            MontoObjetivo: goal.targetAmount,
            FechaLimite: goal.deadline,
            Color: goal.color
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addGoal',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar meta:", error);
            throw error;
        }
    },

    // Actualizar una meta (para añadir ahorro)
    updateGoal: async (id, amount) => {
        const payload = {
            ID: id,
            amount: amount
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateGoal',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar meta:", error);
            throw error;
        }
    },

    // Actualizar meta completa (metadatos)
    updateGoalFull: async (goal) => {
        const payload = {
            ID: goal.id,
            Nombre: goal.name,
            MontoObjetivo: goal.targetAmount,
            FechaLimite: goal.deadline,
            Color: goal.color
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateGoal',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al editar meta:", error);
            throw error;
        }
    },

    // Eliminar meta
    deleteGoal: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteGoal',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar meta:", error);
            throw error;
        }
    },

    // --- RECURRENTES --- (Deudas, Salarios, Suscripciones)

    addRecurringRule: async (rule) => {
        const payload = {
            Nombre: rule.name,
            Tipo: rule.type,
            Monto: rule.amount,
            Categoria: rule.category,
            Cuenta: rule.account,
            Frecuencia: rule.frequency, // 'Mensual', 'Quincenal'
            DiaEjecucion: rule.executionDay,
            FechaInicio: rule.startDate,
            FechaFin: rule.endDate || ''
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addRecurringRule',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar regla recurrente:", error);
            throw error;
        }
    },

    updateRecurringRule: async (rule) => {
        const payload = {
            ID: rule.id,
            Nombre: rule.name,
            Tipo: rule.type,
            Monto: rule.amount,
            Categoria: rule.category,
            Cuenta: rule.account,
            Frecuencia: rule.frequency,
            DiaEjecucion: rule.executionDay,
            FechaInicio: rule.startDate,
            FechaFin: rule.endDate
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateRecurringRule',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar regla recurrente:", error);
            throw error;
        }
    },

    deleteRecurringRule: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteRecurringRule',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar regla recurrente:", error);
            throw error;
        }
    },

    // Agregar Configuración (Categoría, etc)
    addSetting: async (type, value) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addSetting',
                payload: { Tipo: type, Valor: value }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar configuración:", error);
            throw error;
        }
    },

    // --- HÁBITOS, GRATITUD Y FRASES ---

    addHabit: async (habit) => {
        const payload = {
            Nombre: habit.name,
            Frecuencia: habit.frequency,
            Color: habit.color,
            FechaCreado: habit.createdAt
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addHabit',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar hábito:", error);
            throw error;
        }
    },

    updateHabit: async (habit) => {
        const payload = {
            ID: habit.id,
            Nombre: habit.name,
            Frecuencia: habit.frequency,
            Color: habit.color
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateHabit',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar hábito:", error);
            throw error;
        }
    },

    // Marcar hábito como completado
    logHabit: async (idHabit, date) => {
        const payload = {
            ID_Habito: idHabit,
            Fecha: date
        };
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'logHabit',
                payload: payload
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al registrar hábito:", error);
            throw error;
        }
    },

    deleteHabit: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteHabit',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar hábito:", error);
            throw error;
        }
    },

    addGratitude: async (text) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addGratitude',
                payload: { Texto: text, Fecha: new Date().toISOString() }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar gratitud:", error);
            throw error;
        }
    },

    updateGratitude: async (id, text) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateGratitude',
                payload: { ID: id, Texto: text }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar gratitud:", error);
            throw error;
        }
    },

    deleteGratitude: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteGratitude',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar gratitud:", error);
            throw error;
        }
    },

    addQuote: async (text, author) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'addQuote',
                payload: { Texto: text, Autor: author, Fecha: new Date().toISOString() }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al agregar frase:", error);
            throw error;
        }
    },

    updateQuote: async (id, text, author) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'updateQuote',
                payload: { ID: id, Texto: text, Autor: author }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar frase:", error);
            throw error;
        }
    },

    deleteQuote: async (id) => {
        try {
            const response = await axios.post(API_URL, JSON.stringify({
                action: 'deleteQuote',
                payload: { ID: id }
            }), {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            return response.data;
        } catch (error) {
            console.error("Error al eliminar frase:", error);
            throw error;
        }
    }
};

export default api;
