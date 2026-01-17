/**
 * API Service for SG 3D Export
 * Handles all communication with the FastAPI backend
 */

// Backend API base URL
function getApiBaseUrl(): string {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development (localhost), use local backend
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  
  // Production: use the deployed backend server
  return 'http://52.203.122.189';
}

const API_BASE_URL = getApiBaseUrl();

export interface District {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export interface SelectionStats {
  buildings: number;
  file_size: string;
  status: 'Idle' | 'Processing' | 'Ready' | 'Error';
  progress: number;
}

export interface UrbanInsightResponse {
  district_name: string;
  insight: string;
}

export interface ExportJobStatus {
  job_id: string;
  district_id: string;
  status: 'Idle' | 'Processing' | 'Ready' | 'Error';
  progress: number;
  file_size?: string;
  download_url?: string;
}

export interface STLFileInfo {
  exists: boolean;
  path: string;
  size: string;
  size_bytes?: number;
  filename: string;
  modified?: number;
}

/**
 * Fetch all Singapore districts
 */
export async function getDistricts(): Promise<District[]> {
  const response = await fetch(`${API_BASE_URL}/api/districts`);
  if (!response.ok) {
    throw new Error('Failed to fetch districts');
  }
  return response.json();
}

/**
 * Get a specific district by ID
 */
export async function getDistrict(districtId: string): Promise<District> {
  const response = await fetch(`${API_BASE_URL}/api/districts/${districtId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch district ${districtId}`);
  }
  return response.json();
}

/**
 * Get selection statistics for a district
 */
export async function getDistrictStats(districtId: string): Promise<SelectionStats> {
  const response = await fetch(`${API_BASE_URL}/api/districts/${districtId}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats for district ${districtId}`);
  }
  return response.json();
}

/**
 * Get AI-generated urban insight for a district
 */
export async function getDistrictInsight(districtId: string): Promise<UrbanInsightResponse> {
  const response = await fetch(`${API_BASE_URL}/api/districts/${districtId}/insight`);
  if (!response.ok) {
    throw new Error(`Failed to fetch insight for district ${districtId}`);
  }
  return response.json();
}

/**
 * Get urban insight by district name
 */
export async function getUrbanInsightByName(districtName: string): Promise<UrbanInsightResponse> {
  const response = await fetch(`${API_BASE_URL}/api/insight?district_name=${encodeURIComponent(districtName)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch insight for ${districtName}`);
  }
  return response.json();
}

/**
 * Get STL file information
 */
export async function getSTLInfo(): Promise<STLFileInfo> {
  const response = await fetch(`${API_BASE_URL}/api/stl/info`);
  if (!response.ok) {
    throw new Error('Failed to fetch STL info');
  }
  return response.json();
}

/**
 * Download STL file for a district
 */
export function getSTLDownloadUrl(districtId?: string): string {
  if (districtId) {
    return `${API_BASE_URL}/api/districts/${districtId}/stl`;
  }
  return `${API_BASE_URL}/api/stl/download`;
}

/**
 * Trigger STL download
 */
export async function downloadSTL(districtId?: string, districtName?: string): Promise<void> {
  const url = getSTLDownloadUrl(districtId);
  
  // Create a temporary anchor element to trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = districtName 
    ? `${districtName.replace(/\s+/g, '_')}_SG_3D.stl` 
    : 'Singapore_Building_Model.stl';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Start an export job
 */
export async function startExportJob(districtId: string): Promise<ExportJobStatus> {
  const response = await fetch(`${API_BASE_URL}/api/export/start?district_id=${districtId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to start export for district ${districtId}`);
  }
  return response.json();
}

/**
 * Check export job status
 */
export async function getExportJobStatus(jobId: string): Promise<ExportJobStatus> {
  const response = await fetch(`${API_BASE_URL}/api/export/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch export job ${jobId}`);
  }
  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; service: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
}

/**
 * 3D Mesh Preview Types
 */
export interface MeshPreviewData {
  vertices: number[];
  normals: number[];
  triangleCount: number;
  originalTriangles: number;
  center: number[];
  scale: number;
  error?: string;
}

export interface MeshBounds {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  min_z: number;
  max_z: number;
}

export interface MeshInfo {
  triangle_count: number;
  vertex_count: number;
  bounds: MeshBounds;
  file_size_mb: number;
  error?: string;
}

/**
 * Get mesh information
 */
export async function getMeshInfo(): Promise<MeshInfo> {
  const response = await fetch(`${API_BASE_URL}/api/mesh/info`);
  if (!response.ok) {
    throw new Error('Failed to fetch mesh info');
  }
  return response.json();
}

/**
 * Get mesh bounds
 */
export async function getMeshBounds(): Promise<MeshBounds> {
  const response = await fetch(`${API_BASE_URL}/api/mesh/bounds`);
  if (!response.ok) {
    throw new Error('Failed to fetch mesh bounds');
  }
  return response.json();
}

/**
 * Get mesh preview for a district
 */
export async function getDistrictMeshPreview(
  districtId: string, 
  maxTriangles: number = 5000
): Promise<MeshPreviewData> {
  // Don't pass radius - let backend use optimal default per district
  const params = new URLSearchParams({
    max_triangles: maxTriangles.toString()
  });
  
  const response = await fetch(
    `${API_BASE_URL}/api/mesh/preview/district/${districtId}?${params}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch mesh preview for district ${districtId}`);
  }
  return response.json();
}

/**
 * Get mesh preview by percentage bounds
 */
export async function getMeshPreview(
  xStart: number = 0,
  xEnd: number = 1,
  yStart: number = 0,
  yEnd: number = 1,
  maxTriangles: number = 5000
): Promise<MeshPreviewData> {
  const params = new URLSearchParams({
    x_start: xStart.toString(),
    x_end: xEnd.toString(),
    y_start: yStart.toString(),
    y_end: yEnd.toString(),
    max_triangles: maxTriangles.toString()
  });
  
  const response = await fetch(`${API_BASE_URL}/api/mesh/preview?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch mesh preview');
  }
  return response.json();
}

/**
 * Download clipped STL
 */
export function getClippedSTLDownloadUrl(
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
  districtId?: string
): string {
  const params = new URLSearchParams({
    x_start: xStart.toString(),
    x_end: xEnd.toString(),
    y_start: yStart.toString(),
    y_end: yEnd.toString()
  });
  
  if (districtId) {
    params.append('district_id', districtId);
  }
  
  return `${API_BASE_URL}/api/mesh/clip/download?${params}`;
}

/**
 * Poll export job until complete
 */
export async function pollExportJob(
  jobId: string, 
  onProgress: (status: ExportJobStatus) => void,
  intervalMs: number = 500
): Promise<ExportJobStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getExportJobStatus(jobId);
        onProgress(status);
        
        if (status.status === 'Ready' || status.status === 'Error') {
          resolve(status);
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}
