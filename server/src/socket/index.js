const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');

const onlineUsers = new Map();
const roomOnlineUsers = new Map();

function getOnlineUsersInRoom(roomId) {
  const userIds = roomOnlineUsers.get(roomId) || new Set();
  const users = [];
  userIds.forEach(userId => {
    const userInfo = onlineUsers.get(userId);
    if (userInfo) users.push(userInfo);
  });
  return users;
}

function addUserToRoom(userId, roomId, socketId) {
  if (!roomOnlineUsers.has(roomId)) {
    roomOnlineUsers.set(roomId, new Set());
  }
  roomOnlineUsers.get(roomId).add(userId);
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, {
      id: '',
      nickname: '',
      avatar: '',
      socketIds: new Set()
    });
  }
  const userInfo = onlineUsers.get(userId);
  userInfo.socketIds.add(socketId);
}

function removeUserFromRoom(userId, roomId, socketId) {
  const roomUsers = roomOnlineUsers.get(roomId);
  if (roomUsers) {
    const userInfo = onlineUsers.get(userId);
    if (userInfo) {
      userInfo.socketIds.delete(socketId);
      if (userInfo.socketIds.size === 0) {
        roomUsers.delete(userId);
      }
    }
  }
}

function removeUserSocket(userId, socketId) {
  const userInfo = onlineUsers.get(userId);
  if (!userInfo) return [];
  userInfo.socketIds.delete(socketId);
  const leftRooms = [];
  if (userInfo.socketIds.size === 0) {
    roomOnlineUsers.forEach((userSet, roomId) => {
      if (userSet.has(userId)) {
        userSet.delete(userId);
        leftRooms.push(roomId);
      }
    });
    onlineUsers.delete(userId);
  }
  return leftRooms;
}

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    const user = socket.user;
    onlineUsers.set(user.id, {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      socketIds: new Set([socket.id])
    });
    User.updateLastOnline(user.id);

    socket.on('join_room', async ({ roomId, lastReadAt = 0 }) => {
      const isMember = await Room.isMember(roomId, user.id);
      if (!isMember) {
        socket.emit('error', { message: '不是房间成员' });
        return;
      }
      socket.join(roomId);
      addUserToRoom(user.id, roomId, socket.id);

      const onlineList = getOnlineUsersInRoom(roomId);
      io.to(roomId).emit('user_online', {
        user: { id: user.id, nickname: user.nickname, avatar: user.avatar },
        onlineUsers: onlineList
      });

      socket.emit('joined_room', {
        roomId,
        onlineUsers: onlineList
      });
    });

    socket.on('leave_room', ({ roomId }) => {
      socket.leave(roomId);
      removeUserFromRoom(user.id, roomId, socket.id);
      const onlineList = getOnlineUsersInRoom(roomId);
      io.to(roomId).emit('user_offline', {
        userId: user.id,
        onlineUsers: onlineList
      });
    });

    socket.on('send_message', async ({ roomId, type = 'text', content, fileName = '', fileSize = 0, mentions = [] }, callback) => {
      try {
        const isMember = await Room.isMember(roomId, user.id);
        if (!isMember) {
          callback && callback({ success: false, error: '不是房间成员' });
          return;
        }
        if (!content && type === 'text') {
          callback && callback({ success: false, error: '消息内容不能为空' });
          return;
        }
        const message = await Message.create(roomId, user.id, type, content, fileName, fileSize, mentions);
        io.to(roomId).emit('new_message', message);

        if (mentions && mentions.length > 0) {
          mentions.forEach(mentionedUserId => {
            const mentionedUserInfo = onlineUsers.get(mentionedUserId);
            if (mentionedUserInfo) {
              mentionedUserInfo.socketIds.forEach(sid => {
                io.to(sid).emit('mention_notification', {
                  message,
                  roomId,
                  mentionedBy: { id: user.id, nickname: user.nickname, avatar: user.avatar }
                });
              });
            }
          });
        }

        callback && callback({ success: true, message });
      } catch (e) {
        console.error(e);
        callback && callback({ success: false, error: '发送失败' });
      }
    });

    socket.on('recall_message', async ({ messageId, roomId }, callback) => {
      try {
        const result = await Message.recall(messageId, user.id);
        if (!result.success) {
          callback && callback({ success: false, error: result.message });
          return;
        }
        io.to(roomId).emit('message_recalled', {
          messageId,
          message: result.message
        });
        callback && callback({ success: true });
      } catch (e) {
        console.error(e);
        callback && callback({ success: false, error: '撤回失败' });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user_typing', {
        userId: user.id,
        nickname: user.nickname,
        isTyping
      });
    });

    socket.on('sync_unread', async ({ rooms }, callback) => {
      try {
        const result = {};
        for (const roomId of rooms) {
          const lastRead = await Room.getLastRead(roomId, user.id);
          const messages = await Message.getUnread(roomId, user.id, lastRead);
          result[roomId] = { messages, lastReadAt: lastRead };
          if (messages.length > 0) {
            await Room.updateLastRead(roomId, user.id);
          }
        }
        callback && callback({ success: true, data: result });
      } catch (e) {
        console.error(e);
        callback && callback({ success: false, error: '同步失败' });
      }
    });

    socket.on('disconnect', () => {
      User.updateLastOnline(user.id);
      const leftRooms = removeUserSocket(user.id, socket.id);
      leftRooms.forEach(roomId => {
        const onlineList = getOnlineUsersInRoom(roomId);
        io.to(roomId).emit('user_offline', {
          userId: user.id,
          onlineUsers: onlineList
        });
      });
    });
  });
};
