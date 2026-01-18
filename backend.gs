/**
 * ------------------------------------------------------------------
 * BACKEND FINANCIERO DINÁMICO v3 (Recurrentes & Estados)
 * ------------------------------------------------------------------
 */

const SHEET_NAMES = {
  TRANSACTIONS: 'Transacciones',
  ACCOUNTS: 'Cuentas',
  GOALS: 'Metas',
  SETTINGS: 'Configuracion',
  RECURRING: 'Recurrentes' // [NEW]
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
  
  // 1. Transacciones (Ahora con Estado y MesAfectacion)
  ensureSheet(ss, SHEET_NAMES.TRANSACTIONS, [
    'ID', 'Fecha', 'MesAfectacion', 'Tipo', 'Categoria', 'Monto', 'Cuenta', 'Descripcion', 'FechaCreacion', 'FechaPagoReal', 'Estado'
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
  
  // 5. Recurrentes [NEW]
  ensureSheet(ss, SHEET_NAMES.RECURRING, [
    'ID', 'Nombre', 'Tipo', 'Monto', 'Categoria', 'Cuenta', 'Frecuencia', 'DiaEjecucion', 'FechaInicio', 'FechaFin', 'UltimaEjecucion'
  ]);
  
  // Seed settings
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet && settingsSheet.getLastRow() === 1) {
     settingsSheet.getRange(2, 1, 6, 2).setValues([
      ['Gasto', 'Alimentación'], ['Gasto', 'Transporte'],
      ['Gasto', 'Vivienda'], ['Ingreso', 'Salario']
    ]);
  }
  // REPARACIÓN DE FORMATOS (Fix para 1900 y 2026)
  fixColumnFormats(ss);
}

function fixColumnFormats(ss) {
    const sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
    if(sheet) {
        const headers = getSheetHeaderMap(sheet);
        const lastRow = sheet.getLastRow();
        if(lastRow > 1) {
            // Monto -> Moneda/Numero
            if(headers['Monto']) {
                sheet.getRange(2, headers['Monto'], lastRow - 1, 1).setNumberFormat("#,##0.00");
            }
            // Fecha -> Texto/Fecha (YYYY-MM-DD para compatibilidad)
            if(headers['Fecha']) {
                sheet.getRange(2, headers['Fecha'], lastRow - 1, 1).setNumberFormat("@"); // Texto plano valida mejor YYYY-MM-DD
            }
             // FechaPagoReal -> Texto/Fecha
            if(headers['FechaPagoReal']) {
                sheet.getRange(2, headers['FechaPagoReal'], lastRow - 1, 1).setNumberFormat("@");
            }
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
    console.log(`Hoja ${name} creada.`);
  } else {
    // Verificar si faltan headers core y agregarlos
    const currentHeaders = getSheetHeaders(sheet);
    const missing = coreHeaders.filter(h => !currentHeaders.includes(h));
    if (missing.length > 0) {
      const startCol = currentHeaders.length + 1;
      sheet.getRange(1, startCol, 1, missing.length).setValues([missing]).setFontWeight('bold');
      console.log(`Columnas agregadas a ${name}: ${missing.join(', ')}`);
    }
  }
}

// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') return getData();
  return responseJSON({ status: 'error', message: 'Acción no válida' });
}

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const payload = json.payload;

    // Transacciones
    if (action === 'addTransaction') return handleAddTransaction(payload);
    if (action === 'updateTransaction') return updateRow(SHEET_NAMES.TRANSACTIONS, payload.ID, payload);
    if (action === 'deleteTransaction') return deleteRow(SHEET_NAMES.TRANSACTIONS, payload.ID); // [NEW]
    
    // Cuentas
    if (action === 'addAccount') return handleAddAccount(payload);
    if (action === 'updateAccount') return handleUpdateAccount(payload);
    if (action === 'deleteAccount') return handleDeleteAccount(payload);
    
    // Metas
    if (action === 'addGoal') return createRow(SHEET_NAMES.GOALS, payload);
    if (action === 'updateGoal') return handleUpdateGoal(payload);
    
    // Recurrentes [NEW]
    if (action === 'addRecurringRule') return createRow(SHEET_NAMES.RECURRING, payload);
    if (action === 'updateRecurringRule') return updateRow(SHEET_NAMES.RECURRING, payload.ID, payload);
    if (action === 'deleteRecurringRule') return deleteRow(SHEET_NAMES.RECURRING, payload.ID);

    // Settings [NEW]
    if (action === 'addSetting') return createRow(SHEET_NAMES.SETTINGS, payload);

    return responseJSON({ status: 'error', message: 'Acción no reconocida' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ------------------------------------------------------------------
// LÓGICA CORE
// ------------------------------------------------------------------

function handleAddTransaction(data) {
  // 1. Calculo de Fecha Real
  let realDate = data['Fecha'];
  let status = 'Validado'; // Por defecto

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const accountsData = readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.ACCOUNTS));
  const acc = accountsData.find(a => a['Nombre'] === data['Cuenta']);
  
  if (acc && acc['Tipo'] === 'Tarjeta de Crédito') {
     // Si es Gasto en TC -> Pendiente (hasta corte/pago). Si es Ingreso (pago a la TC o reversión) -> Validado.
     // Asumimos que si registras un pago a la tarjeta, ya lo hiciste.
     if (data['Tipo'] !== 'Ingreso') {
        realDate = calculateRealPaymentDate(data['Fecha'], acc['DiaCorte'], acc['DiaPago']);
        status = 'Pendiente';
     }
  }
  
  // Si nos mandan un estado explicito (ej. al confirmar recurrente), lo respetamos
  if (data['Estado']) status = data['Estado'];

  data['FechaPagoReal'] = realDate;
  data['FechaCreacion'] = new Date().toISOString();
  data['Estado'] = status;
  
  // 2. Guardar
  const response = createRow(SHEET_NAMES.TRANSACTIONS, data);
  
  // 3. Side Effect: Actualizar Saldo (Solo si está validado?)
  // NOTA: Usualmente el saldo contable se afecta inmediato, o diferido?
  // Para simplicidad, afectamos "SaldoActual" siempre, pues es deuda adquirida.
  updateAccountBalance(data['Cuenta'], data['Monto'], data['Tipo']);
  
  return response;
}

function handleAddAccount(data) {
  if (data['Nombre']) data['Nombre'] = data['Nombre'].toUpperCase();
  if (data['Tipo'] !== 'Tarjeta de Crédito') {
      data['DiaCorte'] = '';
      data['DiaPago'] = '';
  }
  data['SaldoActual'] = data['SaldoInicial'];
  return createRow(SHEET_NAMES.ACCOUNTS, data);
}

function handleUpdateAccount(data) {
    const id = data['ID'];
    delete data['ID'];
    if (data['Nombre']) data['Nombre'] = data['Nombre'].toUpperCase();
    
    if (data['Tipo'] && data['Tipo'] !== 'Tarjeta de Crédito') {
        data['DiaCorte'] = '';
        data['DiaPago'] = '';
    }
    return updateRow(SHEET_NAMES.ACCOUNTS, id, data);
}

function handleDeleteAccount(data) {
    return deleteRow(SHEET_NAMES.ACCOUNTS, data['ID']);
}

function handleUpdateGoal(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.GOALS);
    const rows = readSheetAsJSON(sheet);
    const goal = rows.find(r => r['ID'] === data['ID']);
    
    if (!goal) return responseJSON({status:'error', message:'Meta no encontrada'});
    
    const current = parseFloat(goal['MontoAhorrado'] || 0);
    const added = parseFloat(data['amount']); 
    const newTotal = current + added;
    
    return updateRow(SHEET_NAMES.GOALS, data['ID'], { 'MontoAhorrado': newTotal });
}


// ------------------------------------------------------------------
// HELPERS DINÁMICOS
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
    if (data[i][idColIndex] == id) {
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
    if (data[i][idColIndex] == id) {
       sheet.deleteRow(i + 1);
       return responseJSON({ status: 'success', message: 'Eliminado' });
    }
  }
  return responseJSON({ status: 'error', message: 'ID no encontrado' });
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

function readSheetAsJSON(sheet) {
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

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return responseJSON({
    status: 'success',
    data: {
      transactions: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)),
      accounts: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.ACCOUNTS)),
      goals: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.GOALS)),
      settings: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.SETTINGS)),
      recurring: readSheetAsJSON(ss.getSheetByName(SHEET_NAMES.RECURRING)) // [NEW]
    }
  });
}

function updateAccountBalance(accountName, amount, type) {
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
