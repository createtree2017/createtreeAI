import { apiRequest } from "./queryClient";

// Music API endpoints
export const generateMusic = async (params: {
  babyName: string;
  style: string;
  duration: number;
}) => {
  const response = await apiRequest('/api/music/generate', {
    method: 'POST',
    data: params
  });
  return response.json();
};

export const getMusicList = async () => {
  const response = await apiRequest('/api/music');
  return response.json();
};

// Image API endpoints
export const transformImage = async (data: FormData, isAdmin: boolean = false) => {
  // isAdmin 파라미터를 사용하여 관리자 요청인지 표시
  const url = isAdmin ? '/api/image/transform?admin=true' : '/api/image/transform';
  
  const response = await fetch(url, {
    method: 'POST',
    body: data,
    credentials: 'include',
    headers: {
      // 헤더를 통해서도 관리자 요청임을 표시 (URL 파라미터와 함께 중복 보장)
      'X-Admin-Request': isAdmin ? 'true' : 'false'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  
  return response.json();
};

export const getImageList = async (page: number = 1, limit: number = 10) => {
  const response = await apiRequest(`/api/image?page=${page}&limit=${limit}`);
  return response.json();
};

// Chat API endpoints
export const sendChatMessage = async (
  message: string, 
  ephemeral: boolean = false,
  personaSystemPrompt?: string
) => {
  const url = ephemeral 
    ? '/api/chat/message?ephemeral=true'
    : '/api/chat/message';
  
  const payload = personaSystemPrompt 
    ? { message, personaSystemPrompt } 
    : { message };
  
  const response = await apiRequest(url, {
    method: 'POST', 
    data: payload
  });
  return response.json();
};

export const getChatHistory = async () => {
  const response = await apiRequest('/api/chat/history');
  return response.json();
};

// Saved chats API endpoints
export const saveChat = async (chatData: {
  title: string;
  personaId: string;
  personaName: string;
  personaEmoji: string;
  messages: any[];
  summary: string;
  userMemo?: string;
  mood?: string;
}) => {
  const response = await apiRequest('/api/chat/save', {
    method: 'POST',
    data: chatData
  });
  return response.json();
};

export const getSavedChats = async () => {
  const response = await apiRequest('/api/chat/saved');
  return response.json();
};

export const getSavedChat = async (id: number) => {
  const response = await apiRequest(`/api/chat/saved/${id}`);
  return response.json();
};

export const deleteSavedChat = async (id: number) => {
  const response = await apiRequest(`/api/chat/saved/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

// Gallery API endpoints
export const getGalleryItems = async (filter?: string) => {
  const url = filter && filter !== 'all' 
    ? `/api/gallery?filter=${filter}` 
    : '/api/gallery';
  
  const response = await apiRequest(url);
  return response.json();
};

export const toggleFavorite = async (itemId: number, type: string) => {
  const response = await apiRequest('/api/gallery/favorite', {
    method: 'POST',
    data: { itemId, type }
  });
  return response.json();
};

// Media management endpoints
export const downloadMedia = async (id: number, type: string) => {
  try {
    console.log(`미디어 다운로드 요청 - ID: ${id}, 타입: ${type}`);
    
    // 1. 먼저 서버에 이미지 데이터 요청
    const downloadUrl = `/api/media/download/${type}/${id}`;
    
    // 2. 데이터 요청 및 다운로드 처리
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
    }
    
    // 3. 응답 형식에 따른 처리
    const contentType = response.headers.get('content-type');
    
    // JSON 응답인 경우 - 외부 URL 열기
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.url) {
        // 외부 URL 새 창에서 열기
        window.open(data.url, '_blank');
        return { success: true };
      } else {
        throw new Error('유효한 다운로드 URL이 없습니다');
      }
    } 
    // 이미지/오디오 데이터인 경우 - 파일로 저장
    else {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // 다운로드 링크 생성 및 클릭
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // 파일명 설정
      let filename = '';
      const disposition = response.headers.get('content-disposition');
      
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
        filename = decodeURIComponent(filename);
      } else {
        filename = `download-${type}-${id}.${type === 'image' ? 'jpg' : 'mp3'}`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // 정리
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      return { success: true, filename };
    }
  } catch (error) {
    console.error('미디어 다운로드 오류:', error);
    throw error;
  }
};

export const shareMedia = async (id: number, type: string) => {
  try {
    console.log(`공유 요청: ID ${id}, 타입 ${type}`);
    
    // 직접 fetch API 사용
    const response = await fetch('/api/media/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, type }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('미디어 공유 실패:', response.status, errorText);
      throw new Error(errorText || response.statusText);
    }
    
    const result = await response.json();
    console.log('공유 응답:', result);
    
    // 공유 URL이 있는지 확인
    if (result.shareUrl) {
      try {
        // 클립보드에 복사
        await navigator.clipboard.writeText(result.shareUrl);
        console.log('URL이 클립보드에 복사되었습니다.');
        
        // 클립보드 복사 성공 플래그 추가
        result.clipboardCopySuccess = true;
      } catch (clipboardError) {
        console.error('클립보드 복사 실패:', clipboardError);
        // 클립보드 복사 실패 처리 - UI에는 수동으로 복사할 수 있도록 URL은 표시
        result.clipboardCopySuccess = false;
        result.clipboardErrorMessage = clipboardError instanceof Error 
          ? clipboardError.message 
          : '클립보드에 복사할 수 없습니다. 직접 URL을 복사해주세요.';
      }
    } else {
      console.error('서버에서 공유 URL을 반환하지 않았습니다.', result);
      result.error = '서버에서 공유 URL을 생성하지 못했습니다.';
    }
    
    return result;
  } catch (error) {
    console.error('API error during sharing:', error);
    
    // 더 자세한 오류 정보 제공
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      error: '미디어 공유 중 오류가 발생했습니다.',
      details: errorMessage,
      shareUrl: null,
      clipboardCopySuccess: false
    };
  }
};

// ===== Persona Management APIs =====

// Get all personas
export const getPersonas = async () => {
  const response = await apiRequest('/api/admin/personas');
  return response.json();
};

// Get a specific persona
export const getPersona = async (id: string) => {
  const response = await apiRequest(`/api/admin/personas/${id}`);
  return response.json();
};

// Create a new persona
export const createPersona = async (personaData: any) => {
  const response = await apiRequest('/api/admin/personas', {
    method: 'POST',
    data: personaData
  });
  return response.json();
};

// Update an existing persona
export const updatePersona = async (id: string, personaData: any) => {
  const response = await apiRequest(`/api/admin/personas/${id}`, {
    method: 'PUT',
    data: personaData
  });
  return response.json();
};

// Delete a persona
export const deletePersona = async (id: string) => {
  const response = await apiRequest(`/api/admin/personas/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

// Batch import personas
export const batchImportPersonas = async (personaList: any[]) => {
  const response = await apiRequest('/api/admin/personas/batch', {
    method: 'POST',
    data: personaList
  });
  return response.json();
};

// Track persona usage
export const incrementPersonaUse = async (id: string) => {
  const response = await apiRequest(`/api/personas/${id}/use`, {
    method: 'POST'
  });
  return response.json();
};

// Get persona recommendations
export const getPersonaRecommendations = async (params?: {
  timeOfDay?: string;
  emotions?: string[];
}) => {
  let url = '/api/personas/recommend';
  
  if (params) {
    const queryParams = [];
    if (params.timeOfDay) {
      queryParams.push(`timeOfDay=${params.timeOfDay}`);
    }
    if (params.emotions && params.emotions.length > 0) {
      queryParams.push(`emotions=${params.emotions.join(',')}`);
    }
    
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
  }
  
  const response = await apiRequest(url);
  return response.json();
};

// ===== Category Management APIs =====

// Get all categories
export const getCategories = async () => {
  const response = await apiRequest('/api/admin/categories');
  return response.json();
};

// Get a specific category
export const getCategory = async (id: string) => {
  const response = await apiRequest(`/api/admin/categories/${id}`);
  return response.json();
};

// Create a new category
export const createCategory = async (categoryData: any) => {
  const response = await apiRequest('/api/admin/categories', {
    method: 'POST',
    data: categoryData
  });
  return response.json();
};

// Update an existing category
export const updateCategory = async (id: string, categoryData: any) => {
  const response = await apiRequest(`/api/admin/categories/${id}`, {
    method: 'PUT',
    data: categoryData
  });
  return response.json();
};

// Delete a category
export const deleteCategory = async (id: string) => {
  const response = await apiRequest(`/api/admin/categories/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

// ===== Concept Management APIs =====

// Get all concept categories
export const getConceptCategories = async () => {
  const response = await apiRequest('/api/admin/concept-categories');
  return response.json();
};

// Get a specific concept category
export const getConceptCategory = async (id: string) => {
  const response = await apiRequest(`/api/admin/concept-categories/${id}`);
  return response.json();
};

// Create a new concept category
export const createConceptCategory = async (categoryData: any) => {
  const response = await apiRequest('/api/admin/concept-categories', {
    method: 'POST',
    data: categoryData
  });
  return response.json();
};

// Update an existing concept category
export const updateConceptCategory = async (id: string, categoryData: any) => {
  const response = await apiRequest(`/api/admin/concept-categories/${id}`, {
    method: 'PUT',
    data: categoryData
  });
  return response.json();
};

// Delete a concept category
export const deleteConceptCategory = async (id: string) => {
  const response = await apiRequest(`/api/admin/concept-categories/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

// Get all concepts
export const getConcepts = async () => {
  const response = await apiRequest('/api/admin/concepts');
  return response.json();
};

// Get a specific concept
export const getConcept = async (id: string) => {
  const response = await apiRequest(`/api/admin/concepts/${id}`);
  return response.json();
};

// Create a new concept
export const createConcept = async (conceptData: any) => {
  const response = await apiRequest('/api/admin/concepts', {
    method: 'POST',
    data: conceptData
  });
  return response.json();
};

// Update an existing concept
export const updateConcept = async (id: string, conceptData: any) => {
  const response = await apiRequest(`/api/admin/concepts/${id}`, {
    method: 'PUT',
    data: conceptData
  });
  return response.json();
};

// Delete a concept
export const deleteConcept = async (id: string) => {
  const response = await apiRequest(`/api/admin/concepts/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

// ===== Internationalization (i18n) APIs =====

// Get list of available languages
export const getLanguages = async () => {
  const response = await apiRequest('/api/languages');
  return response.json();
};

// Upload translations for a specific language
export const uploadTranslations = async (lang: string, translations: Record<string, string>) => {
  const response = await apiRequest(`/api/languages/${lang}`, {
    method: 'POST',
    data: translations
  });
  return response.json();
};

// ===== Thumbnail Upload API =====

// Upload a thumbnail for a concept
export const uploadThumbnail = async (file: File) => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  
  const response = await fetch('/api/admin/upload/thumbnail', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  
  const result = await response.json();
  
  // Log the result to see what's being returned
  console.log('Thumbnail upload response:', result);
  
  return result;
};

// ===== A/B Testing APIs =====

// Get all A/B tests
export const getAbTests = async () => {
  const response = await apiRequest('/api/admin/abtests');
  return response.json();
};

// Get a specific A/B test with its variants
export const getAbTest = async (testId: string) => {
  const response = await apiRequest(`/api/admin/abtests/${testId}`);
  return response.json();
};

// Get active A/B test for a concept
export const getActiveAbTest = async (conceptId: string) => {
  const response = await apiRequest(`/api/abtests/active/${conceptId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // No active A/B test for this concept
    }
    throw new Error("Failed to fetch active A/B test");
  }
  
  return response.json();
};

// Create a new A/B test
export const createAbTest = async (testData: {
  testId: string;
  name: string;
  description?: string;
  conceptId: string;
  isActive: boolean;
  variants: Array<{
    variantId: string;
    name: string;
    promptTemplate: string;
    variables?: Array<any>;
  }>;
}) => {
  const response = await apiRequest('/api/admin/abtests', {
    method: 'POST',
    data: testData
  });
  return response.json();
};

// Record an A/B test result
export const recordAbTestResult = async (resultData: {
  testId: string;
  selectedVariantId: string;
  userId?: number;
  context?: Record<string, any>;
}) => {
  const response = await apiRequest('/api/abtests/result', {
    method: 'POST',
    data: resultData
  });
  return response.json();
};

// Service Categories API endpoints
export const getServiceCategories = async () => {
  console.log('Fetching service categories from /api/service-categories');
  const response = await apiRequest('/api/service-categories');
  const data = await response.json();
  console.log('Received service categories:', data);
  return data;
};

export const createServiceCategory = async (categoryData: {
  categoryId: string;
  title: string;
  isPublic: boolean;
  icon: string;
  order?: number;
}) => {
  const response = await apiRequest('/api/admin/service-categories', {
    method: 'POST',
    data: categoryData
  });
  return response.json();
};

export const updateServiceCategory = async (id: number, categoryData: {
  categoryId: string;
  title: string;
  isPublic: boolean;
  icon: string;
  order?: number;
}) => {
  const response = await apiRequest(`/api/admin/service-categories/${id}`, {
    method: 'PUT',
    data: categoryData
  });
  return response.json();
};

export const deleteServiceCategory = async (id: number) => {
  const response = await apiRequest(`/api/admin/service-categories/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};
