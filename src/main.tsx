import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/factors.css';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el nodo #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: el service worker solo se registra en producción para no interferir con HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* la app sigue funcionando sin caché offline */
    });
  });
}
