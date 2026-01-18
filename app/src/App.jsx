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
            <Route path="/alerts" element={<PaymentAlertsPage />} />
          </Routes>
        </MainLayout>
      </AppProvider>
    </Router>
  );
}

export default App;
