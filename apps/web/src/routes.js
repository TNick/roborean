import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { ProjectEditPage } from "./pages/ProjectEditPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { RunDetailPage } from "./pages/RunDetailPage.js";
import { TemplatesLibraryPage } from "./pages/TemplatesLibraryPage.js";
/**
 * Application routes using a hash router for static hosting.
 *
 * @returns Router element.
 */
export function AppRoutes() {
  return _jsx(HashRouter, {
    children: _jsxs(Routes, {
      children: [
        _jsx(Route, { path: "/", element: _jsx(HomePage, {}) }),
        _jsx(Route, { path: "/projects", element: _jsx(ProjectListPage, {}) }),
        _jsx(Route, {
          path: "/projects/:id",
          element: _jsx(ProjectEditPage, {}),
        }),
        _jsx(Route, { path: "/runs/:runId", element: _jsx(RunDetailPage, {}) }),
        _jsx(Route, {
          path: "/templates",
          element: _jsx(TemplatesLibraryPage, {}),
        }),
      ],
    }),
  });
}
