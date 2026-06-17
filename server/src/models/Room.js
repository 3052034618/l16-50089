const { v4: uuidv4 } = require('uuid');
const { get, all, insert, update } = require('../db-helper');
const bcrypt = require('bcryptjs');

function enrichRoom(room) {
  if (!room) return null;
  const isPrivateChat = /^私聊_/.test(room.name || '');
  const displayType = room.type === 'private' && isPrivateChat ? 'direct' : room.type;
  const displayName = isPrivateChat ? '' : room.name;
  return {
    ...room,
    member_count: 0,
    display_type: displayType,
    display_name: displayName,
    is_private_chat: isPrivateChat
  };
}

async function getMemberCount(roomId) {
  const members = await all('room_members', { room_id: roomId });
  return members.length;
}

async function enrichWithCount(room, userId) {
  if (!room) return null;
  const enriched = enrichRoom(room);
  enriched.member_count = await getMemberCount(room.id);

  if (enriched.is_private_chat && userId) {
    const members = await all('room_members', { room_id: room.id });
    const otherMember = members.find(m => m.user_id !== userId);
    if (otherMember) {
      const otherUser = await get('users', { id: otherMember.user_id });
      if (otherUser) {
        enriched.display_name = otherUser.nickname;
        enriched.other_user = {
          id: otherUser.id,
          nickname: otherUser.nickname,
          avatar: otherUser.avatar || ''
        };
      }
    }
  }
  return enriched;
}

const Room = {
  async create(name, creatorId, type = 'public', password = '') {
    const id = uuidv4();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : '';
    const now = Date.now();
    const room = {
      id,
      name,
      type,
      password: hashedPassword,
      creator_id: creatorId,
      created_at: now
    };
    await insert('rooms', room);
    await insert('room_members', {
      room_id: id,
      user_id: creatorId,
      joined_at: now,
      last_read_at: now
    });
    return enrichWithCount(room, creatorId);
  },

  async createPrivateRoom(userId1, userId2) {
    const existingRoom = await this.findPrivateRoomByUsers(userId1, userId2);
    if (existingRoom) return existingRoom;

    const id = uuidv4();
    const now = Date.now();
    const room = {
      id,
      name: `私聊_${userId1}_${userId2}`,
      type: 'private',
      password: '',
      creator_id: userId1,
      created_at: now
    };
    await insert('rooms', room);
    await insert('room_members', {
      room_id: id, user_id: userId1, joined_at: now, last_read_at: now
    });
    await insert('room_members', {
      room_id: id, user_id: userId2, joined_at: now, last_read_at: now
    });
    return enrichWithCount(room, userId1);
  },

  async findPrivateRoomByUsers(userId1, userId2) {
    const allMembers = await all('room_members');
    const user1Rooms = new Set(allMembers.filter(m => m.user_id === userId1).map(m => m.room_id));
    const user2Rooms = allMembers.filter(m => m.user_id === userId2).map(m => m.room_id);

    for (const roomId of user2Rooms) {
      if (user1Rooms.has(roomId)) {
        const room = await get('rooms', { id: roomId });
        if (room && room.type === 'private' && /^私聊_/.test(room.name || '')) {
          return enrichWithCount(room, userId1);
        }
      }
    }
    return null;
  },

  async findById(id, userId) {
    const room = await get('rooms', { id });
    return enrichWithCount(room, userId);
  },

  async findPublicRooms() {
    const rows = await all('rooms', {}, { orderBy: ['created_at', 'desc'] });
    const result = [];
    for (const room of rows) {
      if (room.type === 'private' && /^私聊_/.test(room.name)) continue;
      result.push(await enrichWithCount(room));
    }
    return result;
  },

  async findByUserId(userId) {
    const memberships = await all('room_members', { user_id: userId });
    const roomIds = memberships.map(m => m.room_id);
    const allRooms = await all('rooms', {}, { orderBy: ['created_at', 'desc'] });
    const result = [];
    for (const room of allRooms) {
      if (roomIds.includes(room.id)) {
        result.push(await enrichWithCount(room, userId));
      }
    }
    return result;
  },

  async addMember(roomId, userId) {
    const now = Date.now();
    const existing = await get('room_members', { room_id: roomId, user_id: userId });
    if (existing) return true;
    await insert('room_members', {
      room_id: roomId,
      user_id: userId,
      joined_at: now,
      last_read_at: now
    });
    return true;
  },

  async getMembers(roomId) {
    const memberships = await all('room_members', { room_id: roomId });
    const users = await all('users');
    const userMap = new Map(users.map(u => [u.id, u]));
    return memberships
      .map(m => {
        const u = userMap.get(m.user_id);
        if (!u) return null;
        return {
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar || '',
          last_online: u.last_online,
          joined_at: m.joined_at
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nickname.localeCompare(b.nickname));
  },

  async isMember(roomId, userId) {
    const row = await get('room_members', { room_id: roomId, user_id: userId });
    return !!row;
  },

  async verifyPassword(roomId, password) {
    const room = await get('rooms', { id: roomId });
    if (!room || !room.password) return true;
    return bcrypt.compare(password, room.password);
  },

  async updateLastRead(roomId, userId) {
    await update('room_members', { room_id: roomId, user_id: userId }, { last_read_at: Date.now() });
  },

  async getLastRead(roomId, userId) {
    const row = await get('room_members', { room_id: roomId, user_id: userId });
    return row ? row.last_read_at : 0;
  }
};

module.exports = Room;
