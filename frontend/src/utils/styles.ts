import { keyframes } from "@mui/material/styles";

export const sharedFabStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1100,
};
export const sharedGlassStyle: React.CSSProperties = {
  boxShadow: "1px 1px 3px rgba(0,0,0,.1), -1px -1px 3px rgba(255,255,255,.5)",
  background: "transparent",
  backdropFilter: "blur(6px)",
};

export const highlightPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.6);
  }
  50% {
    box-shadow: 0 0 12px 4px rgba(139, 92, 246, 0.35);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
  }
`;
