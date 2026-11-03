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

// Genera un nombre tipo: analisis_2026-10-04_14-23-05_rapido.txt
function nombreArchivo(fecha, sufijo = "rapido") {
  const p = (n) => String(n).padStart(2, "0");
  const f = `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
  const h = `${p(fecha.getHours())}-${p(fecha.getMinutes())}-${p(fecha.getSeconds())}`;
  return `analisis_${f}_${h}_${sufijo}.txt`;
}

function formatearPct(v) {
  return v == null ? "(pendiente)" : `${v}%`;
}

// Sección técnica (modelo dinámico + métricas), compartida por ambos informes.
function seccionTecnica(tecnico) {
  const L = [];
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
  const met = tecnico || METRICAS_MODELO;
  L.push(`mAP@50: ${formatearPct(met.mAP)}`);
  L.push(`Precision: ${formatearPct(met.precision)}`);
  L.push(`Recall: ${formatearPct(met.recall)}`);
  L.push(`F1: ${formatearPct(met.f1)}${met.f1Calculado ? " (calculado de P y R)" : ""}`);
  if (tecnico?.metricasFuente) {
    L.push(`Fuente de las métricas: ${tecnico.metricasFuente}`);
  }
  L.push("");
  L.push("Nota: las métricas del modelo corresponden a la evaluación del modelo");
  L.push("entrenado en Roboflow, no a esta fotografía en particular.");
  return L;
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
  if (negocio.dañada && negocio.sinClasificacion) {
    L.push("Daño detectado, pero sin un tipo de clasificación identificado.");
  } else {
    L.push(`Cantidad de daños detectados: ${negocio.cantidadDanos}`);
    if (negocio.tiposDeDano.length) {
      L.push(`Tipos de daño: ${negocio.tiposDeDano.join(", ")}`);
    }
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
  L.push(...seccionTecnica(tecnico));
  L.push("====================================================");
  return L.join("\n");
}

// Informe del Análisis Profundo (varias fotos con votación).
function construirTextoProfundo(fecha, agregado, tecnico) {
  const L = [];
  L.push("====================================================");
  L.push(" ANÁLISIS PROFUNDO DE DAÑOS EN REPUESTOS AUTOMOTRICES");
  L.push("====================================================");
  L.push(`Fecha y hora: ${fecha.toLocaleString("es-CL")}`);
  L.push(`Modo: Análisis Profundo (${agregado.totalFotos} fotos)`);
  L.push("");
  L.push("----- RESULTADO DEL NEGOCIO -----");
  const etiqueta =
    agregado.veredicto === "dañada"
      ? "DAÑADA"
      : agregado.veredicto === "sin_dano"
      ? "SIN DAÑO"
      : "INCONCLUSO (se recomienda repetir)";
  L.push(`Veredicto: ${etiqueta}`);
  L.push(
    `Votación: ${agregado.votosConDano} de ${agregado.totalFotos} fotos detectaron daño ` +
      `(umbral para 'dañada': ${agregado.umbralDano}).`
  );
  if (agregado.tipos.length) {
    L.push("");
    L.push("Desglose por tipo de daño:");
    agregado.tipos.forEach((t) => {
      const conf = t.confianzaMedia != null ? `${(t.confianzaMedia * 100).toFixed(1)}%` : "s/d";
      L.push(`  - ${t.tipo}: en ${t.fotos}/${agregado.totalFotos} fotos — confianza media ${conf}`);
    });
  }
  L.push("");
  L.push("Detalle por foto:");
  agregado.porFoto.forEach((f) => {
    const estado = f.dañada
      ? f.sinClasificacion
        ? "daño (sin clasificación)"
        : `daño: ${f.tipos.join(", ") || "s/d"}`
      : "sin daño";
    L.push(`  Foto ${f.foto}: ${estado}`);
  });
  L.push("");
  L.push(...seccionTecnica(tecnico));
  L.push("====================================================");
  return L.join("\n");
}

export async function guardarAnalisis(negocio, tecnico) {
  await asegurarCarpeta();
  const fecha = new Date();
  const nombre = nombreArchivo(fecha, "rapido");
  const texto = construirTexto(fecha, negocio, tecnico);
  await fs.writeFile(path.join(DIR_DATOS, nombre), texto, "utf8");
  return { nombre, fecha: fecha.toISOString(), texto };
}

export async function guardarAnalisisProfundo(agregado, tecnico) {
  await asegurarCarpeta();
  const fecha = new Date();
  const nombre = nombreArchivo(fecha, "profundo");
  const texto = construirTextoProfundo(fecha, agregado, tecnico);
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
