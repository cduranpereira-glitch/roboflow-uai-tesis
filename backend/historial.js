// Manejo del historial: cada análisis se guarda como un archivo .txt nombrado
// por fecha y hora. El historial es compartido (vive en el servidor).

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { METRICAS_MODELO } from "./config/modelo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Carpeta donde viven los .txt. Se puede cambiar con la variable DATA_DIR
// (útil al desplegar en un servidor con disco persistente).
const DIR_DATOS = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data", "analisis");

async function asegurarCarpeta() {
  await fs.mkdir(DIR_DATOS, { recursive: true });
}

// Genera un nombre tipo: analisis_2026-10-04_14-23-05.txt
function nombreArchivo(fecha) {
  const p = (n) => String(n).padStart(2, "0");
  const f = `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
  const h = `${p(fecha.getHours())}-${p(fecha.getMinutes())}-${p(fecha.getSeconds())}`;
  return `analisis_${f}_${h}.txt`;
}

function formatearPct(v) {
  return v == null ? "(pendiente)" : `${v}%`;
}

// Construye el contenido legible del .txt
function construirTexto(fecha, negocio, tecnico) {
  const L = [];
  L.push("====================================================");
  L.push(" ANÁLISIS DE DAÑOS EN REPUESTOS AUTOMOTRICES");
  L.push("====================================================");
  L.push(`Fecha y hora: ${fecha.toLocaleString("es-CL")}`);
  L.push("");
  L.push("----- RESULTADO DEL NEGOCIO -----");
  L.push(`¿Pieza dañada?: ${negocio.dañada ? "SÍ" : "NO"}`);
  L.push(`Cantidad de daños detectados: ${negocio.cantidadDanos}`);
  if (negocio.tiposDeDano.length) {
    L.push(`Tipos de daño: ${negocio.tiposDeDano.join(", ")}`);
  }
  if (negocio.detalles.length) {
    L.push("");
    L.push("Detalle de detecciones:");
    negocio.detalles.forEach((d, i) => {
      const conf =
        d.confianza != null ? `${(d.confianza * 100).toFixed(1)}%` : "s/d";
      let linea = `  ${i + 1}. ${d.tipoDano} — confianza ${conf}`;
      if (d.ubicacion) {
        linea += ` — ubicación aprox. (x:${d.ubicacion.x}, y:${d.ubicacion.y})`;
      }
      L.push(linea);
    });
  }
  L.push("");
  L.push("----- RESULTADO TÉCNICO (MODELO ML) -----");
  const modelo = tecnico?.modelo || {};
  if (modelo.modeloId) {
    L.push(`Modelo evaluador (dinámico, desde Roboflow): ${modelo.modeloId}`);
    if (modelo.arquitectura || modelo.version) {
      L.push(
        `  Arquitectura: ${modelo.arquitectura || "s/d"} · Versión: ${modelo.version || "s/d"}`
      );
    }
  } else {
    L.push(`Modelo: ${METRICAS_MODELO.nombreModelo} (versión ${METRICAS_MODELO.version})`);
  }
  L.push(`mAP@50: ${formatearPct(METRICAS_MODELO.mAP)}`);
  L.push(`Precision: ${formatearPct(METRICAS_MODELO.precision)}`);
  L.push(`Recall: ${formatearPct(METRICAS_MODELO.recall)}`);
  L.push(`F1: ${formatearPct(METRICAS_MODELO.f1)}`);
  if (METRICAS_MODELO.imagenesEntrenamiento) {
    L.push(`Imágenes de entrenamiento: ${METRICAS_MODELO.imagenesEntrenamiento}`);
  }
  L.push("");
  L.push(
    "Nota: las métricas del modelo son fijas; corresponden a la evaluación"
  );
  L.push("del modelo entrenado en Roboflow, no a esta fotografía en particular.");
  L.push("====================================================");
  return L.join("\n");
}

export async function guardarAnalisis(negocio, tecnico) {
  await asegurarCarpeta();
  const fecha = new Date();
  const nombre = nombreArchivo(fecha);
  const texto = construirTexto(fecha, negocio, tecnico);
  await fs.writeFile(path.join(DIR_DATOS, nombre), texto, "utf8");
  return { nombre, fecha: fecha.toISOString(), texto };
}

export async function listarAnalisis() {
  await asegurarCarpeta();
  const archivos = (await fs.readdir(DIR_DATOS))
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .reverse(); // más recientes primero
  return archivos;
}

export async function leerAnalisis(nombre) {
  // Seguridad: solo permitimos nombres de archivo simples (sin rutas).
  if (!/^analisis_[\w-]+\.txt$/.test(nombre)) {
    const err = new Error("Nombre de archivo no válido");
    err.tipo = "validacion";
    throw err;
  }
  await asegurarCarpeta();
  return fs.readFile(path.join(DIR_DATOS, nombre), "utf8");
}
