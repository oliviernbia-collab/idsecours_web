import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/app.css";
import "./styles/extra.css";
import { AppProvider } from "./app/store.jsx";
import Shell from "./app/Shell.jsx";
import AlertPage from "./app/AlertPage.jsx";
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));
const CourierApp = lazy(() => import("./app/CourierApp.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<div className="loading"><div className="spinner" /></div>}><AdminApp /></Suspense>} />
        <Route path="/livreur" element={<Suspense fallback={null}><CourierApp /></Suspense>} />
        <Route path="/alerte/:token" element={<AppProvider><AlertPage /></AppProvider>} />
        <Route path="*" element={<AppProvider><Shell /></AppProvider>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
