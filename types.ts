
export interface District {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export interface SelectionStats {
  buildings: number;
  fileSize: string;
  status: 'Idle' | 'Processing' | 'Ready' | 'Error';
  progress: number;
}

export enum AppRoute {
  EXPLORER = 'Explorer',
  EXPORT_MANAGER = 'Export Manager',
  ANALYTICS = 'Analytics',
  ARCHIVE = 'Archive'
}
