import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export { roboreanTheme } from "./theme.js";
export {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
};

export type PanelProps = {
  title: string;
  children: ReactNode;
};

/** Titled section chrome for editor panels. */
export function Panel({ title, children }: PanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export type DiagnosticItem = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type DiagnosticListProps = {
  items: DiagnosticItem[];
  onSelectPath?: (path: string) => void;
};

/** Render diagnostics with optional jump-to-path. */
export function DiagnosticList({ items, onSelectPath }: DiagnosticListProps) {
  return (
    <Stack spacing={1}>
      {items.map((item, index) => (
        <Alert
          key={`${item.code}-${index}`}
          severity={item.severity}
          onClick={() => item.path && onSelectPath?.(item.path)}
          sx={{ cursor: item.path ? "pointer" : "default" }}
        >
          <Typography variant="body2">
            {item.code}: {item.message}
          </Typography>
        </Alert>
      ))}
    </Stack>
  );
}

export type SplitPaneProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

/** Three-column editor layout. */
export function SplitPane({ left, center, right }: SplitPaneProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 320px",
        gap: 2,
        minHeight: "70vh",
      }}
    >
      <Box>{left}</Box>
      <Box>{center}</Box>
      <Box>{right}</Box>
    </Box>
  );
}
