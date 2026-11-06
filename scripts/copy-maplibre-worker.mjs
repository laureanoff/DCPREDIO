// MapLibre carga su procesamiento de mapa desde un "worker". Lo servimos desde /public para que
// funcione igual en desarrollo y en Vercel. Se copia en cada dev/build, siempre de la versión instalada.
import { cpSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(`${from}/${f}`, `${to}/${f}`);
