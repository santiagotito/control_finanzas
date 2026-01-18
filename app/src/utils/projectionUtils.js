
/**
 * Calcula info de cuotas (Ej: 1/12)
 */
export const getInstallmentInfo = (rule, dateStr) => {
    if (!rule.FechaFin || !rule.FechaInicio) return null;

    const getYM = (input) => {
        if (!input) return null;
        let d;
        if (typeof input === 'string') {
            // "YYYY-MM-DD" o similar
            const parts = input.split('T')[0].split('-');
            if (parts.length < 2) return null;
            return { y: parseInt(parts[0]), m: parseInt(parts[1]) - 1 };
        } else if (input instanceof Date) {
            d = input;
        } else {
            return null;
        }
        // Si es un objeto Date (ej: desde el backend), usar UTC para evitar desfases locales
        return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    };

    const start = getYM(rule.FechaInicio);
    const end = getYM(rule.FechaFin);
    const current = getYM(dateStr);

    if (!start || !end || !current) return null;

    const startTotalMonths = start.y * 12 + start.m;
    const endTotalMonths = end.y * 12 + end.m;
    const currentTotalMonths = current.y * 12 + current.m;

    if (currentTotalMonths < startTotalMonths || currentTotalMonths > endTotalMonths) return null;

    return `${currentTotalMonths - startTotalMonths + 1}/${endTotalMonths - startTotalMonths + 1}`;
};

/**
 * Genera transacciones virtuales para un mes específico basado en reglas recurrentes
 * @param {Array} rules - Lista de reglas recurrentes
 * @param {String} yearMonth - Formato "YYYY-MM"
 * @param {Array} existingTransactions - Transacciones reales ya existentes (para evitar duplicados)
 */
export const generateProjectedTransactions = (rules, yearMonth, existingTransactions = []) => {
    if (!rules || !Array.isArray(rules)) return [];

    const [year, month] = yearMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);

    return rules.filter(rule => {
        // Validar fechas de inicio/fin de la regla
        const start = new Date(rule.FechaInicio);
        const end = rule.FechaFin ? new Date(rule.FechaFin) : null;

        const startYear = start.getFullYear();
        const startMonth = start.getMonth();

        // Si el mes consultado es anterior al inicio de la regla
        if (firstDayOfMonth < new Date(startYear, startMonth, 1)) return false;

        // Si el mes consultado es posterior al fin de la regla
        if (end && firstDayOfMonth > end) return false;

        // Validar si YA existe una transacción real generada por esta regla este mes
        // Heurística simple: coincidencia de Nombre y Monto aproximado, o solo Nombre si es muy específico
        // En TransactionsPage usábamos solo Nombre. Mantengamos eso pero podríamos mejorar.
        const alreadyExists = existingTransactions.some(t => {
            // Verificar que sea del mismo mes (MesAfectacion manda)
            // Robustez: checar ambas keys por si acaso viene del sheet con formato original
            const rawMes = t.MesAfectacion || t['Mes Afectación'];
            let tDate = rawMes || t.Fecha;

            // Normalize ISO date to YYYY-MM
            if (tDate && tDate.length > 7) {
                tDate = tDate.slice(0, 7);
            }

            if (tDate !== yearMonth) return false;

            // Match exacto o si la descripción contiene el nombre de la regla (para casos editados)
            const txDesc = (t.Descripcion || '').toLowerCase().trim();
            const ruleName = (rule.Nombre || '').toLowerCase().trim();

            // Bidirectional check for robustness
            const match = txDesc === ruleName || txDesc.includes(ruleName) || ruleName.includes(txDesc);

            // Console log específico para depurar el caso de "QUINCENA 1"
            if (ruleName.includes('quincena')) {
                console.log(`Checking suppression for Rule: "${ruleName}" vs Tx: "${txDesc}" -> Match? ${match}`);
            }

            return match;
        });

        return !alreadyExists;

    }).map(rule => {
        // Calcular día seguro (si febrero no tiene 30, usar 28)
        let day = parseInt(rule.DiaEjecucion);
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) day = daysInMonth;

        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

        return {
            ID: `proj-${rule.ID}-${yearMonth}`, // ID único por mes
            Fecha: dateStr,
            Descripcion: rule.Nombre,
            Categoria: rule.Categoria,
            Cuenta: rule.Cuenta,
            Monto: rule.Monto,
            Tipo: rule.Tipo,
            Estado: 'Proyectado',
            IsVirtual: true,
            OriginalRule: rule,
            Installment: getInstallmentInfo(rule, dateStr)
        };
    });
};
