
import React from 'react';
import { District } from './types';

// Coordinates updated to match building data coverage (lat 1.365-1.632, lon 103.76-104.21)
export const SINGAPORE_DISTRICTS: District[] = [
  { id: '1', name: 'Punggol', region: 'North-East Region', lat: 1.4700, lng: 104.0600 },
  { id: '2', name: 'Sengkang', region: 'North-East Region', lat: 1.5200, lng: 104.0400 },
  { id: '3', name: 'Hougang', region: 'North-East Region', lat: 1.5400, lng: 104.0300 },
  { id: '4', name: 'Pasir Ris', region: 'East Region', lat: 1.4800, lng: 104.0700 },
  { id: '5', name: 'Woodlands', region: 'North Region', lat: 1.6300, lng: 103.8200 },
  { id: '6', name: 'Sembawang', region: 'North Region', lat: 1.6300, lng: 103.8100 },
  { id: '7', name: 'Tampines', region: 'East Region', lat: 1.4800, lng: 104.0800 },
  { id: '8', name: 'Ang Mo Kio', region: 'Central Region', lat: 1.5100, lng: 104.0400 }
];

export const MAP_IMAGE_URL = "https://picsum.photos/seed/sg-map/1600/900";
