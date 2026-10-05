import { useEffect, useRef, useState } from "react";
import { analizarImagen } from "../api.js";

export default function Analizar() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [foto, setFoto] = useState(null); // data URL de la foto capturada
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Enciende la cámara trasera (ideal para fotografiar la pieza).
  async function iniciarCamara() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
    } catch (e) {
      setError(
        "No se pudo abrir la cámara. Puedes usar el botón 'Subir foto' más abajo. " +
          "(En el celular la cámara solo funciona con HTTPS.)"
      );
    }
  }

  function detenerCamara() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamaraActiva(false);
  }

  // Limpia la cámara al salir de la pantalla.
  useEffect(() => detenerCamara, []);

  function capturarDesdeCamara() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFoto(dataUrl);
    detenerCamara();
    setResultado(null);
    setError(null);
  }

  function subirArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      setFoto(lector.result);
      setResultado(null);
      setError(null);
    };
    lector.readAsDataURL(archivo);
  }

  function repetir() {
    setFoto(null);
    setResultado(null);
    setError(null);
  }

  async function analizar() {
    if (!foto) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await analizarImagen(foto);
      setResultado(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="analizar">
      <h2 className="pagina-titulo">Analizar pieza</h2>

      {/* Zona de cámara / foto */}
      {!foto && (
        <div className="camara-zona">
          {camaraActiva ? (
            <>
              <video ref={videoRef} className="camara-video" playsInline muted />
              <button className="boton-primario" onClick={capturarDesdeCamara}>
                📸 Capturar
              </button>
              <button className="boton-secundario" onClick={detenerCamara}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <div className="camara-placeholder">
                <span>📷</span>
                <p>Toma una foto de la pieza a analizar</p>
              </div>
              <button className="boton-primario" onClick={iniciarCamara}>
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

      {error && <div className="mensaje-error">{error}</div>}

      {/* Resultado */}
      {resultado && (
        <Resultado datos={resultado} foto={foto} onRepetir={repetir} />
      )}

      <canvas ref={canvasRef} hidden />
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
      <section className="seccion seccion-tecnica">
        <h3 className="seccion-titulo">Resultado técnico (modelo ML)</h3>
        <p className="dato">
          <strong>Modelo con el que se evaluó:</strong>
          <br />
          <code className="modelo-id">
            {tecnico.modelo?.modeloId || `${tecnico.nombreModelo} (v${tecnico.version})`}
          </code>
          {tecnico.modelo?.arquitectura && (
            <span className="modelo-meta">
              {" "}
              · {tecnico.modelo.arquitectura}
              {tecnico.modelo.version ? ` · v${tecnico.modelo.version}` : ""}
            </span>
          )}
        </p>
        <div className="metricas-grid metricas-grid-4">
          <Metrica etiqueta="mAP@50" valor={tecnico.mAP} />
          <Metrica etiqueta="Precision" valor={tecnico.precision} />
          <Metrica etiqueta="Recall" valor={tecnico.recall} />
          <Metrica etiqueta="F1" valor={tecnico.f1} />
        </div>
        <p className="nota-tecnica">
          Las métricas del modelo son fijas: corresponden a la evaluación del
          modelo entrenado en Roboflow, no a esta fotografía en particular.
        </p>
      </section>

      <p className="guardado-ok">💾 Guardado en el historial como {archivo}</p>
      <button className="boton-secundario" onClick={onRepetir}>
        Analizar otra pieza
      </button>
    </div>
  );
}

function Metrica({ etiqueta, valor }) {
  return (
    <div className="metrica">
      <span className="metrica-valor">{valor == null ? "—" : `${valor}%`}</span>
      <span className="metrica-etiqueta">{etiqueta}</span>
    </div>
  );
}
