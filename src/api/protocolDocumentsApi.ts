import { apiFetch, getToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ProtocolDocument {
  id: string;
  title: string;
  file: string;
  version?: string;
  updatedAt?: string;
  category?: string;
  description?: string;
  sizeBytes: number;
}

export function listProtocolDocuments() {
  return apiFetch<ProtocolDocument[]>('/api/protocol-documents');
}

/**
 * Los PDF se piden con la sesión del coordinador (no son archivos públicos), así que no se pueden abrir con un
 * enlace común: se descargan como blob y se abren desde la memoria del navegador.
 */
async function fetchBlob(id: string, download: boolean): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/protocol-documents/${encodeURIComponent(id)}/file${download ? '?download=1' : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(res.status === 404 ? 'El documento ya no está disponible' : `No se pudo abrir el documento (${res.status})`);
  return res.blob();
}

/** Abre el PDF en una pestaña nueva. La pestaña se abre antes de pedir el archivo para que el navegador no la bloquee. */
export async function openProtocolDocument(doc: ProtocolDocument): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await fetchBlob(doc.id, false));
    if (tab) tab.location.href = url;
    else window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export async function downloadProtocolDocument(doc: ProtocolDocument): Promise<void> {
  const url = URL.createObjectURL(await fetchBlob(doc.id, true));
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
