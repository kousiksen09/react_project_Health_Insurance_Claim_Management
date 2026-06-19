import { API_BASE_URL } from './constants';

/**
 * Constructs the full URL for uploaded files
 * @param filePath - The file path returned from the backend (e.g., "/uploads/profiles/profile_1_guid.jpg")
 * @returns Full URL to access the file
 */
export const getFileUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;
  
  // If the path already includes the protocol, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Extract base URL without /api path
  const baseUrl = API_BASE_URL.replace('/api', '');
  
  // Ensure the file path starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Gets the profile image URL for a user
 * @param profileImageUrl - The profile image URL from the backend
 * @returns Full URL to the profile image or null if no image
 */
export const getProfileImageUrl = (profileImageUrl: string | null | undefined): string | null => {
  return getFileUrl(profileImageUrl);
};

/**
 * Gets the document URL for claim documents
 * @param documentPath - The document path from the backend
 * @returns Full URL to the document or null if no document
 */
export const getDocumentUrl = (documentPath: string | null | undefined): string | null => {
  return getFileUrl(documentPath);
};