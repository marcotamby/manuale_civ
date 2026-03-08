import { useState } from 'react';
import { useAuth } from './AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length === 0) {
      setError('Inserisci un nome utente valido.');
      return;
    }
    if (password !== 'admin' && username.toLowerCase() === 'admin') {
      setError('Password errata per admin.');
      return;
    }
    
    login({ name: username });
    onClose();
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    const decoded: any = jwtDecode(credentialResponse.credential);
    login({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="glass border border-[#D4AF37]/30 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 className="text-2xl font-bold mb-6 text-white text-center italic font-serif">Accedi</h2>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center mb-2">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Errore durante il login con Google')}
              useOneTap
              theme="filled_blue"
              shape="pill"
            />
          </div>

          <div className="flex items-center gap-4 my-2">
            <div className="h-[1px] bg-gray-700 flex-1" />
            <span className="text-xs text-gray-500 uppercase font-bold">Oppure</span>
            <div className="h-[1px] bg-gray-700 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                placeholder="Inserisci nome utente..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                placeholder="Inserisci password..."
              />
            </div>

            {error && <p className="text-red-400 text-sm italic">{error}</p>}

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg border border-white/10 transition-all mt-2"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
