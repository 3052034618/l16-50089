const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

require('./src/db');

const { socketAuthMiddleware } = require('./src/middleware/auth');
const userRoutes = require('./src/routes/users');
const roomRoutes = require('./src/routes/rooms');
const uploadRoutes = require('./src/routes/upload');
const setupSocket = require('./src/socket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

io.use(socketAuthMiddleware);
setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
