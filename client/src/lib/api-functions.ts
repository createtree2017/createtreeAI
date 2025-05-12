// API 요청을 위한 기본 함수
import { apiRequest } from '@/lib/queryClient';

// 인증 관련 함수
export async function testLogin() {
  const response = await apiRequest('POST', '/api/test-login');
  return await response.json();
}

export async function login(username: string, password: string) {
  const response = await apiRequest('POST', '/api/login', { username, password });
  return await response.json();
}

export async function logout() {
  await apiRequest('POST', '/api/logout');
  return true;
}

export async function getCurrentUser() {
  try {
    const response = await apiRequest('GET', '/api/user', null, { on401: 'returnNull' });
    return await response.json();
  } catch (error) {
    return null;
  }
}

// 갤러리 및 미디어 함수
export async function getGalleryItems(filter = '') {
  const url = filter ? `/api/gallery?filter=${encodeURIComponent(filter)}` : '/api/gallery';
  const response = await apiRequest('GET', url);
  return await response.json();
}

export async function transformImage(formData: FormData) {
  const response = await apiRequest('POST', '/api/image/transform', formData);
  return await response.json();
}

export async function getImageList(page = 1, pageSize = 20, filterByUser = true) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (filterByUser === false) {
    params.append('filterByUser', 'false');
  }
  
  const response = await apiRequest('GET', `/api/image/list?${params.toString()}`);
  return await response.json();
}

export async function generateMusic(formData: any) {
  const response = await apiRequest('POST', '/api/music/generate', formData);
  return await response.json();
}

export async function getMusicList(filter = '') {
  const url = filter ? `/api/music?filter=${encodeURIComponent(filter)}` : '/api/music';
  const response = await apiRequest('GET', url);
  return await response.json();
}

export async function shareMedia(mediaId: string, mediaType: string) {
  const response = await apiRequest('POST', '/api/share', { mediaId, mediaType });
  return await response.json();
}

export async function downloadMedia(url: string, filename = '') {
  try {
    const response = await fetch(url, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || url.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Media download error:', error);
    return false;
  }
}

export async function toggleFavorite(itemId: number, type: string) {
  const response = await apiRequest('POST', '/api/gallery/favorite', { itemId, type });
  return await response.json();
}

// 채팅 함수
export async function sendChatMessage(message: string) {
  const response = await apiRequest('POST', '/api/chat/message', { message });
  return await response.json();
}

export async function getChatHistory() {
  const response = await apiRequest('GET', '/api/chat/history');
  return await response.json();
}

export async function saveChat(data: any) {
  const response = await apiRequest('POST', '/api/chat/save', data);
  return await response.json();
}

// 테스트 및 관리자 함수
export async function getActiveAbTest() {
  const response = await apiRequest('GET', '/api/tests/active');
  return await response.json();
}

export async function recordAbTestResult(data: { testId: string; selectedVariantId: string }) {
  const response = await apiRequest('POST', '/api/tests/record-result', data);
  return await response.json();
}

// 페르소나 관리
export async function getPersonas() {
  const response = await apiRequest('GET', '/api/admin/personas');
  return await response.json();
}

export async function createPersona(data: any) {
  const response = await apiRequest('POST', '/api/admin/personas', data);
  return await response.json();
}

export async function updatePersona(id: string, data: any) {
  const response = await apiRequest('PATCH', `/api/admin/personas/${id}`, data);
  return await response.json();
}

export async function deletePersona(id: string) {
  const response = await apiRequest('DELETE', `/api/admin/personas/${id}`);
  return await response.json();
}

export async function batchImportPersonas(data: any) {
  const response = await apiRequest('POST', '/api/admin/personas/batch-import', data);
  return await response.json();
}

// 카테고리 관리
export async function getServiceCategories() {
  const response = await apiRequest('GET', '/api/admin/service-categories');
  return await response.json();
}

export async function createServiceCategory(data: {
  categoryId: string;
  title: string;
  icon: string;
  isPublic: boolean;
  order: number;
}) {
  const response = await apiRequest('POST', '/api/admin/service-categories', data);
  return await response.json();
}

export async function updateServiceCategory(id: number, data: {
  categoryId?: string;
  title?: string;
  icon?: string;
  isPublic?: boolean;
  order?: number;
}) {
  const response = await apiRequest('PATCH', `/api/admin/service-categories/${id}`, data);
  return await response.json();
}

export async function deleteServiceCategory(id: number) {
  const response = await apiRequest('DELETE', `/api/admin/service-categories/${id}`);
  return await response.json();
}

// 언어 관리
export async function getLanguages() {
  const response = await apiRequest('GET', '/api/admin/languages');
  return await response.json();
}

export async function uploadTranslations(formData: FormData) {
  const response = await apiRequest('POST', '/api/admin/translations/upload', formData);
  return await response.json();
}