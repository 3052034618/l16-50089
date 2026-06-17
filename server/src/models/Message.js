const { v4: uuidv4 } = require('uuid');
const { get, all, insert, update } = require('../db-helper');

const RECALL_WINDOW_MS = 2 * 60 * 1000;

async function enrichMessage(msg) {
  if (!msg) return null;
  const sender = await get('users', { id: msg.sender_id });
  return {
    ...msg,
    mentions: Array.isArray(msg.mentions) ? msg.mentions : JSON.parse(msg.mentions || '[]'),
    sender_nickname: sender ? sender.nickname : 'Unknown',
    sender_avatar: sender ? (sender.avatar || '') : ''
  };
}

const Message = {
  async create(roomId, senderId, type, content, fileName = '', fileSize = 0, mentions = []) {
    const id = uuidv4();
    const now = Date.now();
    const msg = {
      id,
      room_id: roomId,
      sender_id: senderId,
      type,
      content,
      file_name: fileName,
      file_size: fileSize,
      mentions: JSON.stringify(mentions || []),
      is_recalled: 0,
      created_at: now
    };
    await insert('messages', msg);
    return this.findById(id);
  },

  async findById(id) {
    const msg = await get('messages', { id });
    return enrichMessage(msg);
  },

  async findByRoom(roomId, limit = 50, before = null) {
    let rows = await all('messages', { room_id: roomId }, { orderBy: ['created_at', 'desc'] });
    if (before) {
      rows = rows.filter(m => m.created_at < before);
    }
    rows = rows.slice(0, limit);
    rows.reverse();
    const result = [];
    for (const msg of rows) {
      result.push(await enrichMessage(msg));
    }
    return result;
  },

  async recall(messageId, userId) {
    const rawMsg = await get('messages', { id: messageId });
    if (!rawMsg || rawMsg.is_recalled) {
      return { success: false, message: '消息不存在或已撤回' };
    }
    if (rawMsg.sender_id !== userId) {
      return { success: false, message: '只能撤回自己的消息' };
    }
    if (Date.now() - rawMsg.created_at > RECALL_WINDOW_MS) {
      return { success: false, message: '超过撤回时间限制（2分钟）' };
    }
    await update('messages', { id: messageId }, { is_recalled: 1 });
    return { success: true, message: await this.findById(messageId) };
  },

  async getUnread(roomId, userId, lastReadAt) {
    const rows = await all('messages', { room_id: roomId }, { orderBy: ['created_at', 'asc'] });
    const unread = rows.filter(m => m.created_at > lastReadAt && m.sender_id !== userId);
    const result = [];
    for (const msg of unread) {
      result.push(await enrichMessage(msg));
    }
    return result;
  }
};

module.exports = Message;
