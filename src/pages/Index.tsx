import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/api";

const ACCENT = "#c0424a";
const ACCENT_HOVER = "#a33540";

type Section = "chats" | "calls" | "friends" | "groups" | "profile";

interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  presence: string;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
  msg: string;
  time: string;
}

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  time: string;
  mine: boolean;
}

interface Friend {
  id: number;
  name: string;
  status: string;
  presence: string;
  online: boolean;
}

interface FriendRequest {
  id: number;
  name: string;
  avatar: string;
}

interface SearchUser {
  id: number;
  name: string;
  email: string;
  status: string;
  presence: string;
}

// WebRTC configuration (STUN серверы для NAT traversal)
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function Index() {
  // Auth
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation
  const [section, setSection] = useState<Section>("chats");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Chats
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Friends
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profilePresence, setProfilePresence] = useState("online");
  const [profileSaved, setProfileSaved] = useState(false);

  // WebRTC Call
  const [inCall, setInCall] = useState(false);
  const [callPeer, setCallPeer] = useState<Chat | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [callStatus, setCallStatus] = useState<"calling" | "connected" | "incoming" | "">(""); 
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const lastSignalIdRef = useRef<number>(0);
  const signalingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Проверка сохранённого токена при загрузке
  useEffect(() => {
    const token = localStorage.getItem('kiscord_token');
    if (token) {
      api.me().then((data) => {
        if (data.user) {
          setUser(data.user);
          setLoggedIn(true);
          setProfileName(data.user.name);
          setProfileStatus(data.user.status || "");
          setProfilePresence(data.user.presence || "online");
        } else {
          localStorage.removeItem('kiscord_token');
        }
      });
    }
  }, []);

  // Загрузка чатов + автообновление каждые 3 сек
  useEffect(() => {
    if (!loggedIn) return;
    const fetchChats = () => {
      api.getChats().then((data) => {
        if (data.chats) setChats(data.chats);
      });
    };
    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  // Загрузка сообщений при смене активного чата
  useEffect(() => {
    if (!activeChat || !loggedIn) return;
    const fetchMsgs = () => {
      api.getMessages(activeChat.id).then((data) => {
        if (data.messages) setMessages(data.messages);
      });
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [activeChat, loggedIn]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Загрузка друзей
  const loadFriends = useCallback(() => {
    api.getFriends().then((data) => {
      if (data.friends) setFriends(data.friends);
      if (data.requests) setFriendRequests(data.requests);
    });
  }, []);

  useEffect(() => {
    if (loggedIn && section === "friends") loadFriends();
  }, [loggedIn, section, loadFriends]);

  // Поиск пользователей с задержкой
  useEffect(() => {
    if (!friendSearch.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const data = await api.searchUsers(friendSearch);
      setSearchResults(data.users || []);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [friendSearch]);

  // === WebRTC ===
  const cleanupCall = useCallback(() => {
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setInCall(false);
    setCallPeer(null);
    setCallStatus("");
    setCamOn(false);
    setScreenOn(false);
    lastSignalIdRef.current = 0;
  }, []);

  const startSignalingPoll = useCallback((peerId: number) => {
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);
    signalingIntervalRef.current = setInterval(async () => {
      const data = await api.getSignals(peerId, lastSignalIdRef.current);
      if (!data.signals) return;
      for (const sig of data.signals) {
        lastSignalIdRef.current = Math.max(lastSignalIdRef.current, sig.id);
        const pc = peerRef.current;
        if (!pc) continue;
        if (sig.type === 'offer') {
          await pc.setRemoteDescription(JSON.parse(sig.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await api.sendSignal(peerId, 'answer', JSON.stringify(answer));
          setCallStatus("connected");
        } else if (sig.type === 'answer') {
          await pc.setRemoteDescription(JSON.parse(sig.payload));
          setCallStatus("connected");
        } else if (sig.type === 'ice-candidate') {
          try { await pc.addIceCandidate(JSON.parse(sig.payload)); } catch (_e) { /* ignore stale candidates */ }
        } else if (sig.type === 'hangup') {
          cleanupCall();
        }
      }
    }, 1500);
  }, [cleanupCall]);

  const createPeerConnection = useCallback((peerId: number) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        api.sendSignal(peerId, 'ice-candidate', JSON.stringify(e.candidate));
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    return pc;
  }, []);

  const startCall = useCallback(async (chat: Chat, withVideo: boolean) => {
    setCallPeer(chat);
    setInCall(true);
    setCallStatus("calling");
    setCamOn(withVideo);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch {
      const stream = new MediaStream();
      localStreamRef.current = stream;
    }

    const pc = createPeerConnection(chat.id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await api.sendSignal(chat.id, 'offer', JSON.stringify(offer));
    startSignalingPoll(chat.id);
  }, [createPeerConnection, startSignalingPoll]);

  const hangUp = useCallback(async () => {
    if (callPeer) await api.sendSignal(callPeer.id, 'hangup', '');
    cleanupCall();
  }, [callPeer, cleanupCall]);

  const toggleMic = () => {
    const val = !micOn;
    setMicOn(val);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = val; });
  };

  const toggleCam = async () => {
    if (!camOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getVideoTracks().forEach(track => {
          localStreamRef.current?.addTrack(track);
          peerRef.current?.addTrack(track, localStreamRef.current!);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setCamOn(true);
      } catch (_e) { /* camera not available */ }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
      setCamOn(false);
    }
  };

  const toggleScreen = async () => {
    if (!screenOn) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getVideoTracks().forEach(track => {
          peerRef.current?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setScreenOn(true);
      } catch (_e) { /* screen share denied */ }
    } else {
      setScreenOn(false);
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  };

  // Auth handlers
  const applyAuth = (data: Record<string, unknown>) => {
    const user = data.user as User;
    localStorage.setItem('kiscord_token', data.token as string);
    setUser(user);
    setLoggedIn(true);
    setProfileName(user.name);
    setProfileStatus(user.status || "");
    setProfilePresence(user.presence || "online");
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await api.login(loginEmail, loginPassword);
      if (data.token) {
        applyAuth(data);
      } else {
        setAuthError(data.error || "Неверный email или пароль");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError("Заполните все поля");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await api.register(regName.trim(), regEmail.trim(), regPassword);
      if (data.token) {
        applyAuth(data);
      } else {
        setAuthError(data.error || "Ошибка регистрации");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    localStorage.removeItem('kiscord_token');
    setLoggedIn(false);
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChat(null);
  };

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !activeChat) return;
    const text = inputMsg.trim();
    setInputMsg("");
    await api.sendMessage(activeChat.id, text);
    const data = await api.getMessages(activeChat.id);
    if (data.messages) setMessages(data.messages);
  };

  const handleSaveProfile = async () => {
    const data = await api.updateProfile({ name: profileName, status: profileStatus, presence: profilePresence });
    if (data.user) {
      setUser(data.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    }
  };

  const handleRespondFriend = async (fromId: number, action: 'accept' | 'reject') => {
    await api.respondFriend(fromId, action);
    loadFriends();
  };

  const handleAddFriend = async (friendId: number) => {
    await api.addFriend(friendId);
    setFriendSearch("");
    setSearchResults([]);
  };

  // ==================== AUTH SCREEN ====================
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#2f3136] rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
              <Icon name="MessageCircle" size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kiscord</h1>
          </div>

          {authMode === "login" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Добро пожаловать!</h2>
              <p className="text-[#b9bbbe] text-sm text-center mb-4">Войди в свой аккаунт</p>
              {authError && <p className="text-red-400 text-sm text-center bg-red-900/20 rounded p-2">{authError}</p>}
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Пароль</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              <button onClick={handleLogin} disabled={authLoading}
                className="w-full py-2.5 rounded font-medium text-white text-sm mt-2 transition-colors disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
                onMouseOver={e => { if (!authLoading) e.currentTarget.style.backgroundColor = ACCENT_HOVER; }}
                onMouseOut={e => e.currentTarget.style.backgroundColor = ACCENT}>
                {authLoading ? "Вхожу..." : "Войти"}
              </button>
              <p className="text-center text-[#b9bbbe] text-sm">
                Нет аккаунта?{" "}
                <span className="cursor-pointer hover:underline" style={{ color: ACCENT }}
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}>
                  Зарегистрироваться
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Создать аккаунт</h2>
              <p className="text-[#b9bbbe] text-sm text-center mb-4">Присоединяйся к Kiscord</p>
              {authError && <p className="text-red-400 text-sm text-center bg-red-900/20 rounded p-2">{authError}</p>}
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Имя</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]" />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]" />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Пароль</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]" />
              </div>
              <button onClick={handleRegister} disabled={authLoading}
                className="w-full py-2.5 rounded font-medium text-white text-sm mt-2 transition-colors disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
                onMouseOver={e => { if (!authLoading) e.currentTarget.style.backgroundColor = ACCENT_HOVER; }}
                onMouseOut={e => e.currentTarget.style.backgroundColor = ACCENT}>
                {authLoading ? "Регистрирую..." : "Зарегистрироваться"}
              </button>
              <p className="text-center text-[#b9bbbe] text-sm">
                Уже есть аккаунт?{" "}
                <span className="cursor-pointer hover:underline" style={{ color: ACCENT }}
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}>
                  Войти
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== CALL OVERLAY ====================
  if (inCall && callPeer) {
    return (
      <div className="min-h-screen bg-[#202225] flex flex-col">
        <div className="flex-1 relative flex items-center justify-center bg-[#1a1c1e]">
          {camOn || screenOn ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted
                className="absolute bottom-4 right-4 w-36 h-24 rounded-lg border-2 border-[#40444b] object-cover bg-[#202225]" />
            </>
          ) : (
            <div className="text-center">
              <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4"
                style={{ backgroundColor: ACCENT }}>
                {callPeer.avatar}
              </div>
              <p className="text-white text-xl font-medium">{callPeer.name}</p>
              <p className="text-[#72767d] text-sm mt-1">
                {callStatus === "calling" ? "Вызов..." : callStatus === "connected" ? "Соединение установлено" : "Подключение..."}
              </p>
            </div>
          )}
          {screenOn && (
            <div className="absolute top-4 right-4 bg-[#40444b]/80 rounded px-3 py-1 text-xs text-white flex items-center gap-1.5">
              <Icon name="Monitor" size={13} /> Демонстрация экрана
            </div>
          )}
        </div>

        <div className="bg-[#292b2f] px-6 py-5 flex items-center justify-center gap-4">
          <button onClick={toggleMic}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: micOn ? "#40444b" : ACCENT }}
            title={micOn ? "Выкл. микрофон" : "Вкл. микрофон"}>
            <Icon name={micOn ? "Mic" : "MicOff"} size={20} className="text-white" />
          </button>
          <button onClick={() => setSoundOn(v => !v)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: soundOn ? "#40444b" : ACCENT }}
            title={soundOn ? "Выкл. звук" : "Вкл. звук"}>
            <Icon name={soundOn ? "Volume2" : "VolumeX"} size={20} className="text-white" />
          </button>
          <button onClick={toggleCam}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: camOn ? ACCENT : "#40444b" }}
            title={camOn ? "Выкл. камеру" : "Вкл. камеру"}>
            <Icon name={camOn ? "Video" : "VideoOff"} size={20} className="text-white" />
          </button>
          <button onClick={toggleScreen}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: screenOn ? ACCENT : "#40444b" }}
            title={screenOn ? "Стоп демонстрация" : "Демонстрация экрана"}>
            <Icon name="Monitor" size={20} className="text-white" />
          </button>
          <button onClick={hangUp}
            className="w-14 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
            title="Завершить звонок">
            <Icon name="PhoneOff" size={22} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  // ==================== MAIN APP ====================
  return (
    <div className="min-h-screen bg-[#36393f] text-white flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Навбар */}
      <nav className="bg-[#2f3136] border-b border-[#202225] px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-[#b9bbbe] hover:text-white p-1"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
            <Icon name="Menu" size={20} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
            <Icon name="MessageCircle" size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Kiscord</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
            style={{ backgroundColor: ACCENT }}>
            {user?.name?.charAt(0) || "?"}
          </div>
          <span className="text-[#b9bbbe] text-sm hidden sm:block">{user?.name}</span>
          <button className="text-[#b9bbbe] hover:text-white ml-2" onClick={handleLogout} title="Выйти">
            <Icon name="LogOut" size={18} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель */}
        <aside className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-16 bg-[#202225] flex-col items-center py-4 gap-2 z-20 shrink-0`}>
          {([
            { id: "chats", icon: "MessageCircle", label: "Чаты" },
            { id: "calls", icon: "Phone", label: "Звонки" },
            { id: "friends", icon: "Users", label: "Друзья" },
            { id: "profile", icon: "User", label: "Профиль" },
          ] as { id: Section; icon: string; label: string }[]).map(item => (
            <button key={item.id} title={item.label}
              onClick={() => { setSection(item.id); setMobileSidebarOpen(false); }}
              className="w-12 h-12 rounded-3xl flex items-center justify-center transition-all duration-200 hover:rounded-xl"
              style={{ backgroundColor: section === item.id ? ACCENT : "#36393f" }}
              onMouseOver={e => { if (section !== item.id) e.currentTarget.style.backgroundColor = ACCENT; }}
              onMouseOut={e => { if (section !== item.id) e.currentTarget.style.backgroundColor = "#36393f"; }}>
              <Icon name={item.icon} size={22} className="text-white" />
            </button>
          ))}
        </aside>

        {/* Основная область */}
        <main className="flex-1 flex overflow-hidden min-w-0">

          {/* ===== ЧАТЫ ===== */}
          {section === "chats" && (
            <>
              <div className="w-64 bg-[#2f3136] flex flex-col border-r border-[#202225] shrink-0 hidden sm:flex">
                <div className="p-4 border-b border-[#202225]">
                  <h2 className="font-semibold text-white mb-3">Сообщения</h2>
                  <div className="flex items-center gap-2 bg-[#202225] rounded px-3 py-1.5">
                    <Icon name="Search" size={14} className="text-[#72767d]" />
                    <input className="bg-transparent text-sm text-white placeholder-[#72767d] outline-none flex-1"
                      placeholder="Найти переписку" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chats.length === 0 ? (
                    <div className="p-4 text-[#72767d] text-sm text-center mt-8">
                      <Icon name="MessageCircle" size={32} className="mx-auto mb-2 opacity-30" />
                      <p>Нет переписок</p>
                      <p className="text-xs mt-1">Добавь друга и начни общение</p>
                    </div>
                  ) : chats.map(chat => (
                    <button key={chat.id} onClick={() => setActiveChat(chat)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#393c43] transition-colors ${activeChat?.id === chat.id ? "bg-[#393c43]" : ""}`}>
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ backgroundColor: ACCENT }}>
                          {chat.avatar}
                        </div>
                        {chat.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2f3136]" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium truncate">{chat.name}</span>
                          <span className="text-[#72767d] text-xs ml-1 shrink-0">{chat.time}</span>
                        </div>
                        <p className="text-[#b9bbbe] text-xs truncate">{chat.msg}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#36393f] min-w-0">
                {activeChat ? (
                  <>
                    <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3 shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: ACCENT }}>
                        {activeChat.avatar}
                      </div>
                      <span className="font-semibold text-white">{activeChat.name}</span>
                      {activeChat.online && <span className="text-xs text-green-400">● В сети</span>}
                      <div className="ml-auto flex gap-2">
                        <button className="text-[#b9bbbe] hover:text-white p-1"
                          onClick={() => startCall(activeChat, false)} title="Голосовой звонок">
                          <Icon name="Phone" size={18} />
                        </button>
                        <button className="text-[#b9bbbe] hover:text-white p-1"
                          onClick={() => startCall(activeChat, true)} title="Видеозвонок">
                          <Icon name="Video" size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 && (
                        <div className="text-center text-[#72767d] mt-8 text-sm">Начни переписку!</div>
                      )}
                      {messages.map(m => (
                        <div key={m.id} className={`flex gap-3 ${m.mine ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: m.mine ? "#4f545c" : ACCENT }}>
                            {m.sender_name?.charAt(0) || "?"}
                          </div>
                          <div className={`max-w-xs lg:max-w-md flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-white text-xs font-medium">{m.mine ? "Вы" : m.sender_name}</span>
                              <span className="text-[#72767d] text-xs">{m.time}</span>
                            </div>
                            <div className={`rounded-lg px-3 py-2 text-sm text-white break-words ${m.mine ? "bg-[#4f545c]" : "bg-[#40444b]"}`}>
                              {m.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-[#202225] shrink-0">
                      <div className="flex items-center gap-2 bg-[#40444b] rounded-lg px-4 py-2.5">
                        <input
                          className="flex-1 bg-transparent text-sm text-white placeholder-[#72767d] outline-none"
                          placeholder={`Написать ${activeChat.name}...`}
                          value={inputMsg}
                          onChange={e => setInputMsg(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendMessage()} />
                        <button onClick={handleSendMessage} className="text-[#b9bbbe] hover:text-white">
                          <Icon name="Send" size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-[#72767d] gap-3">
                    <Icon name="MessageCircle" size={48} className="opacity-20" />
                    <p>Выберите переписку</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== ЗВОНКИ ===== */}
          {section === "calls" && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#36393f] gap-6 p-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
                <Icon name="Phone" size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Голосовые и видеозвонки</h2>
              <p className="text-[#b9bbbe] text-center max-w-md">
                Звони друзьям прямо в браузере — с видео, демонстрацией экрана и отличным качеством
              </p>
              {chats.length > 0 ? (
                <div className="flex flex-wrap gap-3 justify-center">
                  {chats.map(c => (
                    <div key={c.id} className="flex flex-col items-center gap-2 p-4 bg-[#2f3136] rounded-lg">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                        style={{ backgroundColor: ACCENT }}>
                        {c.avatar}
                      </div>
                      <span className="text-white text-sm font-medium">{c.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => startCall(c, false)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: ACCENT }}>
                          <Icon name="Phone" size={12} /> Голос
                        </button>
                        <button onClick={() => startCall(c, true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-xs font-medium bg-[#40444b] hover:bg-[#4f545c]">
                          <Icon name="Video" size={12} /> Видео
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#72767d] text-sm">Начни переписку с кем-нибудь, чтобы позвонить</p>
              )}
            </div>
          )}

          {/* ===== ДРУЗЬЯ ===== */}
          {section === "friends" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3 shrink-0">
                <Icon name="Users" size={18} className="text-[#8e9297]" />
                <span className="font-semibold text-white">Друзья</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Поиск + добавить */}
                <div className="mb-6 bg-[#2f3136] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Найти пользователя</h3>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-[#202225] rounded px-3 py-2">
                      <Icon name="Search" size={14} className="text-[#72767d]" />
                      <input className="flex-1 bg-transparent text-sm text-white placeholder-[#72767d] outline-none"
                        placeholder="Имя или email..."
                        value={friendSearch}
                        onChange={e => setFriendSearch(e.target.value)} />
                    </div>
                  </div>
                  {searchLoading && <p className="text-[#72767d] text-xs mt-2">Поиск...</p>}
                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {searchResults.map(u => (
                        <div key={u.id} className="flex items-center gap-3 bg-[#202225] rounded p-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: ACCENT }}>
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{u.name}</p>
                            <p className="text-[#72767d] text-xs truncate">{u.email}</p>
                          </div>
                          <button onClick={() => handleAddFriend(u.id)}
                            className="px-3 py-1 rounded text-white text-xs font-medium shrink-0"
                            style={{ backgroundColor: ACCENT }}>
                            Добавить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Входящие заявки */}
                {friendRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
                      Входящие заявки — {friendRequests.length}
                    </h3>
                    {friendRequests.map(r => (
                      <div key={r.id} className="flex items-center gap-3 py-2.5 px-3 rounded bg-[#2f3136] mb-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: ACCENT }}>
                          {r.avatar}
                        </div>
                        <span className="flex-1 text-white text-sm font-medium">{r.name}</span>
                        <button onClick={() => handleRespondFriend(r.id, 'accept')}
                          className="w-8 h-8 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center">
                          <Icon name="Check" size={14} className="text-white" />
                        </button>
                        <button onClick={() => handleRespondFriend(r.id, 'reject')}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                          style={{ backgroundColor: ACCENT }}>
                          <Icon name="X" size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Список друзей */}
                <div>
                  <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
                    Все друзья — {friends.length}
                  </h3>
                  {friends.length === 0 ? (
                    <div className="text-center text-[#72767d] mt-4">
                      <Icon name="Users" size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Пока нет друзей</p>
                      <p className="text-xs mt-1">Найди кого-нибудь через поиск</p>
                    </div>
                  ) : friends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 py-2.5 px-3 rounded hover:bg-[#393c43] group cursor-pointer border-b border-[#202225] last:border-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: ACCENT }}>
                          {f.name.charAt(0)}
                        </div>
                        {f.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#36393f]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{f.name}</p>
                        <p className="text-[#72767d] text-xs">{f.status || (f.online ? "В сети" : "Не в сети")}</p>
                      </div>
                      <div className="hidden group-hover:flex gap-2">
                        <button onClick={() => { setActiveChat({ id: f.id, name: f.name, avatar: f.name.charAt(0), online: f.online, msg: "", time: "" }); setSection("chats"); }}
                          className="w-8 h-8 bg-[#40444b] hover:bg-[#4f545c] rounded-full flex items-center justify-center">
                          <Icon name="MessageCircle" size={14} className="text-[#b9bbbe]" />
                        </button>
                        <button onClick={() => startCall({ id: f.id, name: f.name, avatar: f.name.charAt(0), online: f.online, msg: "", time: "" }, false)}
                          className="w-8 h-8 bg-[#40444b] hover:bg-[#4f545c] rounded-full flex items-center justify-center">
                          <Icon name="Phone" size={14} className="text-[#b9bbbe]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ПРОФИЛЬ ===== */}
          {section === "profile" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3 shrink-0">
                <Icon name="User" size={18} className="text-[#8e9297]" />
                <span className="font-semibold text-white">Профиль</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-md mx-auto">
                  <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-3"
                      style={{ backgroundColor: ACCENT }}>
                      {profileName.charAt(0) || "?"}
                    </div>
                    <p className="text-[#b9bbbe] text-sm">ID: {user?.id}</p>
                    <p className="text-[#72767d] text-xs">{user?.email}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Имя</label>
                      <input className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                        value={profileName} onChange={e => setProfileName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Статус</label>
                      <input className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                        placeholder="Ваш статус..."
                        value={profileStatus} onChange={e => setProfileStatus(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Присутствие</label>
                      <select className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                        value={profilePresence} onChange={e => setProfilePresence(e.target.value)}>
                        <option value="online">В сети</option>
                        <option value="dnd">Не беспокоить</option>
                        <option value="away">Отошёл</option>
                        <option value="invisible">Невидимый</option>
                      </select>
                    </div>
                    <button onClick={handleSaveProfile}
                      className="w-full py-2.5 rounded text-white text-sm font-medium transition-all"
                      style={{ backgroundColor: profileSaved ? "#3ba55c" : ACCENT }}
                      onMouseOver={e => { if (!profileSaved) e.currentTarget.style.backgroundColor = ACCENT_HOVER; }}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = profileSaved ? "#3ba55c" : ACCENT}>
                      {profileSaved ? "✓ Сохранено!" : "Сохранить изменения"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}