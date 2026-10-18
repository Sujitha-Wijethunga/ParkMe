/**
 * Socket.io Real-Time Sync Service (Frontend)
 *
 * Connects to the ParkMe backend Socket.io server to receive real-time
 * space status updates, so the floor map updates without pull-to-refresh.
 *
 * Graceful degradation: if socket.io-client is not installed, all methods
 * are no-ops and the app continues to work with polling.
 */
import { API_BASE_URL } from '../constants/api';

type SpaceUpdatePayload = {
  spaceId: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  lotId: string;
  spaceNumber?: string;
};

type SpaceUpdateCallback = (payload: SpaceUpdatePayload) => void;
type LotCountUpdatePayload = { lotId: string; availableSpaces: number; totalSpaces: number };
type LotCountCallback = (payload: LotCountUpdatePayload) => void;

let io: any = null;
try {
  io = require('socket.io-client');
  // CJS default export compatibility
  if (io && io.default) io = io.default;
} catch {
  io = null;
}

class ParkMeSocketService {
  private socket: any = null;
  private currentLotId: string | null = null;
  private spaceUpdateCallbacks: SpaceUpdateCallback[] = [];
  private lotCountCallbacks: LotCountCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;

  get isConnected(): boolean {
    return this.socket?.connected === true;
  }

  /**
   * Connect to the Socket.io server and join a lot room.
   */
  connect(lotId?: string): void {
    if (!io) {
      console.log('[Socket] socket.io-client not available (requires dev build or npm install)');
      return;
    }

    // Reuse existing connection if already in the right room
    if (this.socket?.connected && this.currentLotId === lotId) return;

    this.isIntentionalDisconnect = false;

    // Derive WS URL from API_BASE_URL (replace https:// with wss://, http:// with ws://)
    const wsUrl = API_BASE_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');

    this.socket = io(wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      if (lotId) {
        this.currentLotId = lotId;
        this.socket.emit('join_lot', lotId);
      }
    });

    // space_update: emitted by backend when a space status changes
    this.socket.on('space_update', (payload: SpaceUpdatePayload) => {
      for (const cb of this.spaceUpdateCallbacks) cb(payload);
    });

    // lot_count_update: emitted when available spaces count changes
    this.socket.on('lot_count_update', (payload: LotCountUpdatePayload) => {
      for (const cb of this.lotCountCallbacks) cb(payload);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  /**
   * Switch to a different lot room without full reconnect.
   */
  joinLot(lotId: string): void {
    if (!this.socket?.connected) {
      this.connect(lotId);
      return;
    }
    if (this.currentLotId === lotId) return;
    this.currentLotId = lotId;
    this.socket.emit('join_lot', lotId);
  }

  /**
   * Register a callback for space status updates.
   * Returns an unsubscribe function.
   */
  onSpaceUpdate(callback: SpaceUpdateCallback): () => void {
    this.spaceUpdateCallbacks.push(callback);
    return () => {
      this.spaceUpdateCallbacks = this.spaceUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Register a callback for lot available count updates.
   * Returns an unsubscribe function.
   */
  onLotCountUpdate(callback: LotCountCallback): () => void {
    this.lotCountCallbacks.push(callback);
    return () => {
      this.lotCountCallbacks = this.lotCountCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Disconnect cleanly.
   */
  disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.disconnect();
    this.socket = null;
    this.currentLotId = null;
  }
}

// Singleton service instance
export const socketService = new ParkMeSocketService();
