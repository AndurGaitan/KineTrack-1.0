import './theme.css';
import './index.css';
import './base.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initTheme } from './hooks/useTheme';

initTheme();

createRoot(document.getElementById('root')!).render(<App />);
