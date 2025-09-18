import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import PortionTracker from './App';

const GOOGLE_CLIENT_ID = "748727037901-fsel2fqut0e29k46sm1cv5jhbbeoai5t.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PortionTracker />
    </GoogleOAuthProvider>
  </React.StrictMode>
);