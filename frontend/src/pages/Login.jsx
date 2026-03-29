import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

const VITE_DEV_TEST_LOGIN = import.meta.env.VITE_DEV_TEST_LOGIN === 'true';

function Login() {
  const [loading, setLoading] = useState(false);
  const { login, testLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const googleUser = {
        id: 'google-oauth-user-001',
        name: 'Google User',
        email: 'user@gmail.com',
        oauthProvider: 'google',
      };
      login(googleUser);
      navigate('/');
      setLoading(false);
    }, 500);
  };

  const handleTestLogin = () => {
    setLoading(true);
    testLogin();
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LLM Firewall
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {VITE_DEV_TEST_LOGIN && (
          <div className="mt-4">
            <button
              onClick={handleTestLogin}
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-dashed border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <User className="h-4 w-4 mr-2" />
              {loading ? 'Signing in...' : 'Dev: Sign in with test account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
