// Agrega los resultados (negocio) de varias fotos en un único veredicto.
// Votación por "¿dañada?" (que viene del output encontro_dano del workflow) y
// agregación por tipo de daño (en cuántas fotos apareció y confianza media).

import { ANALISIS_PROFUNDO } from "./config/analisis.js";

export function agregarProfundo(negocios) {
  const totalFotos = negocios.length;
  const votosConDano = negocios.filter((n) => n.dañada).length;
  const umbralDano = ANALISIS_PROFUNDO.umbralDano;

  let veredicto;
  if (votosConDano === 0) veredicto = "sin_dano";
  else if (votosConDano < umbralDano) veredicto = "inconcluso";
  else veredicto = "dañada";

  // Agregación por tipo de daño across las fotos.
  const acc = {}; // tipo -> { fotos, sumaConf, nConf }
  negocios.forEach((n) => {
    const vistosEnEstaFoto = new Set();
    (n.detalles || []).forEach((d) => {
      const t = d.tipoDano || "desconocido";
      if (!acc[t]) acc[t] = { fotos: 0, sumaConf: 0, nConf: 0 };
      if (!vistosEnEstaFoto.has(t)) {
        acc[t].fotos += 1;
        vistosEnEstaFoto.add(t);
      }
      if (typeof d.confianza === "number") {
        acc[t].sumaConf += d.confianza;
        acc[t].nConf += 1;
      }
    });
  });

  const tipos = Object.entries(acc)
    .map(([tipo, v]) => ({
      tipo,
      fotos: v.fotos, // en cuántas de las N fotos apareció
      confianzaMedia: v.nConf ? +(v.sumaConf / v.nConf).toFixed(4) : null,
    }))
    .sort((a, b) => b.fotos - a.fotos);

  const porFoto = negocios.map((n, i) => ({
    foto: i + 1,
    dañada: n.dañada,
    sinClasificacion: Boolean(n.sinClasificacion),
    tipos: n.tiposDeDano || [],
    cantidad: n.cantidadDanos || 0,
    // Imagen anotada (con el daño marcado) para poder verla en el resultado.
    // Va en la respuesta HTTP (en memoria); NO se escribe en el .txt.
    imagenAnotadaBase64: n.imagenAnotadaBase64 || null,
  }));

  return { veredicto, votosConDano, totalFotos, umbralDano, tipos, porFoto };
}
