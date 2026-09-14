import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';
import './generated.css';
import '@xyflow/react/dist/style.css';
import { SessionList } from './views/SessionList';
import { SessionDetail } from './views/SessionDetail';
import { UsageStats } from './views/UsageStats';
import { Icon } from './components/Icon';

function Shell() {
  const location = useLocation();
  const [motion, setMotion] = useState(
    () => localStorage.getItem('orbit-motion') !== 'off'
  );
  return (
    <div className={`app-shell ${motion ? '' : 'motion-off'}`}>
      <aside className="app-rail">
        <NavLink to="/" className="brand" aria-label="Codex Viz 首页">
          <span className="brand-symbol">
            <Icon name="orbit" size={29} />
          </span>
          <span>
            codex<span className="brand-light">viz</span>
            <small>YOUR LOCAL ORBIT</small>
          </span>
        </NavLink>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="主导航">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-item ${isActive || location.pathname.startsWith('/sessions') ? 'active' : ''}`
            }
          >
            <Icon name="grid" />
            <span>任务档案</span>
            <span className="nav-index">01</span>
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon name="chart" />
            <span>使用洞察</span>
            <span className="nav-index">02</span>
          </NavLink>
        </nav>
        <div className="rail-art" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            IDEAS INTO
            <br />
            EVERYTHING.
          </span>
        </div>
        <div className="rail-bottom">
          <div className="local-status">
            <span className="status-dot" /> 本地工作空间
          </div>
          <p>
            思考、构建、探索。
            <br />
            让每次协作清晰可见。
          </p>
          <div className="rail-signature">
            <Icon name="shield" size={14} /> 数据留在你的设备上
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            工作空间 <span>/</span>{' '}
            <strong>
              {location.pathname === '/stats'
                ? '使用洞察'
                : location.pathname.startsWith('/sessions')
                  ? '任务详情'
                  : '任务档案'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-label">
              <span className="status-dot" /> LOCAL FIRST
            </span>
            <button
              className="icon-button motion-toggle"
              title={motion ? '关闭装饰动效' : '开启装饰动效'}
              aria-label={motion ? '关闭装饰动效' : '开启装饰动效'}
              aria-pressed={motion}
              onClick={() => {
                setMotion(!motion);
                localStorage.setItem('orbit-motion', motion ? 'off' : 'on');
                document.documentElement.dataset.motion = motion ? 'off' : 'on';
              }}
            >
              <Icon name="bolt" size={16} />
            </button>
            <span className="avatar">CV</span>
          </div>
        </header>
        <div className="route-content" key={location.pathname}>
          <Routes>
            <Route path="/" element={<SessionList />} />
            <Route path="/stats" element={<UsageStats />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <footer className="app-footer">
          <span>
            CODEX VIZ <span className="footer-cross">+</span> BUILT FOR
            EXPLORATION
          </span>
          <span>
            本地记录 · 无限可能 <Icon name="orbit" size={14} />
          </span>
        </footer>
      </div>
    </div>
  );
}
function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
document.documentElement.classList.add('dark');
document.documentElement.dataset.motion =
  localStorage.getItem('orbit-motion') ?? 'on';
createRoot(document.getElementById('root')!).render(<App />);
