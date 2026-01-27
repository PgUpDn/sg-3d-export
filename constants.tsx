
import React from 'react';
import { District } from './types';

export const SINGAPORE_DISTRICTS: District[] = [
  { id: '1', name: 'Marina Bay', region: 'Central Region', lat: 1.2847, lng: 103.8597 },
  { id: '2', name: 'Orchard', region: 'Central Region', lat: 1.3048, lng: 103.8318 },
  { id: '3', name: 'Jurong West', region: 'West Region', lat: 1.3404, lng: 103.7090 },
  { id: '4', name: 'Tampines', region: 'East Region', lat: 1.3521, lng: 103.9448 },
  { id: '5', name: 'Woodlands', region: 'North Region', lat: 1.4382, lng: 103.7890 },
  { id: '6', name: 'One North', region: 'West Region', lat: 1.2995, lng: 103.7872 },
  { id: '7', name: 'NUS', region: 'West Region', lat: 1.2966, lng: 103.7764 },
  { id: '8', name: 'NTU', region: 'West Region', lat: 1.3483, lng: 103.6831 }
];

export const MAP_IMAGE_URL = "https://picsum.photos/seed/sg-map/1600/900";
