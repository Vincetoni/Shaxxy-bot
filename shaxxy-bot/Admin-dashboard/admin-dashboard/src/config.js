// config.js - Hardcoded for now, change manually

const isDevelopment = window.location.hostname === 'localhost';

const API_URL = isDevelopment 
    ? 'http://localhost:3000'           // Local
    : 'https://shaxxy-api.up.railway.app';  // Production
// For Create React App, env vars must start with REACT_APP_
//const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export { API_URL };

// Bot monitoring endpoints
export const BOT_API = {
    status: `${API_URL}/api/bot/status`,
    stats: `${API_URL}/api/bot/stats`,
    logs: `${API_URL}/api/bot/logs`,
    groups: `${API_URL}/api/bot/groups`
};

// Admin endpoints
export const ADMIN_API = {
    users: `${API_URL}/api/admin/users`,
    settings: `${API_URL}/api/admin/settings`
};

// User endpoints
export const USER_API = {
    profile: `${API_URL}/api/user/profile`,
    stats: `${API_URL}/api/user/stats`,
    inventory: `${API_URL}/api/user/inventory`
};