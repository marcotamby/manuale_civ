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
  message?: string | null;
}

export function LoginModal({ isOpen, onClose, message }: LoginModalProps) {
  const { login } = useAuth();
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSuccess = (credentialResponse: any) => {
    const decoded: any = jwtDecode(credentialResponse.credential);
    login({
      name: decoded.name,
      email: decoded.email,
      avatar_url: decoded.picture
    }, credentialResponse.credential);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
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

        <div className="flex flex-col gap-6">
          <p className="text-gray-400 text-center text-sm">
            {message || "Esegui l'accesso con il tuo account Google per poter proporre modifiche e salvare le tue civiltà preferite."}
          </p>

          <div className="flex justify-center my-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Errore durante il login con Google')}
              useOneTap
              theme="filled_blue"
              shape="pill"
            />
          </div>

          {error && <p className="text-red-400 text-center text-sm italic">{error}</p>}
          
          <p className="text-[10px] text-gray-500 text-center italic">
            Accedendo accetti la nostra informativa sulla privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
