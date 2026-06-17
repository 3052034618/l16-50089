const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const filesDir = path.join(__dirname, '..', '..', 'uploads', 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const savedName = `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, savedName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const isImage = /^image\//.test(req.file.mimetype);
    const type = isImage ? 'image' : 'file';
    const fileUrl = `/uploads/files/${req.file.filename}`;
    res.json({
      url: fileUrl,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '上传失败' });
  }
});

module.exports = router;
