import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {PluginProvider} from './plugins/PluginContext';
import {ErrorBoundary} from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <PluginProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </PluginProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
);

