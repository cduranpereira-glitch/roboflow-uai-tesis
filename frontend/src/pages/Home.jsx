import { useNavigate } from "react-router-dom";

export default function Home() {
  const navegar = useNavigate();
  return (
    <div className="home">
      <h1 className="home-titulo">Detección de Daños</h1>
      <p className="home-sub">
        Analiza repuestos automotrices (parachoques, puertas, capó y otras
        piezas de lata) y revisa el historial de análisis.
      </p>
      <div className="home-opciones">
        <button className="tarjeta" onClick={() => navegar("/analizar")}>
          <span className="tarjeta-icono">📷</span>
          <span className="tarjeta-titulo">Analizar</span>
          <span className="tarjeta-desc">
            Toma una foto de la pieza y detecta daños
          </span>
        </button>
        <button className="tarjeta" onClick={() => navegar("/historial")}>
          <span className="tarjeta-icono">🗂️</span>
          <span className="tarjeta-titulo">Historial</span>
          <span className="tarjeta-desc">Revisa los análisis anteriores</span>
        </button>
      </div>
    </div>
  );
}
