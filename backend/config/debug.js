// Bandera de DEBUG del backend.
// Cuando está en true, la respuesta de /api/analizar incluye un objeto "debug"
// con TODO lo que entra y sale del workflow de Roboflow (request, respuesta
// cruda completa y lo que parseó el backend).
//
// 👉 Cámbiala a false cuando no quieras exponer esa info.
// También se puede controlar con la variable de entorno DEBUG_ROBOFLOW=false
export const DEBUG = (process.env.DEBUG_ROBOFLOW ?? "true") !== "false";
