import { useEffect, useState } from "react";
import { obtenerHistorial, leerAnalisis } from "../api.js";

// Convierte "analisis_2026-10-04_14-23-05.txt" en algo legible.
function nombreLegible(archivo) {
  const m = archivo.match(/analisis_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (!m) return archivo;
  const [, a, mes, d, h, min, s] = m;
  return `${d}/${mes}/${a} · ${h}:${min}:${s}`;
}

export default function Historial() {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState(null); // { nombre, contenido }

  useEffect(() => {
    obtenerHistorial()
      .then(setArchivos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  async function abrir(nombre) {
    try {
      const contenido = await leerAnalisis(nombre);
      setSeleccion({ nombre, contenido });
    } catch (e) {
      setError(e.message);
    }
  }

  if (seleccion) {
    return (
      <div className="historial-detalle">
        <h2 className="pagina-titulo">{nombreLegible(seleccion.nombre)}</h2>
        <pre className="txt-contenido">{seleccion.contenido}</pre>
        <a
          className="boton-secundario boton-archivo"
          href={`/api/historial/${encodeURIComponent(seleccion.nombre)}`}
          download={seleccion.nombre}
        >
          ⬇️ Descargar .txt
        </a>
        <button className="boton-secundario" onClick={() => setSeleccion(null)}>
          ← Volver al historial
        </button>
      </div>
    );
  }

  return (
    <div className="historial">
      <h2 className="pagina-titulo">Historial de análisis</h2>
      {cargando && <p>Cargando…</p>}
      {error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && archivos.length === 0 && (
        <p className="vacio">Aún no hay análisis guardados.</p>
      )}
      <ul className="lista-historial">
        {archivos.map((archivo) => (
          <li key={archivo}>
            <button className="item-historial" onClick={() => abrir(archivo)}>
              <span className="item-fecha">{nombreLegible(archivo)}</span>
              <span className="item-flecha">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
