import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

type Section = "chats" | "calls" | "friends" | "groups" | "profile";
type AuthMode = "login" | "register" | null;

const ACCENT = "#c0424a";
const ACCENT_HOVER = "#a33540";

const mockChats = [
  { id: 1, name: "Анна Волкова", avatar: "А", msg: "Привет! Как дела?", time: "14:32", online: true },
  { id: 2, name: "Дмитрий Козлов", avatar: "Д", msg: "Созвон сегодня?", time: "13:10", online: true },
  { id: 3, name: "Мария Петрова", avatar: "М", msg: "Посмотри макет", time: "11:45", online: false },
  { id: 4, name: "Сергей Иванов", avatar: "С", msg: "ок, спасибо!", time: "вчера", online: false },
];

const mockMessages = [
  { id: 1, sender: "Анна Волкова", avatar: "А", text: "Привет! Как дела?", time: "14:30", mine: false },
  { id: 2, sender: "Вы", avatar: "Я", text: "Всё отлично, работаю над проектом!", time: "14:31", mine: true },
  { id: 3, sender: "Анна Волкова", avatar: "А", text: "Отлично! Созвонимся позже?", time: "14:32", mine: false },
];

const mockFriends = [
  { id: 1, name: "Анна Волкова", avatar: "А", status: "В сети", online: true },
  { id: 2, name: "Дмитрий Козлов", avatar: "Д", status: "Не беспокоить", online: true },
  { id: 3, name: "Мария Петрова", avatar: "М", status: "Не в сети", online: false },
];

const mockRequests = [
  { id: 4, name: "Алексей Смирнов", avatar: "А" },
];

const mockGroups = [
  { id: 1, name: "Команда дизайна", avatar: "Д", members: 5, lastMsg: "Новый макет готов" },
  { id: 2, name: "Проект X", avatar: "П", members: 3, lastMsg: "Встреча в 16:00" },
];

