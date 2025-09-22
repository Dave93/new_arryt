import axios from 'axios';

// Создаем HTTP клиент для подключения к Arryt API
export const arrytApiClient = axios.create({
  baseURL: process.env.ARRYT_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'arryt-mcp-server/1.0.0'
  }
});

// Добавляем обработчик запросов для логирования
arrytApiClient.interceptors.request.use(
  (config) => {
    console.error(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

// Добавляем обработчик ответов для логирования
arrytApiClient.interceptors.response.use(
  (response) => {
    console.error(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.response?.status || 'Network Error'} ${error.config?.url} - ${error.message}`);
    return Promise.reject(error);
  }
);