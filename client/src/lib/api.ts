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
export const downloadMedia = (id: number, type: string) => {
  window.open(`/api/media/download/${type}/${id}`, '_blank');
};

export const shareMedia = async (id: number, type: string) => {
  const response = await apiRequest('POST', '/api/media/share', { id, type });
  return response.json();
};
