import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import './generated.css';
import '@xyflow/react/dist/style.css';
import { SessionList } from './views/SessionList';
import { SessionDetail } from './views/SessionDetail';
import { UsageStats } from './views/UsageStats';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-300">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3">
            <NavLink to="/" className="text-base font-semibold">Codex Viz</NavLink>
            <span className="text-xs text-slate-500">本地 session 查看器</span>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<SessionList />} />
          <Route path="/stats" element={<UsageStats />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
