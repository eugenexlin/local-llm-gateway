import { Box, Typography, useMediaQuery } from "@mui/material";
import DashboardStats from "../components/DashboardStats";
import theme from "../theme";

function Dashboard() {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <Box sx={{ textAlign: isMobile ? "center" : "start", paddingBottom: "16px" }}>
        <Typography variant="h5">Usage Stats</Typography>
      </Box>
      <DashboardStats />;
    </>
  );
}

export default Dashboard;
