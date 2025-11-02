import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

function resolveApiBase() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }

  const localhost = Platform.select({
    ios: 'http://127.0.0.1:8001',
    android: 'http://10.0.2.2:8001',
    default: 'http://127.0.0.1:8001'
  });

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return localhost;
  }

  const host = hostUri.split(':')[0];
  return `http://${host}:8001`;
}

export const API_BASE = resolveApiBase();

export async function uploadImage(endpoint, file, fieldName = 'file') {
  const descriptor =
    typeof file === 'string'
      ? { uri: file, name: 'photo.jpg', type: 'image/jpeg' }
      : {
          uri: file?.uri,
          name: file?.name || 'photo.jpg',
          type: file?.type || 'image/jpeg',
        };

  if (!descriptor.uri) {
    throw new Error('No se recibió una imagen válida para subir.');
  }

  const formData = new FormData();
  const isRemote = /^https?:\/\//i.test(descriptor.uri);
  const canUseFileSystem =
    !isRemote && Platform.OS !== 'web' && typeof FileSystem?.uploadAsync === 'function';

  if (canUseFileSystem) {
    const uploadResult = await FileSystem.uploadAsync(
      `${API_BASE}${endpoint}`,
      descriptor.uri,
      {
        fieldName,
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType
          ? FileSystem.FileSystemUploadType.MULTIPART
          : 'multipart',
        parameters: {},
        mimeType: descriptor.type || 'image/jpeg',
      }
    );

    const { status, body } = uploadResult;
    const contentType = uploadResult.headers?.['Content-Type'] || uploadResult.headers?.['content-type'];
    const isJson = contentType ? contentType.includes('application/json') : true;
    const parsed = isJson ? safeJsonParse(body) : body;

    if (status < 200 || status >= 300) {
      const detail = parsed?.detail || parsed || 'Error desconocido al llamar al servicio';
      throw new Error(detail);
    }

    return parsed;
  }

  if (isRemote) {
    const response = await fetch(descriptor.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, descriptor.name);
  } else {
    formData.append(fieldName, descriptor);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType ? contentType.includes('application/json') : false;

  if (!res.ok) {
    const errorPayload = isJson ? await res.json() : { detail: await res.text() };
    const detail = errorPayload?.detail || 'Error desconocido al llamar al servicio';
    throw new Error(detail);
  }

  return isJson ? res.json() : res.text();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function generateKey(user, room, duration = 30) {
  const form = new FormData();
  form.append('user', user);
  form.append('room', room);
  form.append('duration', String(duration));
  const res = await fetch(`${API_BASE}/generate-key`, { method: 'POST', body: form });
  return res.json();
}

export async function submitSurvey(user, rating, feedback) {
  const res = await fetch(`${API_BASE}/survey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, rating, feedback })
  });
  return res.json();
}
