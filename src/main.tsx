/**
 * Punto de entrada de React en el navegador.
 * Monta el componente raíz <App /> dentro del elemento #root con StrictMode habilitado.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Crea la raíz de React en el nodo del DOM y renderiza la aplicación principal
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
