import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { APIKeyProvider } from "./context/APIKeyContext";
import { ChatProvider } from "./context/ChatContext";
import Dashboard from "./pages/Dashboard";
import APIKeys from "./pages/APIKeys";
import ServerStats from "./pages/ServerStats";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import MainLayout from "./components/MainLayout";

interface PrivateRouteProps {
  children?: React.ReactNode;
}

interface PublicRouteProps {
  children?: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div >
      </div >
    );
  }

  return user ? (children || <Outlet />) : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div >
      </div >
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}

function RootRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div >
      </div >
    );
  }

  return children;
}

function NotFoundRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div >
      </div >
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <APIKeyProvider>
          <ChatProvider>
          <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/authcallback"
            element={
              <RootRoute>
                <AuthCallback />
              </RootRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Outlet />
                </MainLayout>
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/api-keys" element={<APIKeys />} />
            <Route path="/server-stats" element={<ServerStats />} />
          </Route>
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
          </ChatProvider>
        </APIKeyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
