import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { DiaryProvider } from './hooks/useDiary';
import { DiaryPage } from './pages/DiaryPage';
import { PatientPage } from './pages/PatientPage';
import { SendPage } from './pages/SendPage';
import { InfoPage } from './pages/InfoPage';

export default function App() {
  return (
    <ToastProvider>
      <DiaryProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DiaryPage />} />
              <Route path="/dane" element={<PatientPage />} />
              <Route path="/wyslij" element={<SendPage />} />
              <Route path="/informacje" element={<InfoPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DiaryProvider>
    </ToastProvider>
  );
}
