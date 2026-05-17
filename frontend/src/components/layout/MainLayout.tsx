import React, { useState, useCallback, useRef } from "react";
import { Box, useMediaQuery } from "@mui/material";
import DrawerNavigation from "./DrawerNavigation";
import theme from "../../theme";
import { DashboardMetricsProvider } from "../../context/DashboardMetricsContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mainMargin, setMainMargin] = useState("0px");
  const [firstRender, setFirstRender] = useState<boolean>(true);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleMarginChange = useCallback((margin: string) => {
    setMainMargin(margin);
  }, []);

  if (firstRender) {
    setTimeout(() => {
      setFirstRender(false);
    }, 100);
  }
  return (
    <DashboardMetricsProvider>
      <>
      <DrawerNavigation onMarginChange={handleMarginChange} />
      <Box
        component="main"
        sx={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: "auto",
          display: "flex",
          flexGrow: 1,
          p: isMobile ? 1 : 3,
          ml: mainMargin,
          transition: firstRender ? "" : "margin-left 0.2s ease",
        }}
        id="main-content"
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            display: "flex",
            flexGrow: 1,
            flexDirection: "column",
          }}
          id="content-centered-wrapper"
        >
          {children}
        </Box>
      </Box>
      </>
    </DashboardMetricsProvider>
  );
};

export default MainLayout;
