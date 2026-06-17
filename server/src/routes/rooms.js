const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const { authMiddleware } = require('../middleware/auth');

router.get('/public', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.findPublicRooms();
    res.json({ rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取房间列表失败' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.findByUserId(req.user.id);
    res.json({ rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取房间列表失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, type = 'public', password = '' } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '房间名称不能为空' });
    }
    if (type === 'private' && (!password || password.length < 1)) {
      return res.status(400).json({ error: '私有房间必须设置密码' });
    }
    const room = await Room.create(name.trim(), req.user.id, type, password);
    res.json({ room });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建房间失败' });
  }
});

router.post('/private/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能与自己创建私聊' });
    }
    const room = await Room.createPrivateRoom(req.user.id, userId);
    res.json({ room });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建私聊失败' });
  }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password = '' } = req.body;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ error: '房间不存在' });
    if (room.type === 'private') {
      const valid = await Room.verifyPassword(id, password);
      if (!valid) return res.status(400).json({ error: '密码错误' });
    }
    const isMember = await Room.isMember(id, req.user.id);
    if (!isMember) {
      await Room.addMember(id, req.user.id);
    }
    res.json({ room });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '加入房间失败' });
  }
});

router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const isMember = await Room.isMember(id, req.user.id);
    if (!isMember) return res.status(403).json({ error: '不是房间成员' });
    const members = await Room.getMembers(id);
    res.json({ members });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取成员列表失败' });
  }
});

router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before = null } = req.query;
    const isMember = await Room.isMember(id, req.user.id);
    if (!isMember) return res.status(403).json({ error: '不是房间成员' });
    const messages = await Message.findByRoom(id, parseInt(limit), before ? parseInt(before) : null);
    res.json({ messages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取消息失败' });
  }
});

router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Room.updateLastRead(id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新阅读状态失败' });
  }
});

router.get('/:id/unread', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const isMember = await Room.isMember(id, req.user.id);
    if (!isMember) return res.status(403).json({ error: '不是房间成员' });
    const lastRead = await Room.getLastRead(id, req.user.id);
    const messages = await Message.getUnread(id, req.user.id, lastRead);
    res.json({ messages, lastReadAt: lastRead });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取未读消息失败' });
  }
});

module.exports = router;
