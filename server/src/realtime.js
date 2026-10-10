import { Server } from 'socket.io';
import { userFromToken } from './auth.js';

let io = null;

export function attachRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const user = userFromToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('UNAUTHORIZED'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(`user:${user.id}`);
    console.log(`[realtime] ${user.display_name} connected`);
    socket.on('disconnect', () => console.log(`[realtime] ${user.display_name} disconnected`));
  });
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}
