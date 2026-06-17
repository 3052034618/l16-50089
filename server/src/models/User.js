const { v4: uuidv4 } = require('uuid');
const { get, all, insert, update } = require('../db-helper');
const bcrypt = require('bcryptjs');

function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar || '',
    created_at: user.created_at,
    last_online: user.last_online
  };
}

const User = {
  async create(nickname, password, avatar = '') {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = Date.now();
    const user = {
      id,
      nickname,
      avatar,
      password: hashedPassword,
      created_at: now,
      last_online: now
    };
    await insert('users', user);
    return toPublic(user);
  },

  async findById(id) {
    const user = await get('users', { id });
    return toPublic(user);
  },

  async findByNickname(nickname) {
    return get('users', { nickname });
  },

  async verifyPassword(nickname, password) {
    const user = await this.findByNickname(nickname);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return toPublic(user);
  },

  async updateProfile(id, nickname, avatar) {
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (avatar !== undefined) updates.avatar = avatar;
    if (Object.keys(updates).length === 0) return this.findById(id);
    await update('users', { id }, updates);
    return this.findById(id);
  },

  async updateLastOnline(id) {
    await update('users', { id }, { last_online: Date.now() });
  },

  async search(query) {
    const rows = await all('users');
    const q = query.toLowerCase();
    return rows
      .filter(u => u.nickname.toLowerCase().includes(q))
      .slice(0, 20)
      .map(toPublic);
  }
};

module.exports = User;
