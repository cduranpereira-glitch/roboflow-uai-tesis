import { useState } from "react";
import { analizarImagen } from "../api.js";
import { useCamara } from "../useCamara.js";
import SeccionTecnica from "../components/SeccionTecnica.jsx";

export default function Analizar() {
  const cam = useCamara();
  const [foto, setFoto] = useState(null); // data URL de la foto capturada
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);

  function capturarDesdeCamara() {
    const dataUrl = cam.capturar();
    if (!dataUrl) return;
    setFoto(dataUrl);
    cam.detener();
    setResultado(null);
  }

  function subirArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      setFoto(lector.result);
      setResultado(null);
      cam.setError(null);
    };
    lector.readAsDataURL(archivo);
  }

  function repetir() {
    setFoto(null);
    setResultado(null);
    cam.setError(null);
  }

  async function analizar() {
    if (!foto) return;
    setCargando(true);
    cam.setError(null);
    try {
      const datos = await analizarImagen(foto);
      setResultado(datos);
    } catch (e) {
      cam.setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="analizar">
      <h2 className="pagina-titulo">Análisis Rápido</h2>

      {/* Zona de cámara / foto */}
      {!foto && (
        <div className="camara-zona">
          {cam.activa ? (
            <>
              <video
                ref={cam.videoRef}
                className="camara-video"
                playsInline
                muted
              />
              <button className="boton-primario" onClick={capturarDesdeCamara}>
                📸 Capturar
              </button>
              <button className="boton-secundario" onClick={cam.detener}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <div className="camara-placeholder">
                <span>📷</span>
                <p>Toma una foto de la pieza a analizar</p>
              </div>
              <button className="boton-primario" onClick={cam.iniciar}>
                Abrir cámara
              </button>
              <label className="boton-secundario boton-archivo">
                Subir foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={subirArchivo}
                  hidden
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* Vista previa de la foto capturada */}
      {foto && !resultado && (
        <div className="preview-zona">
          <img src={foto} alt="Foto capturada" className="preview-img" />
          <button
            className="boton-primario"
            onClick={analizar}
            disabled={cargando}
          >
            {cargando ? "Analizando…" : "🔎 Analizar"}
          </button>
          <button
            className="boton-secundario"
            onClick={repetir}
            disabled={cargando}
          >
            Tomar otra
          </button>
        </div>
      )}

      {cam.error && <div className="mensaje-error">{cam.error}</div>}

      {/* Resultado */}
      {resultado && (
        <Resultado datos={resultado} foto={foto} onRepetir={repetir} />
      )}

      <canvas ref={cam.canvasRef} hidden />
    </div>
  );
}

function Resultado({ datos, foto, onRepetir }) {
  const { negocio, tecnico, archivo } = datos;
  const anotada = negocio.imagenAnotadaBase64;

  return (
    <div className="resultado">
      <img
        src={anotada ? `data:image/jpeg;base64,${anotada}` : foto}
        alt="Resultado del análisis"
        className="preview-img"
      />

      {/* SECCIÓN 1: NEGOCIO */}
      <section className="seccion">
        <h3 className="seccion-titulo">Resultado del análisis</h3>
        <div className={`badge ${negocio.dañada ? "badge-dano" : "badge-ok"}`}>
          {negocio.dañada ? "⚠️ Pieza dañada" : "✅ Sin daños detectados"}
        </div>

        {negocio.dañada && negocio.sinClasificacion && (
          <p className="dato aviso-sin-clase">
            Se detectó daño, pero <strong>sin un tipo de clasificación</strong>{" "}
            identificado.
          </p>
        )}

        {negocio.dañada && !negocio.sinClasificacion && (
          <>
            <p className="dato">
              <strong>Cantidad de daños:</strong> {negocio.cantidadDanos}
            </p>
            <p className="dato">
              <strong>Tipos de daño:</strong>{" "}
              {negocio.tiposDeDano.join(", ") || "—"}
            </p>
            <ul className="lista-detecciones">
              {negocio.detalles.map((d, i) => (
                <li key={i}>
                  <strong>{d.tipoDano}</strong>
                  {d.confianza != null && (
                    <> — confianza {(d.confianza * 100).toFixed(1)}%</>
                  )}
                  {d.ubicacion && (
                    <span className="ubic">
                      {" "}
                      · ubicación aprox. (x:{d.ubicacion.x}, y:{d.ubicacion.y})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* SECCIÓN 2: TÉCNICO */}
      <SeccionTecnica tecnico={tecnico} />

      <p className="guardado-ok">💾 Guardado en el historial como {archivo}</p>
      <button className="boton-secundario" onClick={onRepetir}>
        Analizar otra pieza
      </button>
    </div>
  );
}
