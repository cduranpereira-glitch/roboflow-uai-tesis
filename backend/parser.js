// Convierte la respuesta cruda del workflow de Roboflow en un resumen de negocio.
//
// No sabemos de antemano los nombres exactos de las salidas del workflow, así
// que buscamos de forma defensiva cualquier lista de detecciones y cualquier
// imagen anotada. Cuando corramos una foto real afinamos esto a los nombres
// reales de tu workflow.

function esDeteccion(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    (("class" in obj) || ("class_name" in obj)) &&
    "confidence" in obj
  );
}

// Busca recursivamente todas las detecciones dentro de la respuesta.
// La respuesta real del workflow anida las detecciones en:
//   salida.predictions.predictions = [ {class, confidence, x, y, ...}, ... ]
// así que recorremos TODO el árbol y recogemos cualquier objeto que parezca
// una detección.
function buscarDetecciones(valor, acum = []) {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      if (esDeteccion(item)) acum.push(item);
      else buscarDetecciones(item, acum);
    }
  } else if (valor && typeof valor === "object") {
    for (const k of Object.keys(valor)) {
      buscarDetecciones(valor[k], acum);
    }
  }
  return acum;
}

// Describe dónde está la detección a partir de su bounding box (si existe).
function ubicacion(d) {
  if (d.x == null || d.y == null) return null;
  // Roboflow entrega x,y como centro del box. No conocemos el tamaño de la
  // imagen aquí, así que damos una descripción relativa aproximada basada en el
  // propio box cuando es posible; si no, solo coordenadas.
  return {
    x: Math.round(d.x),
    y: Math.round(d.y),
    ancho: d.width != null ? Math.round(d.width) : null,
    alto: d.height != null ? Math.round(d.height) : null,
  };
}

// Busca una imagen anotada (base64) dentro de la respuesta.
function buscarImagenAnotada(valor) {
  if (!valor || typeof valor !== "object") return null;
  for (const k of Object.keys(valor)) {
    const v = valor[k];
    if (v && typeof v === "object" && typeof v.value === "string" && v.type === "base64") {
      return v.value;
    }
    if (typeof v === "object") {
      const anidado = buscarImagenAnotada(v);
      if (anidado) return anidado;
    }
  }
  return null;
}

export function resumirNegocio(salida) {
  const detecciones = buscarDetecciones(salida);

  const items = detecciones.map((d) => ({
    tipoDano: d.class ?? d.class_name ?? "desconocido",
    confianza: typeof d.confidence === "number" ? d.confidence : null,
    ubicacion: ubicacion(d),
  }));

  // Agrupa por tipo de daño para el resumen.
  const porTipo = {};
  for (const it of items) {
    porTipo[it.tipoDano] = (porTipo[it.tipoDano] || 0) + 1;
  }

  return {
    dañada: items.length > 0,
    cantidadDanos: items.length,
    tiposDeDano: Object.keys(porTipo),
    resumenPorTipo: porTipo,
    detalles: items,
    imagenAnotadaBase64: buscarImagenAnotada(salida),
    // Guardamos las claves de salida para poder afinar el parser después.
    clavesSalida: salida && typeof salida === "object" ? Object.keys(salida) : [],
  };
}
