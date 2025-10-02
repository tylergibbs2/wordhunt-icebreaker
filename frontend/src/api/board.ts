import { API_BASE_URL } from '../config';

export interface BoardResponse {
  boards: {
    grid: string[][];
  }[];
  seed: number;
  day: string;
  timer_duration: number;
}

export const boardApi = {
  getBoard: async (): Promise<BoardResponse> => {
    const response = await fetch(`${API_BASE_URL}/board`);
    if (!response.ok) {
      throw new Error(`Failed to fetch board: ${response.statusText}`);
    }
    return response.json();
  },
};
