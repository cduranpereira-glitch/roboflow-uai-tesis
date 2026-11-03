import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { correrWorkflow } from "./roboflow.js";
import { resumirNegocio } from "./parser.js";
import {
  guardarAnalisis,
  guardarAnalisisProfundo,
  listarAnalisis,
  leerAnalisis,
} from "./historial.js";
import { METRICAS_MODELO } from "./config/modelo.js";
import { ANALISIS_PROFUNDO } from "./config/analisis.js";
import { agregarProfundo } from "./agregador.js";
import { obtenerInfoModelo } from "./workflowInfo.js";

// Quita el prefijo "data:image/...;base64," si viene incluido.
function limpiarBase64(s) {
  const coma = s.indexOf(",");
  return s.startsWith("data:") && coma !== -1 ? s.slice(coma + 1) : s;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PUERTO = process.env.PORT || 3001;

app.use(cors());
// Las imágenes van en base64, así que subimos el límite del body.
app.use(express.json({ limit: "25mb" }));

// Salud del servidor
app.get("/api/salud", (req, res) => {
  res.json({
    ok: true,
    apiKeyConfigurada: Boolean(process.env.ROBOFLOW_API_KEY),
  });
});

// Arma la sección técnica. Las métricas (mAP/precision/recall/F1) vienen de
// config/modelo.js, que son las del panel "Metrics" (Test Set) de Roboflow —
// la API pública NO las expone, por eso se mantienen a mano. El MODELO en sí
// (id, arquitectura, versión, parámetros) sí se lee dinámico desde el workflow.
function construirTecnico(modelo) {
  return {
    ...METRICAS_MODELO,
    metricasFuente: "Roboflow · panel Metrics (Test Set)",
    modelo,
  };
}

// Sección técnica (métricas dinámicas + modelo dinámico) para el front
app.get("/api/metricas", async (req, res) => {
  const modelo = await obtenerInfoModelo();
  res.json(construirTecnico(modelo));
});

// Config que el front necesita conocer (p. ej. nº de fotos del análisis profundo)
app.get("/api/config", (req, res) => {
  res.json({ analisisProfundo: { numFotos: ANALISIS_PROFUNDO.numFotos } });
});

// Analizar una imagen
app.post("/api/analizar", async (req, res) => {
  try {
    let { imagenBase64 } = req.body || {};
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
      return res
        .status(400)
        .json({ error: "Falta 'imagenBase64' en el cuerpo de la petición." });
    }
    imagenBase64 = limpiarBase64(imagenBase64);

    const { salida } = await correrWorkflow(imagenBase64);
    const negocio = resumirNegocio(salida);

    // Modelo con el que se evaluó + métricas (dinámicos desde Roboflow)
    const modelo = await obtenerInfoModelo();
    const tecnico = construirTecnico(modelo);

    const guardado = await guardarAnalisis(negocio, tecnico);

    res.json({
      negocio,
      tecnico,
      archivo: guardado.nombre,
      fecha: guardado.fecha,
    });
  } catch (e) {
    console.error("Error en /api/analizar:", e);
    const status = e.tipo === "config" ? 500 : e.tipo === "roboflow" ? 502 : 500;
    res.status(status).json({ error: e.message, tipo: e.tipo || "desconocido" });
  }
});

// Análisis profundo: varias fotos -> votación -> un veredicto.
app.post("/api/analizar-profundo", async (req, res) => {
  try {
    const { imagenes } = req.body || {};
    if (!Array.isArray(imagenes) || imagenes.length < 2) {
      return res.status(400).json({
        error: "Se requiere 'imagenes' (array con al menos 2 fotos en base64).",
      });
    }
    if (imagenes.length > ANALISIS_PROFUNDO.numFotos) {
      return res.status(400).json({
        error: `Máximo ${ANALISIS_PROFUNDO.numFotos} fotos por análisis profundo.`,
      });
    }

    // Llamadas a Roboflow en PARALELO (una por foto).
    const salidas = await Promise.all(
      imagenes.map((img) => correrWorkflow(limpiarBase64(String(img))))
    );
    const negocios = salidas.map(({ salida }) => resumirNegocio(salida));

    const agregado = agregarProfundo(negocios);

    const modelo = await obtenerInfoModelo();
    const tecnico = construirTecnico(modelo);

    const guardado = await guardarAnalisisProfundo(agregado, tecnico);

    res.json({
      agregado,
      tecnico,
      archivo: guardado.nombre,
      fecha: guardado.fecha,
    });
  } catch (e) {
    console.error("Error en /api/analizar-profundo:", e);
    const status = e.tipo === "config" ? 500 : e.tipo === "roboflow" ? 502 : 500;
    res.status(status).json({ error: e.message, tipo: e.tipo || "desconocido" });
  }
});

// Listar historial
app.get("/api/historial", async (req, res) => {
  try {
    const archivos = await listarAnalisis();
    res.json({ archivos });
  } catch (e) {
    console.error("Error en /api/historial:", e);
    res.status(500).json({ error: e.message });
  }
});

// Leer un análisis del historial
app.get("/api/historial/:nombre", async (req, res) => {
  try {
    const contenido = await leerAnalisis(req.params.nombre);
    res.type("text/plain; charset=utf-8").send(contenido);
  } catch (e) {
    const status = e.tipo === "validacion" ? 400 : 404;
    res.status(status).json({ error: e.message });
  }
});

// En producción servimos el front ya compilado (si existe).
const distFront = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(distFront));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distFront, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PUERTO, () => {
  console.log(`Backend escuchando en http://localhost:${PUERTO}`);
  if (!process.env.ROBOFLOW_API_KEY) {
    console.warn(
      "⚠️  ROBOFLOW_API_KEY no está configurada. Copia backend/.env.example a backend/.env y pega tu key."
    );
  }
});
