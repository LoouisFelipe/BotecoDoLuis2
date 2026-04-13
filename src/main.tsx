import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress Vite HMR WebSocket errors in AI Studio environment
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[vite] failed to connect to websocket')) {
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
      event.preventDefault();
    }
  });
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error("Fatal Render Error:", error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #05070a; font-family: sans-serif;">
        <h1>Erro Crítico de Inicialização</h1>
        <p>Ocorreu um erro ao carregar o sistema. Por favor, verifique o console do navegador (F12).</p>
        <pre style="background: #1a1a1a; padding: 10px; border-radius: 5px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}
