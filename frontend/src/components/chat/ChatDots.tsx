import { Box, SxProps, Theme } from "@mui/material";
import styles from "./ChatDots.module.css";

interface ChatDotsProps {
  size?: number;
  mt?: number;
  sx?: SxProps<Theme>;
}

const ChatDots: React.FC<ChatDotsProps> = ({ size = 8, mt, sx }) => {
  return (
    <Box className={styles.dotsContainer} sx={{ ...sx }}>
      <Box className={styles.dot} sx={{ "--size": `${size}px`, "--mt": mt ?? 0, ...sx }} />
      <Box className={styles.dot} sx={{ "--size": `${size}px`, "--mt": mt ?? 0 }} />
      <Box className={styles.dot} sx={{ "--size": `${size}px`, "--mt": mt ?? 0 }} />
    </Box>
  );
};

export default ChatDots;
