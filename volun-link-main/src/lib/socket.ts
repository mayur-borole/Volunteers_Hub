import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;

export const getSocket = () => {
  if (socketInstance) {
    return socketInstance;
  }

  const token = localStorage.getItem('helpinghands-token');

  socketInstance = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      token: token || ''
    }
  });

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = localStorage.getItem('helpinghands-token') || '';
  socket.auth = { token };

  if (!socket.connected && token) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  const socket = getSocket();
  if (socket.connected) {
    socket.disconnect();
  }
};
