import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { roboreanTheme } from "@roborean/ui";
import { AppRoutes } from "./routes.js";

export function App() {
  return (
    <ThemeProvider theme={roboreanTheme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  );
}
