"use client";

import { type PropsWithChildren } from "react";
import {
  QueryClient,
  QueryClientProvider as Provider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Initialize the client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes
      refetchOnWindowFocus: false, // Turn off automatic refetching on tab switch
    },
  },
});

const QueryClientProvider = ({ children }: PropsWithChildren) => {
  return (
    <Provider client={queryClient}>
      {children}
      {/* DevTools automatically hide in production builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </Provider>
  );
};

export default QueryClientProvider;
