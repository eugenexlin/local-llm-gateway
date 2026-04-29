import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  
  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      
      if (error) {
        window.location.href = `/login?error=${error}`;
        return;
      }

      const authenticated = searchParams.get('authenticated');
      if (authenticated === 'true') {
        await checkAuth();
        window.location.href = '/';
      } else {
        window.location.href = '/login?error=authentication_failed';
      }
    };

    handleCallback();
  }, [searchParams, checkAuth]);

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
