import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddinApiProvider } from './geotab/useAddinApi';
import { initializeAddinLifecycle } from './geotab/addin';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function initializeAddin() {
  initializeAddinLifecycle((api, credentials) => {
    console.log('[Add-In] Initialized for database:', credentials.database, 'user:', credentials.userName);
  });
}

if (typeof window !== 'undefined') {
  initializeAddin();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AddinApiProvider>
        <App />
      </AddinApiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);