import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Loader2 } from "lucide-react";
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Divider,
  Stack,
  CircularProgress,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

const VITE_DEV_TEST_LOGIN = import.meta.env.VITE_DEV_TEST_LOGIN === "true";

function Login() {
  const [loading, setLoading] = useState(false);
  const { testLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = `${import.meta.env.VITE_OAUTH_URL || 'http://localhost:3000'}/auth/google`;
  };

  const handleTestLogin = () => {
    setLoading(true);
    testLogin();
    navigate("/");
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        bgcolor: "white",
      }}
    >
      {/* Left Side: Branding/Visual */}
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          width: "60%",
          background:
            "linear-gradient(to bottom right, #4f46e5, #7e22ce, #312e81)",
          p: 6,
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          color: "white",
        }}
      >
        {/* Abstract background elements */}
        <Box
          sx={{
            position: "absolute",
            top: "-10%",
            left: "-10%",
            width: "40%",
            height: "40%",
            bgcolor: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
            filter: "blur(64px)",
            animation: "pulse 4s infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-10%",
            right: "-10%",
            width: "40%",
            height: "40%",
            bgcolor: "rgba(126,34,206,0.2)",
            borderRadius: "50%",
            filter: "blur(64px)",
            animation: "pulse 4s infinite 2s",
          }}
        />

      </Box>

      {/* Right Side: Login Form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, lg: 6 },
          bgcolor: "#f9fafb",
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={4}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  LLM Gateway
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={
                    loading ? <CircularProgress size={20} /> : <GoogleIcon />
                  }
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "1rem",
                    borderColor: "divider",
                    color: "text.primary",
                    "&:hover": { bgcolor: "#f9fafb", borderColor: "gray" },
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
                        bgcolor: "#fff7ed",
                        color: "#c2410c",
                        "&:hover": { bgcolor: "#ffedd5" },
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
        </Container>
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}

export default Login;
