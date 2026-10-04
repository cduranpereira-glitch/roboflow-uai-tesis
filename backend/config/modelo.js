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
  // Reemplazar por los valores reales (en porcentaje 0-100):
  mAP: null, // ej: 89.4
  precision: null, // ej: 91.2
  recall: null, // ej: 85.7
  // Opcional: fecha de entrenamiento, nº de imágenes, etc.
  imagenesEntrenamiento: null, // ej: 1200
  notas:
    "Valores de evaluación del modelo entrenado en Roboflow. Pendiente de completar con las métricas reales.",
};
