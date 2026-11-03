// Configuración del "Análisis Profundo" (varias fotos con votación).
//
// Regla de decisión según cuántas de las N fotos detectaron daño:
//   0 fotos          -> SIN DAÑO
//   1..(umbral-1)    -> INCONCLUSO (se pide repetir)
//   >= umbralDano    -> DAÑADA
export const ANALISIS_PROFUNDO = {
  numFotos: 4, // nº de fotos que se capturan en el análisis profundo
  umbralDano: 2, // nº mínimo de fotos con daño para concluir "dañada"
};
