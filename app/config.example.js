// app/config.example.js
// 📝 Modèle de configuration des endpoints (renommer en config.js en local)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:100';
export const BACKEND_URL = API_URL;
export const CHAT_URL = process.env.EXPO_PUBLIC_CHAT_URL || 'http://localhost:3000';
export const SOCKET_URL = CHAT_URL;
