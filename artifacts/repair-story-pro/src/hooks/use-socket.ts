import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getListBookingsQueryKey, getListMyBookingsQueryKey, getGetBookingQueryKey } from "@workspace/api-client-react";

export function useSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the same host
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("booking:update", (data: { bookingId: number; newStatus: string }) => {
      // Invalidate relevant queries when a booking updates
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
      if (data.bookingId) {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(data.bookingId) });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return socketRef.current;
}
