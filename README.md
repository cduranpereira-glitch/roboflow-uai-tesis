# Roboflow - Tesis UAI

Aplicación web responsiva para **detectar daños en repuestos automotrices de lata**
(parachoques, puertas, capó, etc.) usando un modelo entrenado en Roboflow.

La app tiene un **Home** con dos opciones:

- **Analizar**: abre la cámara, fotografía la pieza, corre el modelo de Roboflow
  y entrega un resumen en dos secciones:
  1. **Resultado del negocio**: si está dañada o no, tipos de daño, ubicación y
     confianza de cada detección.
  2. **Resultado técnico**: métricas fijas del modelo entrenado (mAP, precision,
     recall).
- **Historial**: lista todos los análisis. Cada análisis se guarda como un
  archivo **`.txt`** nombrado con la fecha y hora. El historial es **compartido**
  (vive en el servidor), así todo el equipo ve los mismos resultados.

## Estructura

```
frontend/   → React + Vite (la interfaz)
backend/    → Node + Express (esconde la API key, corre Roboflow, guarda los .txt)
```

El backend esconde tu **API key de Roboflow** para que no quede expuesta en el
navegador, y es quien escribe los archivos `.txt` del historial.

## Requisitos

- Node.js 18 o superior (probado con Node 20).

## Puesta en marcha (local)

### 1. Configura tu API key de Roboflow

```bash
cd backend
cp .env.example .env
```

Abre `backend/.env` y pega tu **Private API Key** del workspace `capstone-mia`
(la encuentras en https://app.roboflow.com/settings/api):

```
ROBOFLOW_API_KEY=tu_key_real_aqui
```

> El archivo `.env` está en `.gitignore` y **nunca** se sube a GitHub.

### 2. Completa las métricas del modelo

Edita [backend/config/modelo.js](backend/config/modelo.js) y reemplaza los
valores `null` de `mAP`, `precision` y `recall` por los números reales de tu
modelo (los ves en Roboflow → tu proyecto → Versions → métricas de la versión).

### 3. Instala dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Corre la app (dos terminales)

**Terminal 1 — backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Abre la URL que muestra Vite (normalmente http://localhost:5173).

> La cámara del computador funciona en `localhost`. En el **celular** la cámara
> solo funciona por **HTTPS** (ver sección de despliegue).

## Probar desde el celular en la misma WiFi

Vite ya está configurado para aceptar conexiones de la red local (`host: true`).
Al correr `npm run dev` te mostrará una URL tipo `http://192.168.x.x:5173`.
Ábrela en el celular. Ojo: por HTTP la cámara puede estar bloqueada; para la
cámara en el celular conviene desplegar con HTTPS (abajo).

## Despliegue (link público)

Para un link público usable desde los teléfonos del equipo (con HTTPS, necesario
para la cámara), se recomienda un servicio con **disco persistente** para que los
`.txt` del historial no se borren. Esto lo configuramos juntos cuando estés
listo; la idea general:

1. `cd frontend && npm run build` genera `frontend/dist`.
2. El backend ya sirve ese `dist`, así que todo corre desde un solo servidor.
3. Se despliega el backend (p. ej. Railway con un volumen montado en la carpeta
   de datos vía la variable `DATA_DIR`).

## Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/salud` | Estado del servidor y si la key está configurada |
| GET | `/api/metricas` | Métricas fijas del modelo |
| POST | `/api/analizar` | Recibe `{ imagenBase64 }`, corre Roboflow, guarda el `.txt` |
| GET | `/api/historial` | Lista los archivos del historial |
| GET | `/api/historial/:nombre` | Devuelve el contenido de un `.txt` |

## Pendiente / notas

- Las **métricas del modelo** son fijas (evaluación del entrenamiento), no de
  cada foto. La **confianza** sí es por detección.
- El **parser** de la respuesta de Roboflow es defensivo; se afinará a los
  nombres reales de las salidas del workflow al correr la primera foto real.
