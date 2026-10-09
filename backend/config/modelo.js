// Configuración del modelo y del workflow de Roboflow.
// Los datos sensibles (API key) NO van aquí: van en el archivo .env

export const ROBOFLOW = {
  // URL base del endpoint serverless de Roboflow
  apiUrl: "https://serverless.roboflow.com",
  // Slug del workspace
  workspace: "capstone-mia",
  // Slug del workflow (NO es el id del documento)
  workflowId:
    "deteccion-de-danos-en-repuestos-automotrices-vdeteccion-de-danos-en-repuestos-automotrices-7-yolo12s-t5-logic",
};

// ---------------------------------------------------------------------------
// MÉTRICAS DE EVALUACIÓN DEL MODELO (panel "Metrics" / Test Set de Roboflow)
// ---------------------------------------------------------------------------
// IMPORTANTE: estas son las métricas que se ven en Roboflow (web) en el panel
// "Metrics" → Test Set del modelo. La API pública de Roboflow NO expone estos
// números (solo expone los del "modelo desplegado", que se calculan distinto y
// NO coinciden). Por eso se mantienen aquí, a mano.
//
// 👉 Camilo: si cambias el modelo del workflow, actualiza estos 4 valores con
//    los del panel "Metrics" del modelo nuevo en Roboflow.
//
// Modelo actual: rfdetr-small-t1, versión 7.
export const METRICAS_MODELO = {
  nombreModelo: "RF-DETR Small (rfdetr-small-t1)",
  version: "7",
  // Métricas de evaluación sobre el Test Set (en porcentaje 0-100):
  mAP: 88.9, // mAP@50
  precision: 90.6,
  recall: 84.5,
  f1: 87.2,
  // Opcional: fecha de entrenamiento, nº de imágenes, etc.
  imagenesEntrenamiento: null,
  notas:
    "Métricas del panel Metrics (Test Set) del modelo en Roboflow.",
};
