import { apiRequest } from "./queryClient";

// Music API endpoints
export const generateMusic = async (params: {
  babyName: string;
  style: string;
  duration: number;
}) => {
  const response = await apiRequest('POST', '/api/music/generate', params);
  return response.json();
};

export const getMusicList = async () => {
  const response = await apiRequest('GET', '/api/music');
  return response.json();
};

// Image API endpoints
export const transformImage = async (data: FormData) => {
  const response = await fetch('/api/image/transform', {
    method: 'POST',
    body: data,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  
  return response.json();
};

export const getImageList = async () => {
  const response = await apiRequest('GET', '/api/image');
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
  
  const response = await apiRequest('POST', url, payload);
  return response.json();
};

export const getChatHistory = async () => {
  const response = await apiRequest('GET', '/api/chat/history');
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
  const response = await apiRequest('POST', '/api/chat/save', chatData);
  return response.json();
};

export const getSavedChats = async () => {
  const response = await apiRequest('GET', '/api/chat/saved');
  return response.json();
};

export const getSavedChat = async (id: number) => {
  const response = await apiRequest('GET', `/api/chat/saved/${id}`);
  return response.json();
};

export const deleteSavedChat = async (id: number) => {
  const response = await apiRequest('DELETE', `/api/chat/saved/${id}`);
  return response.json();
};

// Gallery API endpoints
export const getGalleryItems = async (filter?: string) => {
  const url = filter && filter !== 'all' 
    ? `/api/gallery?filter=${filter}` 
    : '/api/gallery';
  
  const response = await apiRequest('GET', url);
  return response.json();
};

export const toggleFavorite = async (itemId: number, type: string) => {
  const response = await apiRequest('POST', '/api/gallery/favorite', { 
    itemId, 
    type 
  });
  return response.json();
};

// Media management endpoints
export const downloadMedia = async (id: number, type: string) => {
  try {
    const downloadUrl = `/api/media/download/${type}/${id}`;
    
    // Create an invisible link element
    const link = document.createElement('a');
    
    // Set the link's href to the download endpoint
    link.href = downloadUrl;
    
    // Make the browser download the file (the server will set Content-Disposition)
    link.setAttribute('download', '');
    
    // Set to open in current window to avoid popup blockers
    link.target = '_self';
    
    // Add the link to the document
    document.body.appendChild(link);
    
    // Trigger a click on the link
    link.click();
    
    // Give the browser a moment to process the download
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Remove the link from the document
    document.body.removeChild(link);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading media:', error);
    // Fallback to the simple redirect if the programmatic download fails
    window.location.href = `/api/media/download/${type}/${id}`;
    throw error;
  }
};

export const shareMedia = async (id: number, type: string) => {
  const response = await apiRequest('POST', '/api/media/share', { id, type });
  return response.json();
};

// ===== Persona Management APIs =====

// Get all personas
export const getPersonas = async () => {
  const response = await apiRequest('GET', '/api/admin/personas');
  return response.json();
};

// Get a specific persona
export const getPersona = async (id: string) => {
  const response = await apiRequest('GET', `/api/admin/personas/${id}`);
  return response.json();
};

// Create a new persona
export const createPersona = async (personaData: any) => {
  const response = await apiRequest('POST', '/api/admin/personas', personaData);
  return response.json();
};

// Update an existing persona
export const updatePersona = async (id: string, personaData: any) => {
  const response = await apiRequest('PUT', `/api/admin/personas/${id}`, personaData);
  return response.json();
};

// Delete a persona
export const deletePersona = async (id: string) => {
  const response = await apiRequest('DELETE', `/api/admin/personas/${id}`);
  return response.json();
};

// Batch import personas
export const batchImportPersonas = async (personaList: any[]) => {
  const response = await apiRequest('POST', '/api/admin/personas/batch', personaList);
  return response.json();
};

// Track persona usage
export const incrementPersonaUse = async (id: string) => {
  const response = await apiRequest('POST', `/api/personas/${id}/use`);
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
  
  const response = await apiRequest('GET', url);
  return response.json();
};

// ===== Category Management APIs =====

// Get all categories
export const getCategories = async () => {
  const response = await apiRequest('GET', '/api/admin/categories');
  return response.json();
};

// Get a specific category
export const getCategory = async (id: string) => {
  const response = await apiRequest('GET', `/api/admin/categories/${id}`);
  return response.json();
};

// Create a new category
export const createCategory = async (categoryData: any) => {
  const response = await apiRequest('POST', '/api/admin/categories', categoryData);
  return response.json();
};

// Update an existing category
export const updateCategory = async (id: string, categoryData: any) => {
  const response = await apiRequest('PUT', `/api/admin/categories/${id}`, categoryData);
  return response.json();
};

// Delete a category
export const deleteCategory = async (id: string) => {
  const response = await apiRequest('DELETE', `/api/admin/categories/${id}`);
  return response.json();
};

// ===== Concept Management APIs =====

// Get all concept categories
export const getConceptCategories = async () => {
  const response = await apiRequest('GET', '/api/admin/concept-categories');
  return response.json();
};

// Get a specific concept category
export const getConceptCategory = async (id: string) => {
  const response = await apiRequest('GET', `/api/admin/concept-categories/${id}`);
  return response.json();
};

// Create a new concept category
export const createConceptCategory = async (categoryData: any) => {
  const response = await apiRequest('POST', '/api/admin/concept-categories', categoryData);
  return response.json();
};

// Update an existing concept category
export const updateConceptCategory = async (id: string, categoryData: any) => {
  const response = await apiRequest('PUT', `/api/admin/concept-categories/${id}`, categoryData);
  return response.json();
};

// Delete a concept category
export const deleteConceptCategory = async (id: string) => {
  const response = await apiRequest('DELETE', `/api/admin/concept-categories/${id}`);
  return response.json();
};

// Get all concepts
export const getConcepts = async () => {
  const response = await apiRequest('GET', '/api/admin/concepts');
  return response.json();
};

// Get a specific concept
export const getConcept = async (id: string) => {
  const response = await apiRequest('GET', `/api/admin/concepts/${id}`);
  return response.json();
};

// Create a new concept
export const createConcept = async (conceptData: any) => {
  const response = await apiRequest('POST', '/api/admin/concepts', conceptData);
  return response.json();
};

// Update an existing concept
export const updateConcept = async (id: string, conceptData: any) => {
  const response = await apiRequest('PUT', `/api/admin/concepts/${id}`, conceptData);
  return response.json();
};

// Delete a concept
export const deleteConcept = async (id: string) => {
  const response = await apiRequest('DELETE', `/api/admin/concepts/${id}`);
  return response.json();
};

// ===== Internationalization (i18n) APIs =====

// Get list of available languages
export const getLanguages = async () => {
  const response = await apiRequest('GET', '/api/languages');
  return response.json();
};

// Upload translations for a specific language
export const uploadTranslations = async (lang: string, translations: Record<string, string>) => {
  const response = await apiRequest('POST', `/api/languages/${lang}`, translations);
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
  
  return response.json();
};

// ===== A/B Testing APIs =====

// Get all A/B tests
export const getAbTests = async () => {
  const response = await apiRequest('GET', '/api/admin/abtests');
  return response.json();
};

// Get a specific A/B test with its variants
export const getAbTest = async (testId: string) => {
  const response = await apiRequest('GET', `/api/admin/abtests/${testId}`);
  return response.json();
};

// Get active A/B test for a concept
export const getActiveAbTest = async (conceptId: string) => {
  const response = await apiRequest('GET', `/api/abtests/active/${conceptId}`);
  
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
  const response = await apiRequest('POST', '/api/admin/abtests', testData);
  return response.json();
};

// Record an A/B test result
export const recordAbTestResult = async (resultData: {
  testId: string;
  selectedVariantId: string;
  userId?: number;
  context?: Record<string, any>;
}) => {
  const response = await apiRequest('POST', '/api/abtests/result', resultData);
  return response.json();
};
