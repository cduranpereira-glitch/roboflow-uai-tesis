// Cliente del workflow de Roboflow.
// Una sola función bien definida, con timeout y reintentos con backoff.

import { ROBOFLOW } from "./config/modelo.js";

const TIMEOUT_MS = 30000; // 30s por intento
const MAX_REINTENTOS = 2; // 1 intento + 2 reintentos

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Corre el workflow de Roboflow sobre una imagen en base64.
 * @param {string} imagenBase64 - base64 SIN el prefijo "data:image/...;base64,"
 * @returns {Promise<object>} el primer resultado del workflow (dict con las salidas)
 */
export async function correrWorkflow(imagenBase64) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "Falta la variable de entorno ROBOFLOW_API_KEY. Revisa el archivo backend/.env"
    );
    err.tipo = "config";
    throw err;
  }

  const url = `${ROBOFLOW.apiUrl}/${ROBOFLOW.workspace}/workflows/${ROBOFLOW.workflowId}`;
  const cuerpo = JSON.stringify({
    api_key: apiKey,
    inputs: {
      image: { type: "base64", value: imagenBase64 },
    },
  });

  let ultimoError;
  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        signal: controlador.signal,
      });
      clearTimeout(temporizador);

      if (!resp.ok) {
        const texto = await resp.text().catch(() => "");
        const err = new Error(
          `Roboflow respondió ${resp.status}: ${texto.slice(0, 300)}`
        );
        err.tipo = "roboflow";
        err.status = resp.status;
        // 4xx (salvo 429) no se reintenta: es un problema de la petición
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          throw err;
        }
        ultimoError = err;
      } else {
        const datos = await resp.json();
        // La respuesta es una lista (una entrada por imagen de entrada).
        const salidas = Array.isArray(datos?.outputs)
          ? datos.outputs
          : Array.isArray(datos)
          ? datos
          : [datos];
        return salidas[0] ?? {};
      }
    } catch (e) {
      clearTimeout(temporizador);
      if (e.tipo === "roboflow" && e.status && e.status < 500 && e.status !== 429) {
        throw e; // error no recuperable
      }
      ultimoError =
        e.name === "AbortError"
          ? new Error(`Roboflow no respondió en ${TIMEOUT_MS / 1000}s (timeout)`)
          : e;
    }

    if (intento < MAX_REINTENTOS) {
      await dormir(500 * Math.pow(2, intento)); // backoff: 500ms, 1000ms
    }
  }

  const err = ultimoError || new Error("Fallo desconocido al llamar a Roboflow");
  err.tipo = err.tipo || "roboflow";
  throw err;
}
