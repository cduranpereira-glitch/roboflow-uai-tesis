import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { correrWorkflow } from "./roboflow.js";
import { resumirNegocio } from "./parser.js";
import { guardarAnalisis, listarAnalisis, leerAnalisis } from "./historial.js";
import { METRICAS_MODELO } from "./config/modelo.js";
import { obtenerInfoModelo } from "./workflowInfo.js";
import { DEBUG } from "./config/debug.js";

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
    debug: DEBUG,
  });
});

// Métricas fijas del modelo + modelo dinámico (para la sección técnica del front)
app.get("/api/metricas", async (req, res) => {
  const modelo = await obtenerInfoModelo();
  res.json({ ...METRICAS_MODELO, modelo });
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
    // Quitamos el prefijo data:image/...;base64, si viene incluido.
    const coma = imagenBase64.indexOf(",");
    if (imagenBase64.startsWith("data:") && coma !== -1) {
      imagenBase64 = imagenBase64.slice(coma + 1);
    }

    const { salida, respuestaCompleta, meta } = await correrWorkflow(imagenBase64);
    const negocio = resumirNegocio(salida);

    // Modelo con el que se evaluó (dinámico, leído del workflow en Roboflow)
    const modelo = await obtenerInfoModelo();
    const tecnico = { ...METRICAS_MODELO, modelo };

    const guardado = await guardarAnalisis(negocio, tecnico);

    const respuesta = {
      negocio,
      tecnico,
      archivo: guardado.nombre,
      fecha: guardado.fecha,
    };

    // Panel de debug: TODO lo que entró y salió del workflow.
    if (DEBUG) {
      respuesta.debug = {
        entrada: {
          endpoint: meta.url,
          modelo: modelo, // id dinámico + parámetros (confianza, iou, ...)
          imagen: meta.imagen,
          inputsEnviados: meta.inputsEnviados,
        },
        salida: {
          httpStatus: meta.httpStatus,
          duracionMs: meta.duracionMs,
          intentos: meta.intentos,
          respuestaCompleta, // respuesta CRUDA de Roboflow (outputs + profiler_trace)
        },
        parseado: {
          dañada: negocio.dañada,
          cantidadDanos: negocio.cantidadDanos,
          tiposDeDano: negocio.tiposDeDano,
          clavesSalida: negocio.clavesSalida,
          detalles: negocio.detalles,
        },
      };
    }

    res.json(respuesta);
  } catch (e) {
    console.error("Error en /api/analizar:", e);
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
