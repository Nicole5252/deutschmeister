import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FlashcardsPage from './pages/FlashcardsPage';
import DeckDetail from './pages/DeckDetail';
import StudyMode from './pages/StudyMode';
import GrammarPage from './pages/GrammarPage';
import GrammarPractice from './pages/GrammarPractice';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import ToastContainer from './components/ToastContainer';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cards" element={<FlashcardsPage />} />
            <Route path="cards/deck/:deckId" element={<DeckDetail />} />
            <Route path="cards/study/:deckId" element={<StudyMode />} />
            <Route path="grammar" element={<GrammarPage />} />
            <Route path="grammar/practice/:topicId" element={<GrammarPractice />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
