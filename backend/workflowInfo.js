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

// Lee los parámetros de inferencia (confidence, iou, ...) desde los inputs
// del (sub)workflow, que es donde viven sus valores por defecto.
function leerParametros(steps = [], inputs = []) {
  const params = {};
  for (const inp of inputs) {
    if (inp?.name && "default_value" in inp && inp.type === "WorkflowParameter") {
      params[inp.name] = inp.default_value;
    }
  }
  return params;
}

async function getWorkflowConfig(ws, id, key) {
  const r = await fetch(`https://api.roboflow.com/${ws}/workflows/${id}?api_key=${key}`);
  if (!r.ok) return null;
  return JSON.parse((await r.json()).workflow.config);
}

// Lee las métricas de evaluación (mAP, precision, recall, F1) desde la API de
// la versión del modelo en Roboflow. Estas métricas son del entrenamiento (no
// de cada foto), por eso no vienen en la respuesta del workflow.
// El F1 no lo entrega Roboflow: se calcula a partir de precision y recall.
async function obtenerMetricas(modeloId, key) {
  // modeloId: "capstone-mia/deteccion-...-7-rfdetr-small-t1"
  const [ws, rest] = (modeloId || "").split("/");
  if (!ws || !rest) return null;
  const version = (rest.match(/-(\d+)-(?:yolo|rfdetr|rtdetr)/i) || [])[1];
  if (!version) return null;
  const proyecto = rest.split(`-${version}-`)[0];
  try {
    const r = await fetch(
      `https://api.roboflow.com/${ws}/${proyecto}/${version}?api_key=${key}`
    );
    if (!r.ok) return null;
    const m = (await r.json())?.version?.model || {};
    const mAP = m.map != null ? parseFloat(m.map) : null;
    const precision = m.precision != null ? parseFloat(m.precision) : null;
    const recall = m.recall != null ? parseFloat(m.recall) : null;
    const f1 =
      precision && recall
        ? +((2 * precision * recall) / (precision + recall)).toFixed(2)
        : null;
    if (mAP == null && precision == null && recall == null) return null;
    return {
      mAP,
      precision,
      recall,
      f1,
      f1Calculado: true, // F1 no lo da Roboflow; lo calculamos de P y R
      proyecto,
      version,
      fuente: `Roboflow · versión ${version} (modelo desplegado)`,
    };
  } catch {
    return null;
  }
}

export async function obtenerInfoModelo() {
  const ahora = Date.now();
  if (cache.info && ahora - cache.ts < TTL_MS) return cache.info;

  const info = {
    modeloId: null,
    arquitectura: null,
    version: null,
    parametros: null, // confidence, iou, max_detections, ...
    metricas: null, // mAP, precision, recall, F1 (dinámicas desde Roboflow)
    fuente: "no disponible",
  };

  const key = process.env.ROBOFLOW_API_KEY;
  if (key) {
    try {
      const cfg = await getWorkflowConfig(ROBOFLOW.workspace, ROBOFLOW.workflowId, key);
      if (cfg) {
        const steps = cfg?.specification?.steps || [];
        const modeloId = buscarModeloId(steps);
        if (modeloId) {
          Object.assign(info, { modeloId, ...interpretar(modeloId), fuente: "Roboflow" });
        }
        // Parámetros: pueden estar en este workflow o en un sub-workflow interno.
        let params = leerParametros(steps, cfg?.specification?.inputs);
        const interno = steps.find((s) => s.workflow_id);
        if (interno?.workflow_id) {
          const cfgInt = await getWorkflowConfig(ROBOFLOW.workspace, interno.workflow_id, key);
          if (cfgInt) {
            params = { ...leerParametros([], cfgInt?.specification?.inputs), ...params };
            if (!info.modeloId) {
              const idInt = buscarModeloId(cfgInt?.specification?.steps);
              if (idInt) Object.assign(info, { modeloId: idInt, ...interpretar(idInt), fuente: "Roboflow" });
            }
          }
        }
        if (Object.keys(params).length) info.parametros = params;

        // Si no encontramos un model_id literal en los steps, usamos el que
        // viene como parámetro por defecto (así captamos la nueva estructura
        // del workflow, donde el modelo se define como default de un input).
        if (!info.modeloId && typeof params.model_id === "string" && !params.model_id.startsWith("$")) {
          Object.assign(info, {
            modeloId: params.model_id,
            ...interpretar(params.model_id),
            fuente: "Roboflow (default del workflow)",
          });
        }

        // Métricas de evaluación del modelo (dinámicas desde la API de la versión)
        if (info.modeloId) {
          info.metricas = await obtenerMetricas(info.modeloId, key);
        }
      }
    } catch {
      // Si falla, devolvemos info vacía; el front muestra el fallback.
    }
  }

  cache = { info, ts: ahora };
  return info;
}
