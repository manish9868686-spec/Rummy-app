/**
 * Classic Indian Rummy — API & WebSocket Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io } from 'socket.io-client';

// Config — change to your production URL
const API_BASE = __DEV__ ? 'http://192.168.1.100:3000/api/v1' : 'https://api.rummyclassic.com/api/v1';
const WS_BASE = __DEV__ ? 'ws://192.168.1.100:3000' : 'wss://api.rummyclassic.com';

// ─── Axios Instance ────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
        await AsyncStorage.setItem('access_token', data.tokens.access);
        await AsyncStorage.setItem('refresh_token', data.tokens.refresh);

        processQueue(null, data.tokens.access);
        originalRequest.headers.Authorization = `Bearer ${data.tokens.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        // Will cause navigation to login screen via store
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── API Methods ───────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  getMe: () => api.get('/auth/me'),
};

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.patch('/users/me', data),
  getStats: () => api.get('/users/me/stats'),
  search: (q) => api.get('/users/search', { params: { q, limit: 20 } }),
};

export const friendsAPI = {
  list: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  sendRequest: (friend_id) => api.post('/friends/request', { friend_id }),
  accept: (id) => api.patch(`/friends/${id}/accept`),
  reject: (id) => api.patch(`/friends/${id}/reject`),
  remove: (id) => api.delete(`/friends/${id}`),
};

export const tablesAPI = {
  list: (params) => api.get('/tables', { params }),
  create: (data) => api.post('/tables', data),
  get: (id) => api.get(`/tables/${id}`),
  joinByCode: (code) => api.post('/tables/join-by-code', { table_code: code }),
};

export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
  getMyRank: () => api.get('/leaderboard/me'),
  getFriends: () => api.get('/leaderboard/friends'),
};

export const achievementsAPI = {
  list: () => api.get('/achievements'),
  claim: (code) => api.post(`/achievements/${code}/claim`),
};

export const dailyRewardsAPI = {
  status: () => api.get('/daily-rewards/status'),
  claim: () => api.post('/daily-rewards/claim'),
};

export const gamesAPI = {
  history: (params) => api.get('/games/history', { params }),
  replay: (id) => api.get(`/games/${id}/replay`),
};

// ─── WebSocket Manager ─────────────────────────────────────

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  async connect() {
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;

    return new Promise((resolve, reject) => {
      this.socket = io(WS_BASE, {
        query: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        reject(err);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
      });

      // Re-register all listeners on reconnect
      this.socket.on('connect', () => {
        for (const [event, callbacks] of this.listeners) {
          for (const cb of callbacks) {
            this.socket.on(event, cb);
          }
        }
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.listeners.clear();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  get connected() {
    return this.isConnected;
  }
}

export const socketManager = new SocketManager();
export default api;
