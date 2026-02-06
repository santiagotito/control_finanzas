/**
 * ------------------------------------------------------------------
 * BACKEND FINANCIERO UNIFICADO v4
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
    'ID', 'Nombre', 'Tipo', 'SaldoInicial', 'SaldoActual', 'Moneda', 'DiaCorte', 'DiaPago', 'NumeroCuenta'
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
  
  // 6. Nuevos Módulos
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
  if (!lock.tryLock(10000)) return responseJSON({ status: 'error', message: 'Server busy' });

  try {
    let action = e.parameter.action;
    let payload = {};

    // Parse JSON body if available
    if (e.postData && e.postData.contents) {
      const json = JSON.parse(e.postData.contents);
      if (json.action) action = json.action;
      if (json.payload) payload = json.payload;
    }

    if (!action) return responseJSON({ status: 'error', message: 'No action specified' });

    // ROUTING
    switch (action) {
      case 'login': return handleLogin(payload.email, payload.password);
      
      // Core Data
      case 'addTransaction': return handleAddTransaction(payload);
      case 'updateTransaction': return updateRow(SHEET_NAMES.TRANSACTIONS, payload.ID, payload);
      case 'deleteTransaction': return deleteRow(SHEET_NAMES.TRANSACTIONS, payload.ID);
      
      case 'addAccount': return handleAddAccount(payload);
      case 'updateAccount': return updateRow(SHEET_NAMES.ACCOUNTS, payload.ID, payload);
      case 'deleteAccount': return deleteRow(SHEET_NAMES.ACCOUNTS, payload.ID);
      
      case 'addGoal': return createRow(SHEET_NAMES.GOALS, payload);
      case 'updateGoal': return handleUpdateGoal(payload);
      case 'deleteGoal': return deleteRow(SHEET_NAMES.GOALS, payload.ID);
      
      case 'addRecurringRule': return createRow(SHEET_NAMES.RECURRING, payload);
      case 'updateRecurringRule': return updateRow(SHEET_NAMES.RECURRING, payload.ID, payload);
      case 'deleteRecurringRule': return deleteRow(SHEET_NAMES.RECURRING, payload.ID);

      case 'addSetting': return createRow(SHEET_NAMES.SETTINGS, payload);

      // Habits & Growth
      case 'addHabit': return createRow(SHEET_NAMES.HABITS, payload);
      case 'updateHabit': return updateRow(SHEET_NAMES.HABITS, payload.ID, payload);
      case 'deleteHabit': return deleteRow(SHEET_NAMES.HABITS, payload.ID);
      case 'logHabit': return createRow(SHEET_NAMES.HABITS_LOG, payload); 

      case 'addGratitude': return createRow(SHEET_NAMES.GRATITUDE, payload);
      case 'addQuote': return createRow(SHEET_NAMES.QUOTES, payload);

      default: return responseJSON({ status: 'error', message: 'Acción no reconocida: ' + action });
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------
// LÓGICA CORE
// ------------------------------------------------------------------

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return responseJSON({
    status: 'success',
    data: {
      transactions: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)),
      accounts: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.ACCOUNTS)),
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
  
  const response = createRow(SHEET_NAMES.TRANSACTIONS, data);
  updateAccountBalance(data['Cuenta'], data['Monto'], data['Tipo']);
  return response;
}

function handleAddAccount(data) {
  if (data['Nombre']) data['Nombre'] = data['Nombre'].toUpperCase();
  data['SaldoActual'] = data['SaldoInicial'];
  return createRow(SHEET_NAMES.ACCOUNTS, data);
}

function handleUpdateGoal(data) {
    if (data['amount']) {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const goal = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.GOALS)).find(r => r['ID'] === data['ID']);
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
// HELPERS GENÉRICOS DE BD
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
    if (headers.hasOwnProperty(key)) {
       rowArray[headers[key] - 1] = value;
    }
  }
  
  sheet.appendRow(rowArray);
  return responseJSON({ status: 'success', message: 'Creado', id: id });
}

function updateRow(sheetName, id, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = getSheetHeaderMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  const idColIndex = headers['ID'] - 1;
  if (idColIndex === undefined) return responseJSON({status:'error', message:'No hay columna ID'});

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
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
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

function updateAccountBalance(accountName, amount, type) {
  try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAMES.ACCOUNTS);
      const rows = readSheetAsJSON(sheet);
      const acc = rows.find(r => r['Nombre'] === accountName);
      
      if (acc) {
         let current = parseFloat(acc['SaldoActual'] || 0);
         let val = parseFloat(amount);
         if (type === 'Gasto') current -= val;
         else current += val;
         updateRow(SHEET_NAMES.ACCOUNTS, acc['ID'], { 'SaldoActual': current });
      }
  } catch(e) {
      console.log('Error updating balance: ' + e);
  }
}

function calculateRealPaymentDate(dateStr, cutoff, payment) {
    if (!cutoff || !payment) return dateStr;
    const date = new Date(dateStr);
    const d = date.getDate();
    let m = date.getMonth();
    let y = date.getFullYear();
    
    let targetM = m;
    let targetY = y;
    if (d > cutoff) {
        targetM++;
        if (targetM > 11) { targetM = 0; targetY++; }
    }
    
    let payM = targetM;
    let payY = targetY;
    
    if (payment <= cutoff) {
        payM++;
        if (payM > 11) { payM = 0; payY++; }
    }
    
    const finalM = payM + 1;
    const sm = finalM < 10 ? '0'+finalM : finalM;
    const sd = payment < 10 ? '0'+payment : payment;
    return `${payY}-${sm}-${sd}`;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}