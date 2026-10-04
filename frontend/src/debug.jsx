import { createContext, useContext, useState, useCallback } from "react";

// Store simple para el panel de debug: junta las entradas de cada análisis.
const DebugCtx = createContext(null);

export function DebugProvider({ children }) {
  const [entradas, setEntradas] = useState([]);

  const agregar = useCallback((entrada) => {
    setEntradas((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          hora: new Date().toLocaleTimeString("es-CL"),
          ...entrada,
        },
        ...prev,
      ].slice(0, 50)
    );
  }, []);

  const limpiar = useCallback(() => setEntradas([]), []);

  return (
    <DebugCtx.Provider value={{ entradas, agregar, limpiar }}>
      {children}
    </DebugCtx.Provider>
  );
}

export function useDebug() {
  return (
    useContext(DebugCtx) || { entradas: [], agregar: () => {}, limpiar: () => {} }
  );
}

// Bloque colapsable con JSON.
function Bloque({ titulo, data, abierto = false }) {
  const [open, setOpen] = useState(abierto);
  const texto = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="dbg-bloque">
      <button className="dbg-bloque-head" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} {titulo}
      </button>
      {open && <pre className="dbg-json">{texto}</pre>}
    </div>
  );
}

export function DebugPanel() {
  const { entradas, limpiar } = useDebug();

  return (
    <aside className="debug-panel">
      <div className="debug-head">
        <span className="debug-titulo">🐞 Debug · Roboflow</span>
        <button className="debug-limpiar" onClick={limpiar}>
          Limpiar
        </button>
      </div>
      <p className="debug-sub">
        Todo lo que entra y sale del workflow ({entradas.length})
      </p>

      {entradas.length === 0 && (
        <p className="debug-vacio">
          Aún no hay análisis. Analiza una imagen y aquí verás el request y la
          respuesta cruda de Roboflow.
        </p>
      )}

      {entradas.map((e) => (
        <div key={e.id} className={`dbg-entrada ${e.tipo}`}>
          <div className="dbg-entrada-head">
            <span className={`dbg-badge ${e.tipo}`}>
              {e.tipo === "error"
                ? "ERROR"
                : `HTTP ${e.debug?.salida?.httpStatus ?? "?"}`}
            </span>
            <span className="dbg-hora">{e.hora}</span>
            {e.debug?.salida?.duracionMs != null && (
              <span className="dbg-ms">{e.debug.salida.duracionMs} ms</span>
            )}
          </div>

          {e.tipo === "error" ? (
            <Bloque titulo="Mensaje de error" data={e.error} abierto />
          ) : e.debug ? (
            <>
              <div className="dbg-resumen">
                {e.debug.parseado?.dañada
                  ? `⚠️ ${e.debug.parseado.cantidadDanos} daño(s): ${e.debug.parseado.tiposDeDano.join(
                      ", "
                    )}`
                  : "✅ 0 detecciones"}
              </div>
              <Bloque titulo="➡️ Entrada (request al workflow)" data={e.debug.entrada} />
              <Bloque
                titulo="⬅️ Respuesta CRUDA de Roboflow"
                data={e.debug.salida?.respuestaCompleta}
                abierto
              />
              <Bloque titulo="🔎 Parseado por el backend" data={e.debug.parseado} />
            </>
          ) : (
            <p className="debug-vacio">
              El backend no envió debug (revisa que DEBUG esté en true en
              backend/config/debug.js).
            </p>
          )}
        </div>
      ))}
    </aside>
  );
}
