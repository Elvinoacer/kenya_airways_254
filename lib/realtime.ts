/**
 * Simple realtime client that connects to a standalone Socket.IO server (optional).
 * If `SOCKET_SERVER_URL` is set, lib will attempt to connect via socket.io-client
 * and provide helper emit functions for seat/booking/notification events.
 */
type SocketLike =
  | {
      on?: (ev: string, cb: (...args: any[]) => void) => void;
      emit?: (ev: string, payload: any) => void;
      id?: string;
    }
  | any;

let socket: SocketLike | null = null;

export async function connectToSocketServer() {
  if (socket || !process.env.SOCKET_SERVER_URL) return socket;
  try {
    // optional dependency - use runtime require to avoid bundler issues
    // eslint-disable-next-line no-eval
    const mod = eval("require")("socket.io-client");
    const ioClient = (mod && mod.default) || mod;
    if (!ioClient) throw new Error("socket.io-client not installed");
    // initialize
    // @ts-ignore
    socket = ioClient(process.env.SOCKET_SERVER_URL as string, {
      reconnection: true,
      transports: ["websocket", "polling"],
    });
    socket.on?.("connect", () => {
      console.log("realtime: connected to socket server", (socket as any).id);
    });
    socket.on?.("connect_error", (e: unknown) => {
      console.warn("realtime: connect_error", String(e));
    });
    return socket;
  } catch (err) {
    console.warn(
      "realtime: socket.io-client not installed or failed to load",
      String(err),
    );
    socket = null;
    return null;
  }
}

async function emit(event: string, payload: any) {
  if (!process.env.SOCKET_SERVER_URL) return false;
  const s = socket || (await connectToSocketServer());
  if (!s) return false;
  try {
    s.emit(event, payload);
    return true;
  } catch (e) {
    console.warn("realtime emit failed", e);
    return false;
  }
}

export const emitSeatUpdate = (flightId: string, details?: any) =>
  emit("seat_update", { flightId, details });

export const emitBookingChange = (bookingId: string, details?: any) =>
  emit("booking_change", { bookingId, details });

export const emitNotification = (userId: string, payload?: any) =>
  emit("notification", { userId, payload });

export const emitFlightStatus = (
  scheduleId: string,
  status: string,
  details?: any,
) => emit("flight_status", { scheduleId, status, details });

export const emitAssignmentUpdate = (assignmentId: string, details?: any) =>
  emit("assignment_update", { assignmentId, details });

export const setPresence = (userId: string, status: string) =>
  emit("presence", { userId, status });

export default {
  connectToSocketServer,
  emitSeatUpdate,
  emitBookingChange,
  emitNotification,
  emitFlightStatus,
  emitAssignmentUpdate,
  setPresence,
};
