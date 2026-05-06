import { Box, SxProps, Theme } from "@mui/material";
import styles from "./ChatDots.module.css";

interface ChatDotsProps {
  size?: string;
  gap?: string;
  mt?: number;
  sx?: SxProps<Theme>;
}

const ChatDots: React.FC<ChatDotsProps> = ({
  size = "6px",
  gap = "4px",
  mt,
  sx,
}) => {
  return (
    <Box className={styles.dotsContainer} sx={{ ...sx }}>
      {[1, 2, 3].map((x, i) => {
        return (
          <Box
            key={i}
            className={styles.dot}
            mr={gap}
            sx={{ "--size": `${size}`, "--mt": mt ?? 0 }}
          />
        );
      })}
    </Box>
  );
};

export default ChatDots;
