import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('chat_token');
      localStorage.removeItem('chat_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (nickname, password) => api.post('/users/register', { nickname, password }),
  login: (nickname, password) => api.post('/users/login', { nickname, password }),
  getMe: () => api.get('/users/me'),
  updateProfile: (nickname, avatar) => api.put('/users/profile', { nickname, avatar }),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  searchUsers: (q) => api.get('/users/search', { params: { q } })
};

export const roomApi = {
  getPublicRooms: () => api.get('/rooms/public'),
  getMyRooms: () => api.get('/rooms/my'),
  createRoom: (name, type = 'public', password = '') =>
    api.post('/rooms', { name, type, password }),
  createPrivateRoom: (userId) => api.post(`/rooms/private/${userId}`),
  joinRoom: (roomId, password = '') =>
    api.post(`/rooms/${roomId}/join`, { password }),
  getMembers: (roomId) => api.get(`/rooms/${roomId}/members`),
  getMessages: (roomId, limit = 50, before = null) =>
    api.get(`/rooms/${roomId}/messages`, { params: { limit, before } }),
  markRead: (roomId) => api.post(`/rooms/${roomId}/read`),
  getUnread: (roomId) => api.get(`/rooms/${roomId}/unread`),
  searchMessages: (roomId, { keyword = '', senderId = '', type = '' }) =>
    api.get(`/rooms/${roomId}/search`, { params: { keyword, senderId, type } })
};

export const uploadApi = {
  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default api;
