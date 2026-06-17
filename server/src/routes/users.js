const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传图片'));
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
      return res.status(400).json({ error: '昵称和密码不能为空' });
    }
    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ error: '昵称长度2-20字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }
    const existing = await User.findByNickname(nickname);
    if (existing) return res.status(400).json({ error: '昵称已存在' });
    const user = await User.create(nickname, password);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
      return res.status(400).json({ error: '昵称和密码不能为空' });
    }
    const user = await User.verifyPassword(nickname, password);
    if (!user) return res.status(401).json({ error: '昵称或密码错误' });
    await User.updateLastOnline(user.id);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    if (nickname !== undefined) {
      if (nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ error: '昵称长度2-20字符' });
      }
      const existing = await User.findByNickname(nickname);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: '昵称已存在' });
      }
    }
    const user = await User.updateProfile(req.user.id, nickname, avatar);
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新失败' });
  }
});

router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传图片' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.updateProfile(req.user.id, undefined, avatarUrl);
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '上传失败' });
  }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });
    const users = await User.search(q);
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;
