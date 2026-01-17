import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import GoalsPage from './pages/GoalsPage';
import AnalysisPage from './pages/AnalysisPage';
import PaymentAlertsPage from './pages/PaymentAlertsPage';

import RecurringRulesPage from './pages/RecurringRulesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <AppProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/recurring" element={<RecurringRulesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Payment Alerts integrado quizás en Dashboard o como extra, pero vamos a ponerle ruta si el usuario quiere */}
            {/* El sidebar no tenía "Alertas", pero podemos añadirlo o dejarlo como widget. 
                El usuario pidió "Alertas de Pago: Un calendario o lista...". 
                Vamos a agregarlo como una página nueva o sección en Dashboard. 
                En el Layout actual no hay link directo a "Alertas", pero en el prompt inicial decía "Funcionalidades Principales > Alertas de Pago".
                Voy a asumir que puede estar en Dashboard o ser una vista propia. Lo haré página propia y agregaré al Layout si hace falta, 
                o mejor aún, lo integro en Settings o Dashboard. 
                Espera, el usuario dijo "Una sección...". Haremos una página '/alerts' pero como no está en el menú del layout, 
                voy a modificar el layout también.
            */}
          </Routes>
        </MainLayout>
      </AppProvider>
    </Router>
  );
}

export default App;
