// MapLibre GL 6 runs tile/GeoJSON processing in a module web worker that it expects to find
// next to its own file. Once bundled that file doesn't exist, so let Vite bundle the worker
// (with the chunk it shares with the main library) and tell MapLibre where it ended up.
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
