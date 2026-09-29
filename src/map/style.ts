// Map colours and layers. No basemap tiles or fonts are loaded: the map is drawn entirely
// from the bundled Natural Earth boundaries, so there are no API keys or third-party calls.

import type { AddLayerObject } from 'maplibre-gl';

export const COUNTRY_SOURCE = 'countries';
export const FILL_LAYER = 'country-fill';

export const colors = {
  ocean: '#0b1726',
  land: '#26364a',
  landHover: '#36506f',
  landSelected: '#8c6d1f',
  border: '#5b6f88',
  selectedOutline: '#f2c94c',
} as const;

export const countryLayers: AddLayerObject[] = [
  {
    id: FILL_LAYER,
    type: 'fill',
    source: COUNTRY_SOURCE,
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        colors.landSelected,
        ['boolean', ['feature-state', 'hover'], false],
        colors.landHover,
        colors.land,
      ],
    },
  },
  {
    id: 'country-border',
    type: 'line',
    source: COUNTRY_SOURCE,
    paint: { 'line-color': colors.border, 'line-width': 0.6 },
  },
  {
    id: 'country-selected-outline',
    type: 'line',
    source: COUNTRY_SOURCE,
    paint: {
      'line-color': colors.selectedOutline,
      'line-width': 1.8,
      'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0],
    },
  },
];
