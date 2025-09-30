import { API_BASE_URL } from '../config';

export const dictionaryApi = {
  getVersion: async (): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/dictionary-version`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch dictionary version: ${response.statusText}`
      );
    }
    return response.json();
  },

  getDictionary: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/dictionary`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dictionary: ${response.statusText}`);
    }
    return response.json();
  },
};
