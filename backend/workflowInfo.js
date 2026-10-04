// Lee de forma DINÁMICA el modelo con el que el workflow evalúa las imágenes.
// En vez de escribir el nombre del modelo a mano, lo obtenemos de la definición
// del workflow en Roboflow. Así, si cambias el modelo en el workflow, la app lo
// refleja sin tocar el código.
//
// Se cachea un rato para no pedir la definición en cada análisis.

import { ROBOFLOW } from "./config/modelo.js";

const TTL_MS = 5 * 60 * 1000; // refresca a lo más cada 5 minutos
let cache = { info: null, ts: 0 };

// Convierte un model_id de Roboflow en algo más legible.
// Ej: "capstone-mia/deteccion-...-7-yolo12s-t5" -> { arquitectura, version }
function interpretar(modeloId) {
  if (!modeloId) return {};
  const slug = modeloId.includes("/") ? modeloId.split("/").pop() : modeloId;
  const arqMatch = slug.match(/(yolo\w+|rfdetr[\w-]*|rtdetr[\w-]*)/i);
  const verMatch = slug.match(/-(\d+)-(?:yolo|rfdetr|rtdetr)/i);
  return {
    arquitectura: arqMatch ? arqMatch[1] : null,
    version: verMatch ? verMatch[1] : null,
  };
}

// Busca un model_id literal (no una referencia tipo "$inputs...") dentro de los
// steps del workflow.
function buscarModeloId(steps = []) {
  for (const s of steps) {
    const candidatos = [s.model_id, s.parameter_bindings?.model_id];
    for (const c of candidatos) {
      if (typeof c === "string" && c.length && !c.startsWith("$")) return c;
    }
  }
  return null;
}

export async function obtenerInfoModelo() {
  const ahora = Date.now();
  if (cache.info && ahora - cache.ts < TTL_MS) return cache.info;

  const info = {
    modeloId: null,
    arquitectura: null,
    version: null,
    fuente: "no disponible",
  };

  const key = process.env.ROBOFLOW_API_KEY;
  if (key) {
    try {
      const url = `https://api.roboflow.com/${ROBOFLOW.workspace}/workflows/${ROBOFLOW.workflowId}?api_key=${key}`;
      const r = await fetch(url);
      if (r.ok) {
        const cfg = JSON.parse((await r.json()).workflow.config);
        const modeloId = buscarModeloId(cfg?.specification?.steps);
        if (modeloId) {
          Object.assign(info, { modeloId, ...interpretar(modeloId), fuente: "Roboflow" });
        }
      }
    } catch {
      // Si falla, devolvemos info vacía; el front muestra el fallback.
    }
  }

  cache = { info, ts: ahora };
  return info;
}
