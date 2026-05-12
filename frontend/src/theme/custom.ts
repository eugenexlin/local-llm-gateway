import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      ui: {
        hoverBg: string;
        activeBg: string;
        activeColor: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        borderColor: string;
        editBg: string;
        deleteColor: string;
        deleteHoverBg: string;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      ui?: {
        hoverBg?: string;
        activeBg?: string;
        activeColor?: string;
        textPrimary?: string;
        textSecondary?: string;
        textMuted?: string;
        borderColor?: string;
        editBg?: string;
        deleteColor?: string;
        deleteHoverBg?: string;
      };
    };
  }
}
