import axios from 'axios';
import { API_URL } from '../config';

// Servicio para comunicar con Google Sheets
const api = {
    // Obtener todos los datos
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
            Descripcion: transaction.description
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

    // Actualizar una meta
    updateGoal: async (goal) => {
        const payload = {
            ID: goal.id,
            amount: goal.amount // Special logic in backend for accumulation
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
    }
};

export default api;
