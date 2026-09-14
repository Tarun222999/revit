import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type PropsWithChildren } from 'react';

import { createQueryClient } from '@/lib/query/client';
import { configureOnlineManager } from '@/lib/query/network';

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => configureOnlineManager(), []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
