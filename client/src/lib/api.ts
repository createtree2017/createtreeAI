// API 클라이언트 함수 내보내기
import { 
  api as apiClient,
  queryClient,
  apiRequest,
  fetchApi,
  getApi,
  postApi,
  putApi,
  patchApi,
  deleteApi,
  getQueryFn
} from './apiClient';

// API 함수들을 명시적으로 내보내기
export const getGalleryItems = apiClient.getGalleryItems;
export const transformImage = apiClient.transformImage;
export const uploadThumbnail = apiClient.uploadThumbnail;
export const getImageList = apiClient.getImageList;
export const generateMusic = apiClient.generateMusic;
export const getMusicList = apiClient.getMusicList;
export const shareMedia = apiClient.shareMedia;
export const toggleFavorite = apiClient.toggleFavorite;
export const sendChatMessage = apiClient.sendChatMessage;
export const getChatHistory = apiClient.getChatHistory;
export const saveChat = apiClient.saveChat;
export const testLogin = apiClient.testLogin;
export const login = apiClient.login;
export const logout = apiClient.logout;
export const getCurrentUser = apiClient.getCurrentUser;
export const downloadMedia = apiClient.downloadMedia;

// 나머지 API 함수들
export const getActiveAbTest = apiClient.getActiveAbTest;
export const getAbTests = apiClient.getAbTests;
export const getAbTest = apiClient.getAbTest;
export const createAbTest = apiClient.createAbTest;
export const recordAbTestResult = apiClient.recordAbTestResult;
export const getPersonas = apiClient.getPersonas;
export const createPersona = apiClient.createPersona; 
export const updatePersona = apiClient.updatePersona;
export const deletePersona = apiClient.deletePersona;
export const batchImportPersonas = apiClient.batchImportPersonas;
export const getServiceCategories = apiClient.getServiceCategories;
export const createServiceCategory = apiClient.createServiceCategory;
export const updateServiceCategory = apiClient.updateServiceCategory;
export const deleteServiceCategory = apiClient.deleteServiceCategory;
export const getLanguages = apiClient.getLanguages;
export const uploadTranslations = apiClient.uploadTranslations;

// 헬퍼 함수들도 내보내기
export {
  queryClient,
  apiRequest,
  fetchApi,
  getApi,
  postApi,
  putApi,
  patchApi,
  deleteApi,
  getQueryFn
};

// 기본 내보내기도 제공 (기존 호환성 유지)
export default apiClient;