// Pequeña capa para hablar con el backend.

export async function analizarImagen(imagenBase64) {
  const resp = await fetch("/api/analizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenBase64 }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Error ${resp.status} al analizar la imagen`);
  }
  return resp.json();
}

export async function obtenerHistorial() {
  const resp = await fetch("/api/historial");
  if (!resp.ok) throw new Error("No se pudo cargar el historial");
  const datos = await resp.json();
  return datos.archivos || [];
}

export async function leerAnalisis(nombre) {
  const resp = await fetch(`/api/historial/${encodeURIComponent(nombre)}`);
  if (!resp.ok) throw new Error("No se pudo leer el análisis");
  return resp.text();
}
