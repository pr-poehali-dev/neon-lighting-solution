const URLS = {
  auth: 'https://functions.poehali.dev/480a5a6b-7ffa-4f09-b8ac-754517b4fe18',
  chats: 'https://functions.poehali.dev/d2827676-76f8-4b2d-b142-ebcf79a3e72d',
  messages: 'https://functions.poehali.dev/9cbbce86-2ed1-4677-83df-91e67cd53f68',
  friends: 'https://functions.poehali.dev/8126b14b-4ef0-44c3-9230-c5dd1c2b79b8',
  signaling: 'https://functions.poehali.dev/a73507f9-085a-4b82-821b-7651241c8536',
};

function getToken() {
  return localStorage.getItem('kiscord_token') || '';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() };
}

async function req(url: string, method = 'GET', body?: object) {
  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!text) return {};
    let data = JSON.parse(text);
    // платформа иногда double-encode body как строку
    if (typeof data === 'string') data = JSON.parse(data);
    return data;
  } catch {
    return { error: 'Нет соединения с сервером' };
  }
}

export const api = {
  register: (name: string, email: string, password: string) =>
    req(`${URLS.auth}/`, 'POST', { action: 'register', name, email, password }),

  login: (email: string, password: string) =>
    req(`${URLS.auth}/`, 'POST', { action: 'login', email, password }),

  me: () => req(`${URLS.auth}/`, 'GET'),

  logout: () => req(`${URLS.auth}/`, 'POST', { action: 'logout' }),

  updateProfile: (data: { name?: string; status?: string; presence?: string }) =>
    req(`${URLS.auth}/`, 'PUT', data),

  getChats: () => req(`${URLS.chats}/`, 'GET'),

  getMessages: (withUserId: number, offset = 0) =>
    req(`${URLS.messages}/?with=${withUserId}&offset=${offset}`, 'GET'),

  sendMessage: (receiver_id: number, text: string) =>
    req(`${URLS.messages}/`, 'POST', { receiver_id, text }),

  getFriends: () => req(`${URLS.friends}/`, 'GET'),

  searchUsers: (search: string) =>
    req(`${URLS.friends}/?search=${encodeURIComponent(search)}`, 'GET'),

  addFriend: (friend_id: number) =>
    req(`${URLS.friends}/`, 'POST', { friend_id }),

  respondFriend: (from_user_id: number, action: 'accept' | 'reject') =>
    req(`${URLS.friends}/`, 'PUT', { from_user_id, action }),

  sendSignal: (peer_id: number, type: string, payload: string) =>
    req(`${URLS.signaling}/`, 'POST', { peer_id, type, payload }),

  getSignals: (peer: number, since: number) =>
    req(`${URLS.signaling}/?peer=${peer}&since=${since}`, 'GET'),
};