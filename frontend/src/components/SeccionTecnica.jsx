// Sección "Resultado técnico (modelo ML)" compartida por ambos análisis.

function Metrica({ etiqueta, valor }) {
  return (
    <div className="metrica">
      <span className="metrica-valor">{valor == null ? "—" : `${valor}%`}</span>
      <span className="metrica-etiqueta">{etiqueta}</span>
    </div>
  );
}

export default function SeccionTecnica({ tecnico }) {
  return (
    <section className="seccion seccion-tecnica">
      <h3 className="seccion-titulo">Resultado técnico (modelo ML)</h3>
      <p className="dato">
        <strong>Modelo con el que se evaluó:</strong>
        <br />
        <code className="modelo-id">
          {tecnico.modelo?.modeloId ||
            `${tecnico.nombreModelo} (v${tecnico.version})`}
        </code>
        {tecnico.modelo?.arquitectura && (
          <span className="modelo-meta">
            {" "}
            · {tecnico.modelo.arquitectura}
            {tecnico.modelo.version ? ` · v${tecnico.modelo.version}` : ""}
          </span>
        )}
      </p>
      <div className="metricas-grid metricas-grid-4">
        <Metrica etiqueta="mAP@50" valor={tecnico.mAP} />
        <Metrica etiqueta="Precision" valor={tecnico.precision} />
        <Metrica etiqueta="Recall" valor={tecnico.recall} />
        <Metrica etiqueta="F1" valor={tecnico.f1} />
      </div>
      <p className="nota-tecnica">
        Métricas de evaluación del modelo entrenado en Roboflow (no de esta foto
        en particular).
        {tecnico.f1Calculado &&
          " El F1 se calcula a partir de Precision y Recall."}
        {tecnico.metricasFuente && (
          <>
            <br />
            Fuente: {tecnico.metricasFuente}.
          </>
        )}
      </p>
    </section>
  );
}
