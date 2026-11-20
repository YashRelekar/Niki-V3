import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Auto-register the PWA service worker (autoUpdate keeps the kiosk fresh)
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