export default function Index() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [section, setSection] = useState<Section>("chats");
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [inputMsg, setInputMsg] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [profileName, setProfileName] = useState("Алексей Морозов");
  const [profileStatus, setProfileStatus] = useState("В разработке");
  const [profilePresence, setProfilePresence] = useState("В сети");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeContact = mockChats.find((c) => c.id === activeChat);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#2f3136] rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: ACCENT }}
            >
              <Icon name="MessageCircle" size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kiscord</h1>
          </div>

          {authMode === "login" ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Добро пожаловать!</h2>
              <p className="text-[#b9bbbe] text-sm text-center mb-6">Войди в свой аккаунт</p>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Пароль</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                />
              </div>
              <button
                onClick={() => setLoggedIn(true)}
                className="w-full py-2.5 rounded font-medium text-white text-sm mt-2 transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = ACCENT_HOVER)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                Войти
              </button>
              <p className="text-center text-[#b9bbbe] text-sm">
                Нет аккаунта?{" "}
                <span
                  className="cursor-pointer hover:underline"
                  style={{ color: ACCENT }}
                  onClick={() => setAuthMode("register")}
                >
                  Зарегистрироваться
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Создать аккаунт</h2>
              <p className="text-[#b9bbbe] text-sm text-center mb-6">Присоединяйся к Kiscordу</p>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Имя пользователя</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                />
              </div>
              <div>
                <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">Пароль</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                />
              </div>
              <button
                onClick={() => setLoggedIn(true)}
                className="w-full py-2.5 rounded font-medium text-white text-sm mt-2 transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = ACCENT_HOVER)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                Зарегистрироваться
              </button>
              <p className="text-center text-[#b9bbbe] text-sm">
                Уже есть аккаунт?{" "}
                <span
                  className="cursor-pointer hover:underline"
                  style={{ color: ACCENT }}
                  onClick={() => setAuthMode("login")}
                >
                  Войти
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#36393f] text-white flex flex-col overflow-hidden">
      {/* Навбар */}
      <nav className="bg-[#2f3136] border-b border-[#202225] px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-[#b9bbbe] hover:text-white p-1"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <Icon name="Menu" size={20} />
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: ACCENT }}
          >
            <Icon name="MessageCircle" size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Kiscord</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
            style={{ backgroundColor: ACCENT }}
          >
            {profileName.charAt(0)}
          </div>
          <span className="text-[#b9bbbe] text-sm hidden sm:block">{profileName}</span>
          <button
            className="text-[#b9bbbe] hover:text-white ml-2"
            onClick={() => setLoggedIn(false)}
            title="Выйти"
          >
            <Icon name="LogOut" size={18} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель */}
        <aside
          className={`${mobileSidebarOpen ? "flex" : "hidden"} lg:flex w-16 bg-[#202225] flex-col items-center py-4 gap-2 z-20`}
        >
          {(
            [
              { id: "chats", icon: "MessageCircle", label: "Чаты" },
              { id: "calls", icon: "Phone", label: "Звонки" },
              { id: "friends", icon: "Users", label: "Друзья" },
              { id: "groups", icon: "Hash", label: "Группы" },
              { id: "profile", icon: "User", label: "Профиль" },
            ] as { id: Section; icon: string; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              title={item.label}
              onClick={() => {
                setSection(item.id);
                setMobileSidebarOpen(false);
              }}
              className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all duration-200 hover:rounded-xl ${
                section === item.id ? "rounded-xl" : ""
              }`}
              style={{
                backgroundColor: section === item.id ? ACCENT : "#36393f",
              }}
              onMouseOver={(e) => {
                if (section !== item.id) e.currentTarget.style.backgroundColor = ACCENT;
              }}
              onMouseOut={(e) => {
                if (section !== item.id) e.currentTarget.style.backgroundColor = "#36393f";
              }}
            >
              <Icon name={item.icon} size={22} className="text-white" />
            </button>
          ))}
        </aside>

        {/* Основная область */}
        <main className="flex-1 flex overflow-hidden">
          {/* === ЧАТЫ === */}
          {section === "chats" && (
            <>
              {/* Список чатов */}
              <div className="w-64 bg-[#2f3136] flex flex-col border-r border-[#202225] hidden sm:flex">
                <div className="p-4 border-b border-[#202225]">
                  <h2 className="font-semibold text-white mb-3">Сообщения</h2>
                  <div className="flex items-center gap-2 bg-[#202225] rounded px-3 py-1.5">
                    <Icon name="Search" size={14} className="text-[#72767d]" />
                    <input
                      className="bg-transparent text-sm text-white placeholder-[#72767d] outline-none flex-1"
                      placeholder="Найти переписку"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mockChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setActiveChat(chat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#393c43] transition-colors ${
                        activeChat === chat.id ? "bg-[#393c43]" : ""
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {chat.avatar}
                        </div>
                        {chat.online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2f3136]" />
                        )}
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

              {/* Область чата */}
              <div className="flex-1 flex flex-col bg-[#36393f]">
                {activeContact ? (
                  <>
                    <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {activeContact.avatar}
                      </div>
                      <span className="font-semibold text-white">{activeContact.name}</span>
                      {activeContact.online && (
                        <span className="text-xs text-green-400">● В сети</span>
                      )}
                      <div className="ml-auto flex gap-2">
                        <button
                          className="text-[#b9bbbe] hover:text-white p-1"
                          onClick={() => { setSection("calls"); setInCall(true); }}
                          title="Позвонить"
                        >
                          <Icon name="Phone" size={18} />
                        </button>
                        <button
                          className="text-[#b9bbbe] hover:text-white p-1"
                          onClick={() => { setSection("calls"); setInCall(true); setCamOn(true); }}
                          title="Видеозвонок"
                        >
                          <Icon name="Video" size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {mockMessages.map((m) => (
                        <div key={m.id} className={`flex gap-3 ${m.mine ? "flex-row-reverse" : ""}`}>
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                            style={{ backgroundColor: m.mine ? "#4f545c" : ACCENT }}
                          >
                            {m.avatar}
                          </div>
                          <div className={`max-w-xs lg:max-w-md ${m.mine ? "items-end" : "items-start"} flex flex-col`}>
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-white text-sm font-medium">{m.sender}</span>
                              <span className="text-[#72767d] text-xs">{m.time}</span>
                            </div>
                            <div
                              className={`rounded-lg px-3 py-2 text-sm text-white ${
                                m.mine ? "bg-[#4f545c]" : "bg-[#40444b]"
                              }`}
                            >
                              {m.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-[#202225]">
                      <div className="flex items-center gap-2 bg-[#40444b] rounded-lg px-4 py-2.5">
                        <input
                          className="flex-1 bg-transparent text-sm text-white placeholder-[#72767d] outline-none"
                          placeholder={`Написать ${activeContact.name}...`}
                          value={inputMsg}
                          onChange={(e) => setInputMsg(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && setInputMsg("")}
                        />
                        <button
                          onClick={() => setInputMsg("")}
                          className="text-[#b9bbbe] hover:text-white"
                        >
                          <Icon name="Send" size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#72767d]">
                    Выберите переписку
                  </div>
                )}
              </div>
            </>
          )}

          {/* === ЗВОНКИ === */}
          {section === "calls" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              {!inCall ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <Icon name="Phone" size={36} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Голосовые и видеозвонки</h2>
                  <p className="text-[#b9bbbe] text-center max-w-md">
                    Звони друзьям прямо в браузере — с видео, демонстрацией экрана и отличным звуком
                  </p>
                  <div className="flex gap-3">
                    {mockFriends.filter((f) => f.online).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setInCall(true)}
                        className="flex flex-col items-center gap-2 p-4 bg-[#2f3136] rounded-lg hover:bg-[#393c43] transition-colors"
                      >
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {f.avatar}
                        </div>
                        <span className="text-white text-sm">{f.name}</span>
                        <span className="text-xs text-green-400">Позвонить</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Область видео */}
                  <div className="flex-1 bg-[#202225] flex items-center justify-center relative">
                    {camOn ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#202225] to-[#36393f] flex items-center justify-center">
                        <div className="text-center text-[#72767d]">
                          <Icon name="Video" size={48} />
                          <p className="mt-2 text-sm">Видео включено</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div
                          className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4"
                          style={{ backgroundColor: ACCENT }}
                        >
                          А
                        </div>
                        <p className="text-[#b9bbbe] text-lg font-medium">Анна Волкова</p>
                        <p className="text-[#72767d] text-sm mt-1">Идёт звонок...</p>
                      </div>
                    )}

                    {screenOn && (
                      <div className="absolute top-4 right-4 bg-[#40444b] rounded px-3 py-1.5 text-xs text-white flex items-center gap-1">
                        <Icon name="Monitor" size={14} />
                        Демонстрация экрана
                      </div>
                    )}
                  </div>

                  {/* Панель управления звонком */}
                  <div className="bg-[#292b2f] px-6 py-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setMicOn(!micOn)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        micOn ? "bg-[#40444b] hover:bg-[#4f545c]" : "hover:opacity-90"
                      }`}
                      style={!micOn ? { backgroundColor: ACCENT } : {}}
                      title={micOn ? "Выключить микрофон" : "Включить микрофон"}
                    >
                      <Icon name={micOn ? "Mic" : "MicOff"} size={20} className="text-white" />
                    </button>
                    <button
                      onClick={() => setSoundOn(!soundOn)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        soundOn ? "bg-[#40444b] hover:bg-[#4f545c]" : "hover:opacity-90"
                      }`}
                      style={!soundOn ? { backgroundColor: ACCENT } : {}}
                      title={soundOn ? "Выключить звук" : "Включить звук"}
                    >
                      <Icon name={soundOn ? "Volume2" : "VolumeX"} size={20} className="text-white" />
                    </button>
                    <button
                      onClick={() => setCamOn(!camOn)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        !camOn ? "bg-[#40444b] hover:bg-[#4f545c]" : "hover:opacity-90"
                      }`}
                      style={camOn ? { backgroundColor: ACCENT } : {}}
                      title={camOn ? "Выключить камеру" : "Включить камеру"}
                    >
                      <Icon name={camOn ? "Video" : "VideoOff"} size={20} className="text-white" />
                    </button>
                    <button
                      onClick={() => setScreenOn(!screenOn)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        !screenOn ? "bg-[#40444b] hover:bg-[#4f545c]" : "hover:opacity-90"
                      }`}
                      style={screenOn ? { backgroundColor: ACCENT } : {}}
                      title={screenOn ? "Остановить демонстрацию" : "Демонстрация экрана"}
                    >
                      <Icon name="Monitor" size={20} className="text-white" />
                    </button>
                    <button
                      onClick={() => {
                        setInCall(false);
                        setMicOn(true);
                        setSoundOn(true);
                        setCamOn(false);
                        setScreenOn(false);
                      }}
                      className="w-14 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
                      title="Завершить звонок"
                    >
                      <Icon name="PhoneOff" size={22} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === ДРУЗЬЯ === */}
          {section === "friends" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3">
                <Icon name="Users" size={18} className="text-[#8e9297]" />
                <span className="font-semibold text-white">Друзья</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Поиск */}
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 flex items-center gap-2 bg-[#202225] rounded px-3 py-2">
                    <Icon name="Search" size={14} className="text-[#72767d]" />
                    <input
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#72767d] outline-none"
                      placeholder="Найти пользователя..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 py-2 rounded text-white text-sm font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Добавить
                  </button>
                </div>

                {/* Входящие заявки */}
                {mockRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
                      Входящие заявки — {mockRequests.length}
                    </h3>
                    {mockRequests.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-2.5 px-3 rounded hover:bg-[#393c43] group">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {r.avatar}
                        </div>
                        <span className="flex-1 text-white text-sm font-medium">{r.name}</span>
                        <div className="hidden group-hover:flex gap-2">
                          <button className="w-8 h-8 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center">
                            <Icon name="Check" size={14} className="text-white" />
                          </button>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                            <Icon name="X" size={14} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Список друзей */}
                <div>
                  <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
                    Все друзья — {mockFriends.length}
                  </h3>
                  {mockFriends.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 py-2.5 px-3 rounded hover:bg-[#393c43] group cursor-pointer border-b border-[#202225] last:border-0">
                      <div className="relative">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {f.avatar}
                        </div>
                        {f.online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#36393f]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{f.name}</p>
                        <p className="text-[#72767d] text-xs">{f.status}</p>
                      </div>
                      <div className="hidden group-hover:flex gap-2">
                        <button
                          onClick={() => { setSection("chats"); }}
                          className="w-8 h-8 bg-[#40444b] hover:bg-[#4f545c] rounded-full flex items-center justify-center"
                        >
                          <Icon name="MessageCircle" size={14} className="text-[#b9bbbe]" />
                        </button>
                        <button
                          onClick={() => { setSection("calls"); setInCall(true); }}
                          className="w-8 h-8 bg-[#40444b] hover:bg-[#4f545c] rounded-full flex items-center justify-center"
                        >
                          <Icon name="Phone" size={14} className="text-[#b9bbbe]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === ГРУППЫ === */}
          {section === "groups" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3">
                <Icon name="Hash" size={18} className="text-[#8e9297]" />
                <span className="font-semibold text-white">Группы</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Создать группу */}
                <div className="mb-6 bg-[#2f3136] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Создать группу</h3>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-[#202225] text-white rounded px-3 py-2 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none placeholder-[#72767d]"
                      placeholder="Название группы..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                    <button
                      className="px-4 py-2 rounded text-white text-sm font-medium transition-colors hover:opacity-90"
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => setGroupName("")}
                    >
                      Создать
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-[#8e9297] text-xs mb-2">Добавить друзей:</p>
                    <div className="flex gap-2 flex-wrap">
                      {mockFriends.map((f) => (
                        <button
                          key={f.id}
                          className="flex items-center gap-1.5 bg-[#202225] hover:bg-[#40444b] rounded-full px-3 py-1 text-xs text-[#b9bbbe] transition-colors"
                        >
                          <span>{f.name}</span>
                          <Icon name="Plus" size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Список групп */}
                <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
                  Мои группы — {mockGroups.length}
                </h3>
                {mockGroups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 py-3 px-3 rounded hover:bg-[#393c43] cursor-pointer border-b border-[#202225] last:border-0 group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {g.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{g.name}</p>
                      <p className="text-[#72767d] text-xs">{g.members} участников · {g.lastMsg}</p>
                    </div>
                    <button className="hidden group-hover:flex items-center justify-center w-8 h-8 bg-[#40444b] rounded-full hover:bg-[#4f545c]">
                      <Icon name="ArrowRight" size={14} className="text-[#b9bbbe]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === ПРОФИЛЬ === */}
          {section === "profile" && (
            <div className="flex-1 flex flex-col bg-[#36393f]">
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-3">
                <Icon name="User" size={18} className="text-[#8e9297]" />
                <span className="font-semibold text-white">Профиль</span>
              </div>
              <div className="flex-1 p-6 max-w-lg mx-auto w-full">
                {/* Аватар */}
                <div className="flex flex-col items-center mb-8">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-3"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {profileName.charAt(0)}
                  </div>
                  <button className="text-sm transition-colors hover:opacity-80" style={{ color: ACCENT }}>
                    Изменить аватар
                  </button>
                </div>

                {/* Поля профиля */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">
                      Имя пользователя
                    </label>
                    <input
                      className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">
                      Статус
                    </label>
                    <input
                      className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                      value={profileStatus}
                      onChange={(e) => setProfileStatus(e.target.value)}
                      placeholder="Ваш статус..."
                    />
                  </div>
                  <div>
                    <label className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide block mb-1.5">
                      Присутствие
                    </label>
                    <select
                      className="w-full bg-[#202225] text-white rounded px-3 py-2.5 text-sm border border-[#202225] focus:border-[#c0424a] focus:outline-none"
                      value={profilePresence}
                      onChange={(e) => setProfilePresence(e.target.value)}
                    >
                      <option>В сети</option>
                      <option>Не беспокоить</option>
                      <option>Отошёл</option>
                      <option>Невидимый</option>
                    </select>
                  </div>

                  <button
                    className="w-full py-2.5 rounded text-white text-sm font-medium transition-colors hover:opacity-90 mt-2"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}