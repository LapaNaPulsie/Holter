import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-ext-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-ext-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-ext-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-ext-700.css';
import '@fontsource/montserrat/latin-800.css';
import '@fontsource/montserrat/latin-ext-800.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.transition = 'opacity 250ms ease';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }
});
