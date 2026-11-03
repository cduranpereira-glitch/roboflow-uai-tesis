import { useEffect, useRef, useState } from "react";

// Mensaje de error legible según el tipo de fallo de getUserMedia.
function mensajeError(e) {
  if (e.name === "NotAllowedError" || e.name === "SecurityError")
    return "Permiso de cámara denegado. Habilítalo en el candado de la barra de direcciones (Configuración del sitio → Cámara) y reintenta.";
  if (e.name === "NotFoundError" || e.name === "OverconstrainedError")
    return "No se encontró ninguna cámara disponible.";
  if (e.name === "NotReadableError")
    return "La cámara está siendo usada por otra app (Zoom, Meet, Photo Booth…). Ciérrala y reintenta.";
  return "No se pudo abrir la cámara.";
}

// Hook de cámara reutilizable (usado por Análisis Rápido y Profundo).
// Arregla el bug de orden: el <video> se monta (activa=true) antes de conectar
// el stream, que se conecta en un efecto cuando el elemento ya existe.
export function useCamara() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState(null);

  async function iniciar() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Tu navegador no permite abrir la cámara aquí (se necesita HTTPS o localhost). Usa 'Subir foto'."
      );
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setActiva(true);
      return true;
    } catch (e) {
      setError(`${mensajeError(e)} También puedes usar 'Subir foto'.`);
      return false;
    }
  }

  // Conecta el stream al <video> una vez montado.
  useEffect(() => {
    if (activa && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [activa]);

  function detener() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActiva(false);
  }

  // Limpia la cámara al desmontar.
  useEffect(() => detener, []);

  // Captura un fotograma y devuelve su data URL (o null si aún no está listo).
  function capturar() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (!video.videoWidth || !video.videoHeight) {
      setError("La cámara aún se está iniciando, espera un segundo y reintenta.");
      return null;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  return { videoRef, canvasRef, activa, error, setError, iniciar, detener, capturar };
}
