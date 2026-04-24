import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleOAuthLogin } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;
    
    const provider = searchParams.get('provider');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const oauthId = searchParams.get('oauthId');
    const userId = searchParams.get('userId');

    if (provider && email && name) {
      handleOAuthLogin(provider, email, name, oauthId || null, userId);
      hasNavigated.current = true;
      window.location.href = '/';
    } else {
      hasNavigated.current = true;
      window.location.href = '/login?error=authentication_failed';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
