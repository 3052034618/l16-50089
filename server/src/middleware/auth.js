const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'chat-secret-key-2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token无效' });
  }
}

async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('未授权'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('用户不存在'));
    socket.user = user;
    next();
  } catch (e) {
    return next(new Error('Token无效'));
  }
}

module.exports = { generateToken, authMiddleware, socketAuthMiddleware, JWT_SECRET };
