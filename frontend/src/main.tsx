// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Vérification de support des fonctionnalités modernes
const checkBrowserSupport = () => {
  const requirements = [
    'fetch' in window,
    'Promise' in window,
    'localStorage' in window,
    'sessionStorage' in window,
    CSS.supports('display', 'grid'),
    CSS.supports('backdrop-filter', 'blur(10px)')
  ];

  const unsupported = requirements.filter(req => !req);
  
  if (unsupported.length > 0) {
    console.warn('⚠️ Certaines fonctionnalités peuvent ne pas être supportées par ce navigateur');
  }
  
  return unsupported.length === 0;
};

// Initialisation de l'application
const initializeApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Element root non trouvé');
  }

  // Vérification du support navigateur
  checkBrowserSupport();

  // Configuration globale
  console.log('🚀 Initialisation OSINT Framework Frontend v2.0');
  console.log('🔧 Mode:', import.meta.env.MODE);
  console.log('🌐 API URL:', import.meta.env.VITE_API_URL || 'Default');

  // Création de l'application React
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
  console.error('❌ Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejetée:', event.reason);
});

// Démarrage de l'application
try {
  initializeApp();
} catch (error) {
  console.error('💥 Erreur critique lors de l\'initialisation:', error);
  
  // Affichage d'une erreur de fallback
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0f;
      color: #fff;
      font-family: monospace;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="color: #ff0040; margin-bottom: 20px;">❌ Erreur Critique</h1>
      <p style="color: #666; margin-bottom: 30px;">
        Impossible d'initialiser l'application OSINT Framework
      </p>
      <pre style="
        background: #111;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #333;
        color: #00ffff;
        overflow: auto;
        max-width: 600px;
      ">${error}</pre>
      <button 
        onclick="location.reload()" 
        style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #00ffff;
          color: #000;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        "
      >
        Recharger la page
      </button>
    </div>
  `;
}