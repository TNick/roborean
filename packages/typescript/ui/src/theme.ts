import { createTheme } from "@mui/material/styles";

export const roboreanTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0b4f6c" },
    secondary: { main: "#145c9e" },
    background: { default: "#f4f7fb", paper: "#ffffff" },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  },
});
