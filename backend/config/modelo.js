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
// MÉTRICAS FIJAS DEL MODELO ENTRENADO
// ---------------------------------------------------------------------------
// Estos son los números con los que se EVALUÓ el modelo durante su
// entrenamiento en Roboflow. Son fijos (iguales para todas las fotos) y se
// muestran en la sección "Resultado técnico".
//
// 👉 Camilo: reemplaza estos valores de ejemplo por los reales de tu modelo.
//    Los encuentras en Roboflow: tu proyecto → pestaña "Versions" → la versión
//    del modelo → métricas (mAP, Precision, Recall). El "accuracy" general
//    muchas veces se reporta como mAP@50.
export const METRICAS_MODELO = {
  nombreModelo: "YOLOv12s (yolo12s)",
  version: "7",
  // Métricas de evaluación sobre el Test Set (en porcentaje 0-100):
  mAP: 88.9, // mAP@50
  precision: 90.6,
  recall: 84.5,
  f1: 87.2,
  // Opcional: fecha de entrenamiento, nº de imágenes, etc.
  imagenesEntrenamiento: null,
  notas:
    "Métricas de evaluación del modelo entrenado en Roboflow (Test Set).",
};
