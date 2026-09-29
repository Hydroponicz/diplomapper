import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibreWorker';
import type { CountryCollection } from '../core/countries';
import { useAtlas } from '../state/store';
import { COUNTRY_SOURCE, FILL_LAYER, colors, countryLayers } from './style';

interface Hover {
  name: string;
  x: number;
  y: number;
}

/** Keeps the eased-to country clear of the panel (left column on desktop, bottom sheet on phones). */
function cameraPadding() {
  return window.matchMedia('(max-width: 720px)').matches
    ? { top: 40, bottom: Math.round(window.innerHeight * 0.45), left: 20, right: 20 }
    : { top: 40, bottom: 40, left: 420, right: 40 };
}

const WEBGL_ERROR = 'The map could not start. Your browser or device may not support WebGL 2.';

function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export function WorldMap({ collection }: { collection: CountryCollection | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [mapError, setMapError] = useState<string | null>(() => (supportsWebGL2() ? null : WEBGL_ERROR));
  const selectedId = useAtlas((s) => s.selectedId);
  const source = useAtlas((s) => s.source);

  // Create the map immediately so the ocean and controls render while boundaries load.
  useEffect(() => {
    if (!containerRef.current || mapError) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': colors.ocean } }],
        },
        center: [10, 25],
        zoom: 1.2,
        minZoom: 0.8,
        maxZoom: 7,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: {
          compact: true,
          customAttribution: 'Boundaries: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>',
        },
      });
    } catch (err) {
      console.error(err);
      queueMicrotask(() => setMapError(WEBGL_ERROR));
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setMapLoaded(true));
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      setMapLoaded(false);
      setLayersReady(false);
      map.remove();
    };
  }, [mapError]);

  // Add the boundaries and interaction handlers once both the map and the data are ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !collection || map.getSource(COUNTRY_SOURCE)) return;

    map.addSource(COUNTRY_SOURCE, { type: 'geojson', data: collection, promoteId: 'id' });
    for (const layer of countryLayers) map.addLayer(layer);

    let hoveredId: string | null = null;
    const setHoverState = (id: string | null) => {
      if (hoveredId) map.setFeatureState({ source: COUNTRY_SOURCE, id: hoveredId }, { hover: false });
      hoveredId = id;
      if (id) map.setFeatureState({ source: COUNTRY_SOURCE, id }, { hover: true });
    };

    const onMove = (e: MapLayerMouseEvent) => {
      const props = e.features?.[0]?.properties as { id?: string; name?: string } | undefined;
      if (!props?.id) return;
      if (props.id !== hoveredId) setHoverState(props.id);
      map.getCanvas().style.cursor = 'pointer';
      setHover({ name: props.name ?? props.id, x: e.point.x, y: e.point.y });
    };
    const onLeave = () => {
      setHoverState(null);
      map.getCanvas().style.cursor = '';
      setHover(null);
    };
    const onClick = (e: MapLayerMouseEvent) => {
      const id = (e.features?.[0]?.properties as { id?: string } | undefined)?.id;
      if (id) useAtlas.getState().select(id, 'map');
    };

    map.on('mousemove', FILL_LAYER, onMove);
    map.on('mouseleave', FILL_LAYER, onLeave);
    map.on('click', FILL_LAYER, onClick);
    setLayersReady(true);
  }, [mapLoaded, collection]);

  // Reflect the selection on the map. Only move the camera when the selection didn't come
  // from clicking the map (the user is already looking at what they clicked).
  const selectedRef = useRef<string | null>(null);
  const hasPositioned = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;
    if (selectedRef.current) {
      map.setFeatureState({ source: COUNTRY_SOURCE, id: selectedRef.current }, { selected: false });
    }
    map.setFeatureState({ source: COUNTRY_SOURCE, id: selectedId }, { selected: true });
    selectedRef.current = selectedId;

    const country = useAtlas.getState().countries?.byId.get(selectedId);
    if (!country || source === 'map') return;
    const camera = {
      center: [country.labelX, country.labelY] as [number, number],
      zoom: Math.max(map.getZoom(), 2),
      padding: cameraPadding(),
    };
    if (hasPositioned.current) map.easeTo({ ...camera, duration: 900 });
    else map.jumpTo(camera);
    hasPositioned.current = true;
  }, [layersReady, selectedId, source]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" aria-label="World map. Click a country to select it." role="region" />
      {hover && (
        <div className="map-tooltip" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
          {hover.name}
        </div>
      )}
      {mapError && <div className="map-error" role="alert">{mapError}</div>}
    </div>
  );
}
