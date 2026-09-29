import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./styles/tokens.css";
import Dossier from "./pages/Dossier";
import Dossiers from "./pages/Dossiers";
import Intake from "./pages/Intake";
import Landing from "./pages/Landing";
import Shell from "./pages/Shell";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/intake"
          element={
            <Shell>
              <Intake />
            </Shell>
          }
        />
        <Route
          path="/dossiers"
          element={
            <Shell>
              <Dossiers />
            </Shell>
          }
        />
        <Route
          path="/dossiers/:versionId"
          element={
            <Shell>
              <Dossier />
            </Shell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
