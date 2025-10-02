import { useQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board';

// Query keys
export const boardKeys = {
  all: ['board'] as const,
  daily: () => [...boardKeys.all, 'daily'] as const,
};

export const useBoard = () => {
  const query = useQuery({
    queryKey: boardKeys.daily(),
    queryFn: boardApi.getBoard,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (daily board)
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
  });

  return {
    boards: query.data?.boards,
    board: query.data?.boards?.[0], // First board is the initial board
    seed: query.data?.seed,
    day: query.data?.day,
    timerDuration: query.data?.timer_duration,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
