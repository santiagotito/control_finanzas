/**
 * ------------------------------------------------------------------
 * BACKEND FINANCIERO UNIFICADO v5
 * ------------------------------------------------------------------
 */

const SHEET_NAMES = {
  TRANSACTIONS: 'Transacciones',
  ACCOUNTS: 'Cuentas',
  GOALS: 'Metas',
  SETTINGS: 'Configuracion',
  RECURRING: 'Recurrentes',
  HABITS: 'Habitos',
  HABITS_LOG: 'HabitosLog',
  GRATITUDE: 'Gratitud',
  QUOTES: 'Frases',
  USER: 'User'
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Control Financiero')
    .addItem('Inicializar/Actualizar Hojas', 'setupSheets')
    .addItem('Forzar Actualización de Saldos', 'recalcBalances')
    .addToUi();
}

/**
 * Inicializa o actualiza las hojas.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Transacciones
  ensureSheet(ss, SHEET_NAMES.TRANSACTIONS, [
    'ID', 'Fecha', 'MesAfectacion', 'Tipo', 'Categoria', 'Monto', 'Cuenta', 'Descripcion', 'FechaCreacion', 'FechaPagoReal', 'Estado', 'MetaID'
  ]);

  // 2. Cuentas
  ensureSheet(ss, SHEET_NAMES.ACCOUNTS, [
    'ID', 'Nombre', 'Tipo', 'SaldoInicial', 'SaldoActual', 'Moneda', 'DiaCorte', 'DiaPago', 'NumeroCuenta', 'UltimoPago'
  ]);

  // 3. Metas
  ensureSheet(ss, SHEET_NAMES.GOALS, [
    'ID', 'Nombre', 'MontoObjetivo', 'MontoAhorrado', 'FechaLimite', 'Color'
  ]);

  // 4. Configuración
  ensureSheet(ss, SHEET_NAMES.SETTINGS, ['Tipo', 'Valor']);
  
  // 5. Recurrentes
  ensureSheet(ss, SHEET_NAMES.RECURRING, [
    'ID', 'Nombre', 'Tipo', 'Monto', 'Categoria', 'Cuenta', 'Frecuencia', 'DiaEjecucion', 'FechaInicio', 'FechaFin', 'UltimaEjecucion'
  ]);
  
  // 6. Hábitos & Crecimiento
  ensureSheet(ss, SHEET_NAMES.HABITS, ['ID', 'Nombre', 'Frecuencia', 'Color', 'FechaCreado', 'Estado']);
  ensureSheet(ss, SHEET_NAMES.HABITS_LOG, ['ID_Habito', 'Fecha', 'Completado']);
  ensureSheet(ss, SHEET_NAMES.GRATITUDE, ['ID', 'Fecha', 'Texto']);
  ensureSheet(ss, SHEET_NAMES.QUOTES, ['ID', 'Fecha', 'Texto', 'Autor']);
  ensureSheet(ss, SHEET_NAMES.USER, ['ID', 'Nombre', 'Correo', 'Clave']);

  // Format Columns
  fixColumnFormats(ss);
}

function fixColumnFormats(ss) {
    const sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    if(sheet) {
        const headers = getSheetHeaderMap(sheet);
        const lastRow = sheet.getLastRow();
        if(lastRow > 1) {
            if(headers['Monto']) sheet.getRange(2, headers['Monto'], lastRow - 1, 1).setNumberFormat("#,##0.00");
            if(headers['Fecha']) sheet.getRange(2, headers['Fecha'], lastRow - 1, 1).setNumberFormat("@");
            if(headers['FechaPagoReal']) sheet.getRange(2, headers['FechaPagoReal'], lastRow - 1, 1).setNumberFormat("@");
        }
    }
}

function ensureSheet(ss, name, coreHeaders) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(coreHeaders);
    sheet.getRange(1, 1, 1, coreHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    const currentHeaders = getSheetHeaders(sheet);
    const missing = coreHeaders.filter(h => !currentHeaders.includes(h));
    if (missing.length > 0) {
      const startCol = currentHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  }
}

// ------------------------------------------------------------------
// API POST
// ------------------------------------------------------------------

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') return getData();
  return responseJSON({ status: 'error', message: 'Acción no válida' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return responseJSON({ status: 'error', message: 'Servidor ocupado' });

  try {
    let action = e.parameter.action;
    let payload = e.parameter || {}; 

    if (e.postData && e.postData.contents) {
      try {
        const json = JSON.parse(e.postData.contents);
        if (json.action) action = json.action;
        if (json.payload) payload = json.payload;
      } catch (parseErr) {
        // Ignorar error de parseo si ya tenemos acción
      }
    }

    if (!action) return responseJSON({ status: 'error', message: 'No se especificó acción' });

    // ROUTING
    switch (action) {
      case 'login': return handleLogin(payload.email, payload.password);
      
      // Transacciones
      case 'addTransaction': return handleAddTransaction(payload);
      case 'updateTransaction': return handleUpdateTransaction(payload);
      case 'deleteTransaction': return handleDeleteTransaction(payload);
      
      // Cuentas
      case 'addAccount': return handleAddAccount(payload);
      case 'updateAccount': return handleUpdateAccount(payload);
      case 'deleteAccount': return deleteRow(SHEET_NAMES.ACCOUNTS, payload.ID);
      
      // Metas
      case 'addGoal': return createRow(SHEET_NAMES.GOALS, payload);
      case 'updateGoal': return handleUpdateGoal(payload);
      case 'deleteGoal': return deleteRow(SHEET_NAMES.GOALS, payload.ID);
      
      // Recurrentes
      case 'addRecurringRule': return createRow(SHEET_NAMES.RECURRING, payload);
      case 'updateRecurringRule': return updateRow(SHEET_NAMES.RECURRING, payload.ID, payload);
      case 'deleteRecurringRule': return deleteRow(SHEET_NAMES.RECURRING, payload.ID);

      // Settings
      case 'addSetting': return createRow(SHEET_NAMES.SETTINGS, payload);

      // Hábitos & Crecimiento
      case 'addHabit': return createRow(SHEET_NAMES.HABITS, payload);
      case 'updateHabit': return updateRow(SHEET_NAMES.HABITS, payload.ID, payload);
      case 'deleteHabit': return deleteRow(SHEET_NAMES.HABITS, payload.ID);
      case 'logHabit': return createRowWithCheck(SHEET_NAMES.HABITS_LOG, payload); 

      // Gratitud CRUD [NUEVO]
      case 'addGratitude': 
        payload.Fecha = payload.Fecha || new Date().toISOString();
        return createRow(SHEET_NAMES.GRATITUDE, payload);
      case 'updateGratitude': return updateRow(SHEET_NAMES.GRATITUDE, payload.ID, payload);
      case 'deleteGratitude': return deleteRow(SHEET_NAMES.GRATITUDE, payload.ID);

      // Frases CRUD [NUEVO]
      case 'addQuote': 
        payload.Fecha = payload.Fecha || new Date().toISOString();
        return createRow(SHEET_NAMES.QUOTES, payload);
      case 'updateQuote': return updateRow(SHEET_NAMES.QUOTES, payload.ID, payload);
      case 'deleteQuote': return deleteRow(SHEET_NAMES.QUOTES, payload.ID);

      default: return responseJSON({ status: 'error', message: 'Acción no reconocida: ' + action });
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------
// LÓGICA ESPECÍFICA
// ------------------------------------------------------------------

function handleLogin(email, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.USER));
  const user = users.find(u => String(u['Correo']).toLowerCase() === String(email).toLowerCase() && String(u['Clave']) === String(password));
  
  if (user) {
    return responseJSON({ 
        status: "success", 
        user: { id: user['ID'], name: user['Nombre'], email: user['Correo'] } 
    });
  }
  return responseJSON({ status: "error", message: "Credenciales incorrectas" });
}

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transactions = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.TRANSACTIONS));
  const accounts = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.ACCOUNTS));

  // Recalcular saldo real de cuentas
  const accountsWithRealBalance = accounts.map(acc => {
    let balance = parseFloat(acc['SaldoInicial'] || 0);
    const accName = String(acc['Nombre'] || '').trim().toUpperCase();

    transactions.forEach(tx => {
      const txAcc = String(tx['Cuenta'] || '').trim().toUpperCase();
      if (txAcc === accName && tx['Estado'] === 'Validado') {
        const amount = parseFloat(tx['Monto'] || 0);
        if (tx['Tipo'] === 'Ingreso') balance += amount;
        else balance -= amount;
      }
    });

    return { ...acc, SaldoActual: balance };
  });

  return responseJSON({
    status: 'success',
    data: {
      transactions: transactions,
      accounts: accountsWithRealBalance,
      goals: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.GOALS)),
      settings: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.SETTINGS)),
      recurring: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.RECURRING)),
      habits: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.HABITS)),
      habitsLog: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.HABITS_LOG)),
      gratitude: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.GRATITUDE)),
      quotes: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.QUOTES))
    }
  });
}

function handleAddTransaction(data) {
  let realDate = data['Fecha'];
  let status = data['Estado'] || 'Validado';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const accountsData = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.ACCOUNTS));
  const acc = accountsData.find(a => a['Nombre'] === data['Cuenta']);
  
  if (acc && acc['Tipo'] === 'Tarjeta de Crédito') {
     if (data['Tipo'] !== 'Ingreso') {
        realDate = calculateRealPaymentDate(data['Fecha'], acc['DiaCorte'], acc['DiaPago']);
        status = 'Pendiente';
     }
  }

  data['FechaPagoReal'] = realDate;
  data['FechaCreacion'] = new Date().toISOString();
  data['Estado'] = status;
  
  return createRow(SHEET_NAMES.TRANSACTIONS, data);
}

function handleUpdateTransaction(payload) {
  // Lógica de balance si cambia estado se omite por simplicidad en v5 (recalc en getData)
  return updateRow(SHEET_NAMES.TRANSACTIONS, payload.ID, payload);
}

function handleDeleteTransaction(payload) {
  return deleteRow(SHEET_NAMES.TRANSACTIONS, payload.ID);
}

function handleAddAccount(data) {
  if (data['Nombre']) data['Nombre'] = data['Nombre'].toUpperCase();
  data['SaldoActual'] = data['SaldoInicial'];
  return createRow(SHEET_NAMES.ACCOUNTS, data);
}

function handleUpdateAccount(data) {
    const id = data['ID'];
    if (data['Nombre']) data['Nombre'] = data['Nombre'].toUpperCase();
    return updateRow(SHEET_NAMES.ACCOUNTS, id, data);
}

function handleUpdateGoal(data) {
    if (data['amount']) {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const goals = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.GOALS));
       const goal = goals.find(r => String(r['ID']) === String(data['ID']));
       if(goal) {
          const current = parseFloat(goal['MontoAhorrado'] || 0);
          const added = parseFloat(data['amount']);
          data['MontoAhorrado'] = current + added;
          delete data['amount'];
       }
    }
    return updateRow(SHEET_NAMES.GOALS, data['ID'], data);
}

// ------------------------------------------------------------------
// HELPERS BD
// ------------------------------------------------------------------

function createRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = getSheetHeaderMap(sheet); 
  const id = dataObj['ID'] || Utilities.getUuid();
  dataObj['ID'] = id; 
  
  const lastCol = sheet.getLastColumn();
  const rowArray = new Array(lastCol).fill('');
  for (const [key, value] of Object.entries(dataObj)) {
    if (headers.hasOwnProperty(key)) rowArray[headers[key] - 1] = value;
  }
  sheet.appendRow(rowArray);
  return responseJSON({ status: 'success', message: 'Creado', id: id });
}

function createRowWithCheck(sheetName, dataObj) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = getSheetHeaderMap(sheet);
    
    // Evitar duplicados para logs de hábitos (mismo hábito, misma fecha)
    if (sheetName === SHEET_NAMES.HABITS_LOG) {
        const idCol = headers['ID_Habito'] - 1;
        const dateCol = headers['Fecha'] - 1;
        const exists = data.some(row => String(row[idCol]) === String(dataObj.ID_Habito) && String(row[dateCol]).substring(0,10) === String(dataObj.Fecha).substring(0,10));
        if (exists) return responseJSON({ status: 'success', message: 'Ya existe' });
    }
    
    return createRow(sheetName, dataObj);
}

function updateRow(sheetName, id, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = getSheetHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  const idColIndex = headers['ID'] - 1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
       const rowIndex = i + 1;
       for (const [key, value] of Object.entries(dataObj)) {
         if (headers.hasOwnProperty(key) && key !== 'ID') {
           sheet.getRange(rowIndex, headers[key]).setValue(value);
         }
       }
       return responseJSON({ status: 'success', message: 'Actualizado' });
    }
  }
  return responseJSON({ status: 'error', message: 'ID no encontrado' });
}

function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = getSheetHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  const idColIndex = headers['ID'] - 1;
  const idColHabitoIndex = headers['ID_Habito'] - 1;

  for (let i = 1; i < data.length; i++) {
    // Check ID or ID_Habito for habit logs
    const rowId = data[i][idColIndex] || data[i][idColHabitoIndex];
    if (String(rowId) === String(id)) {
       sheet.deleteRow(i + 1);
       return responseJSON({ status: 'success', message: 'Eliminado' });
    }
  }
  return responseJSON({ status: 'error', message: 'ID no encontrado' });
}

function readSheetAsJSON(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getSheetHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { if(h) map[h] = i + 1; });
  return map;
}

function getSheetHeaders(sheet) {
   const lastCol = sheet.getLastColumn();
   if (lastCol === 0) return [];
   return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function calculateRealPaymentDate(dateStr, cutoff, payment) {
    if (!cutoff || !payment) return dateStr;
    const date = new Date(dateStr);
    const d = date.getDate();
    let m = date.getMonth();
    let y = date.getFullYear();
    if (d > cutoff) {
        m++;
        if (m > 11) { m = 0; y++; }
    }
    if (payment <= cutoff) {
        m++;
        if (m > 11) { m = 0; y++; }
    }
    const finalM = m + 1;
    const sm = finalM < 10 ? '0'+finalM : finalM;
    const sd = payment < 10 ? '0'+payment : payment;
    return `${y}-${sm}-${sd}`;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function recalcBalances() {
    // Placeholder - GetData already recalculates dynamically
    return responseJSON({ status: 'success', message: 'Saldos dinámicos en v5' });
}
