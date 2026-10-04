import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Analizar from "./pages/Analizar.jsx";
import Historial from "./pages/Historial.jsx";

export default function App() {
  const location = useLocation();
  const enHome = location.pathname === "/";

  return (
    <div className="app">
      <header className="barra">
        {!enHome && (
          <Link to="/" className="volver" aria-label="Volver al inicio">
            ← Inicio
          </Link>
        )}
        <span className="titulo-barra">Detección de Daños</span>
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analizar" element={<Analizar />} />
          <Route path="/historial" element={<Historial />} />
        </Routes>
      </main>
      <footer className="pie">Tesis UAI · Repuestos automotrices</footer>
    </div>
  );
}
