import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export function HomePage() {
  return (
    <Box sx={{ p: 6, maxWidth: 720 }}>
      <Typography variant="h2" sx={{ mb: 2, fontWeight: 700 }}>
        Roborean
      </Typography>
      <Typography variant="h6" sx={{ mb: 3, color: "text.secondary" }}>
        Schema-first projects, workspace bits, and document generation.
      </Typography>
      <Button component={RouterLink} to="/projects" variant="contained">
        Open projects
      </Button>
    </Box>
  );
}
