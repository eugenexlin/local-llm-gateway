import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User } from "lucide-react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Divider,
  Stack,
  CircularProgress,
  useTheme,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

const VITE_DEV_TEST_LOGIN = import.meta.env.VITE_DEV_TEST_LOGIN === "true";

function Login() {
  const [loading, setLoading] = useState(false);
  const { testLogin } = useAuth();
  const navigate = useNavigate();
  const { palette } = useTheme();
  const isDark = palette.mode === 'dark';

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = '/auth/google';
  };

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      await testLogin();
      navigate("/");
    } catch (error) {
      console.error('Test login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          maxWidth: 420,
          width: "100%",
        }}
      >
        <Stack spacing={4}>
          <Box sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 1 }}>
              <svg width="32" height="32" viewBox="-2 -2 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#BB22ff" />
                    <stop offset="100%" stopColor="#1166ff" />
                  </linearGradient>
                </defs>
                <path
                  d="M 16,-2.2 L 31.75,6.9 L 31.75,25.1 L 16,34.2 L 0.25,25.1 L 0.25,6.9 Z
                     M 16,3 L 4.74,9.5 L 4.74,22.5 L 16,29 L 27.26,22.5 L 27.26,9.5 Z"
                  fill="url(#purpleGrad)"
                  fillOpacity="0.7"
                  fillRule="evenodd"
                />
                <polygon
                  points="16,6 24.66,11 24.66,21 16,26 7.34,21 7.34,11"
                  fill="url(#purpleGrad)"
                  fillOpacity="1"
                />
              </svg>
              <Typography variant="h5" fontWeight="bold" sx={{ color: "text.primary" }}>
                LLM Gateway
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Sign in to continue
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading}
              sx={{
                py: 1.5,
                textTransform: "none",
                fontSize: "1rem",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
              }}
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </Button>

            {VITE_DEV_TEST_LOGIN && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    or
                  </Typography>
                </Divider>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <User size={20} />
                    )
                  }
                  onClick={handleTestLogin}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "1rem",
                    bgcolor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fff7ed',
                    color: isDark ? '#fbbf24' : '#c2410c',
                    "&:hover": { bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#ffedd5' },
                    boxShadow: "none",
                  }}
                >
                  {loading ? "Testing..." : "Dev: Test Account"}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

export default Login;
