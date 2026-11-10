import { useEffect, useState } from "react";
import { analizarProfundo, obtenerConfig } from "../api.js";
import { useCamara } from "../useCamara.js";
import SeccionTecnica from "../components/SeccionTecnica.jsx";

export default function AnalisisProfundo() {
  const cam = useCamara();
  const [numFotos, setNumFotos] = useState(4);
  const [fotos, setFotos] = useState([]); // data URLs (en memoria, no se guardan)
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Nº de fotos lo define el backend (configurable).
  useEffect(() => {
    obtenerConfig()
      .then((c) => c?.analisisProfundo?.numFotos && setNumFotos(c.analisisProfundo.numFotos))
      .catch(() => {});
  }, []);

  const completo = fotos.length >= numFotos;

  function capturar() {
    const d = cam.capturar();
    if (!d) return;
    setFotos((prev) => (prev.length < numFotos ? [...prev, d] : prev));
    cam.detener();
  }

  function subir(e) {
    const files = Array.from(e.target.files || []);
    const faltan = numFotos - fotos.length;
    files.slice(0, faltan).forEach((f) => {
      const r = new FileReader();
      r.onload = () =>
        setFotos((prev) => (prev.length < numFotos ? [...prev, r.result] : prev));
      r.readAsDataURL(f);
    });
    e.target.value = ""; // permite volver a elegir las mismas
    cam.setError(null);
  }

  function quitar(i) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function reiniciar() {
    setFotos([]);
    setResultado(null);
    cam.setError(null);
  }

  async function analizar() {
    if (!completo) return;
    setCargando(true);
    cam.setError(null);
    try {
      const datos = await analizarProfundo(fotos);
      setResultado(datos);
    } catch (e) {
      cam.setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  if (resultado) {
    return (
      <ResultadoProfundo
        datos={resultado}
        fotos={fotos}
        onReiniciar={reiniciar}
      />
    );
  }

  return (
    <div className={`profundo ${cam.activa ? "camara-abierta" : ""}`}>
      <h2 className="pagina-titulo">Análisis Profundo</h2>
      <p className="home-sub">
        Toma <strong>{numFotos} fotos</strong> de la pieza desde distintos
        ángulos. Analizamos todas y damos un veredicto más confiable.
      </p>

      {/* Stepper de miniaturas: muestra cuántas fotos llevas */}
      <Miniaturas fotos={fotos} numFotos={numFotos} onQuitar={quitar} />
      <p className="progreso-texto">
        {fotos.length} de {numFotos} fotos
      </p>

      {/* Cámara activa */}
      {cam.activa ? (
        <div className="camara-zona">
          <video ref={cam.videoRef} className="camara-video" playsInline muted />
          <div className="camara-acciones">
            <button className="boton-primario" onClick={capturar}>
              📸 Capturar foto {fotos.length + 1}
            </button>
            <button className="boton-secundario" onClick={cam.detener}>
              Cancelar
            </button>
          </div>
        </div>
      ) : completo ? (
        <>
          <button
            className="boton-primario"
            onClick={analizar}
            disabled={cargando}
          >
            {cargando ? "Analizando las fotos…" : `🔬 Analizar las ${numFotos} fotos`}
          </button>
          <button
            className="boton-secundario"
            onClick={reiniciar}
            disabled={cargando}
          >
            Reiniciar
          </button>
        </>
      ) : (
        <>
          <button className="boton-primario" onClick={cam.iniciar}>
            📷 Tomar foto
          </button>
          <label className="boton-secundario boton-archivo">
            🖼️ Subir de galería
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={subir}
              hidden
            />
          </label>
          {fotos.length > 0 && (
            <button className="boton-secundario" onClick={reiniciar}>
              Reiniciar
            </button>
          )}
        </>
      )}

      {cam.error && <div className="mensaje-error">{cam.error}</div>}

      <canvas ref={cam.canvasRef} hidden />
    </div>
  );
}

// Fila de miniaturas con los slots (llenos o vacíos numerados).
function Miniaturas({ fotos, numFotos, onQuitar }) {
  return (
    <div className="miniaturas">
      {Array.from({ length: numFotos }).map((_, i) => {
        const foto = fotos[i];
        return (
          <div key={i} className={`mini-slot ${foto ? "lleno" : "vacio"}`}>
            {foto ? (
              <>
                <img src={foto} alt={`Foto ${i + 1}`} />
                <button
                  className="mini-quitar"
                  onClick={() => onQuitar(i)}
                  aria-label={`Quitar foto ${i + 1}`}
                >
                  ×
                </button>
                <span className="mini-check">✓</span>
              </>
            ) : (
              <span className="mini-num">{i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultadoProfundo({ datos, fotos = [], onReiniciar }) {
  const { agregado, tecnico, archivo } = datos;
  const { veredicto, votosConDano, totalFotos, umbralDano, tipos, porFoto } =
    agregado;

  // Foto abierta en el visor: { indice, src, titulo } | null
  const [visor, setVisor] = useState(null);

  // Devuelve la imagen a mostrar para la foto i (1-based): primero la anotada
  // (con el daño marcado) que llegó del backend; si no vino, la original en memoria.
  function imagenDeFoto(f) {
    if (f.imagenAnotadaBase64) {
      return `data:image/jpeg;base64,${f.imagenAnotadaBase64}`;
    }
    return fotos[f.foto - 1] || null;
  }

  const badge =
    veredicto === "dañada"
      ? { clase: "badge-dano", texto: "⚠️ Pieza dañada" }
      : veredicto === "sin_dano"
      ? { clase: "badge-ok", texto: "✅ Sin daños detectados" }
      : { clase: "badge-inconcluso", texto: "🟡 Resultado no concluyente" };

  return (
    <div className="profundo resultado">
      <h2 className="pagina-titulo">Análisis Profundo</h2>

      <section className="seccion">
        <h3 className="seccion-titulo">Veredicto</h3>
        <div className={`badge ${badge.clase}`}>{badge.texto}</div>
        <p className="dato">
          <strong>Votación:</strong> {votosConDano} de {totalFotos} fotos
          detectaron daño{" "}
          <span className="ubic">(umbral para "dañada": {umbralDano}).</span>
        </p>

        {veredicto === "inconcluso" && (
          <p className="dato aviso-sin-clase">
            Muy pocas fotos detectaron daño como para concluir. Repite el proceso
            con {totalFotos} fotos nuevas, cuidando el enfoque y la iluminación.
          </p>
        )}

        {veredicto === "dañada" && tipos.length > 0 && (
          <>
            <p className="dato">
              <strong>Tipos de daño (por votos):</strong>
            </p>
            <ul className="lista-detecciones">
              {tipos.map((t) => (
                <li key={t.tipo}>
                  <strong>{t.tipo}</strong> — en {t.fotos}/{totalFotos} fotos
                  {t.confianzaMedia != null && (
                    <span className="ubic">
                      {" "}
                      · confianza media {(t.confianzaMedia * 100).toFixed(1)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Detalle por foto — toca una para ver la imagen con el resultado */}
        <p className="dato">
          <strong>Detalle por foto:</strong>{" "}
          <span className="ubic">(toca una para ver la imagen)</span>
        </p>
        <ul className="lista-fotos">
          {porFoto.map((f) => {
            const src = imagenDeFoto(f);
            const estado = f.dañada
              ? f.sinClasificacion
                ? "daño (sin clasificación)"
                : `daño — ${f.tipos.join(", ") || "s/d"}`
              : "sin daño";
            return (
              <li key={f.foto} className={f.dañada ? "foto-dano" : "foto-ok"}>
                <button
                  type="button"
                  className="foto-item"
                  onClick={() =>
                    src && setVisor({ src, titulo: `Foto ${f.foto} — ${estado}` })
                  }
                  disabled={!src}
                >
                  {src ? (
                    <img className="foto-miniatura" src={src} alt={`Foto ${f.foto}`} />
                  ) : (
                    <span className="foto-miniatura sin-img">—</span>
                  )}
                  <span className="foto-texto">
                    Foto {f.foto}: {estado}
                  </span>
                  {src && <span className="foto-lupa">🔍</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <SeccionTecnica tecnico={tecnico} />

      <p className="guardado-ok">💾 Guardado en el historial como {archivo}</p>
      <button className="boton-primario" onClick={onReiniciar}>
        Hacer otro análisis profundo
      </button>

      {/* Visor de imagen (se abre al tocar una foto) */}
      {visor && (
        <div className="visor-fondo" onClick={() => setVisor(null)}>
          <div className="visor-caja" onClick={(e) => e.stopPropagation()}>
            <div className="visor-barra">
              <span className="visor-titulo">{visor.titulo}</span>
              <button
                className="visor-cerrar"
                onClick={() => setVisor(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <img className="visor-img" src={visor.src} alt={visor.titulo} />
          </div>
        </div>
      )}
    </div>
  );
}
