import React, { useEffect, useState } from "react";
import {
  Play, Settings, Folder, Grid2X2, ChevronLeft, ChevronRight,
  Volume2, Image as ImageIcon, Plus, Box, Download, Flame, Server,
  CheckCircle, X, Minus, Maximize2, RefreshCw, Users, Shirt, Flag, Search, Upload
} from "lucide-react";
import { API_BASE } from "./config.js";

const nav = [
  { id: "play", label: "Играть", Icon: Play },
  { id: "builds", label: "Мои сборки", Icon: Folder },
  { id: "content", label: "Контент", Icon: Grid2X2 },
  { id: "mods", label: "Моды", Icon: Download },
  { id: "servers", label: "Серверы", Icon: Server },
  { id: "skins", label: "Скины", Icon: Shirt },
  { id: "friends", label: "Друзья", Icon: Users, badge: "1" },
  { id: "myserver", label: "Мой сервер", Icon: Flag }
];

function IconButton({ children, onClick, title, className = "" }) {
  return (
    <button title={title} onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg text-gray-400 transition hover:bg-[#303030] hover:text-white ${className}`}>
      {children}
    </button>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-white">{children}</h2>
      {action && (
        <button onClick={action.onClick}
          className="flex items-center gap-1 text-sm font-semibold
          text-[#75c956] hover:text-[#9aee7c]">
          {action.label} <ChevronRight size={16} />
        </button>
      )}

    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("play");
  const [collapsed, setCollapsed] = useState(false);
  const [packs, setPacks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [username, setUsername] = useState("Player");
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("Player");
  const [localBuilds, setLocalBuilds] = useState([]);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildVersion, setBuildVersion] = useState("1.20.1");
  const [buildLoader, setBuildLoader] = useState("Vanilla");
  const [showModsModal, setShowModsModal] = useState(false);
  const [modSource, setModSource] = useState("modrinth");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modAction, setModAction] = useState("");
  const [modDownloads, setModDownloads] = useState({});

  useEffect(() => {
    if (!window.nexLauncher) return;
    window.nexLauncher.getSettings().then(settings => {
      setUsername(settings.username || "Player");
      setTempName(settings.username || "Player");
    }).catch(() => {});
    window.nexLauncher.listLocalBuilds().then(setLocalBuilds).catch(() => {});
  }, []);

  useEffect(() => {
    if (!window.nexLauncher?.onModProgress) return;
    return window.nexLauncher.onModProgress(data => {
      setModDownloads(prev => ({ ...prev, [(data.source || "modrinth") + ":" + data.id]: { progress: data.progress ?? 0, status: data.status, error: data.error } }));
    });
  }, []);

  // Загружаем список сборок с PHP API при старте.
  useEffect(() => {
    fetch(`${API_BASE}?list=1`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setApiOnline(true);
        const list = Array.isArray(data.packs) ? data.packs : [];
        setPacks(list);
        if (list.length) setSelected(list[0]);
      })
      .catch(() => setApiOnline(false));
  }, []);

  // Подписка на прогресс от Electron main process.
  useEffect(() => {
    if (!window.nexLauncher) return;
    const off = window.nexLauncher.onProgress((event) => {
      if (event.progress != null) setProgress(event.progress);
      if (event.message) setMessage(event.message);
      if (event.type === "error") { setStatus("error"); setError(event.message); }
      if (event.type === "started") { setStatus("started"); setProgress(100); }
      if (event.type === "done") { setStatus("done"); setProgress(100); }
    });
    return off;
  }, []);

  async function handleImport(type) {
    try {
      const imported = await window.nexLauncher.importAuto(type);
      if (!imported) return;
      const build = { ...imported, isLocal: true, server: null };
      setLocalBuilds(prev => [build, ...prev.filter(item => item.id !== build.id)]);
      setSelected(build);
      setPage("builds");
      alert(`Сборка «${build.name}» успешно импортирована! Версия Minecraft: ${build.mcVersion}, загрузчик: ${build.modLoader}.`);
    } catch (err) {
      alert("Ошибка импорта: " + (err.message || "Не удалось импортировать сборку"));
    }
  }

  async function launch() {
    if (!selected || !window.nexLauncher) {
      setError("Лаунчер должен быть запущен как Electron-приложение.");
      return;
    }
    setError("");
    setProgress(0);
    setStatus("downloading");
    setMessage("Подготовка...");
    try {
      await window.nexLauncher.launch({
        packId: selected.id,
        username,
        ram: 2048,
        ...(selected.isLocal ? { localBuildId: selected.id } : {})
      });
    } catch (err) {
      setStatus("error");
      setError(err.message || "Ошибка запуска");
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#121212] font-sans text-gray-200">
      {/* Хедер */}
      <header className="relative flex h-14 shrink-0 items-center justify-between
        border-b border-[#292929] bg-[#171717] px-5">
        <div className="w-24" />
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-[#5dbb3a] text-[#13220e]">
            <Box size={17} strokeWidth={2.8} />
          </div>
          <span className="text-sm font-extrabold tracking-wide text-white">NEXLAUNCHER</span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton title="Свернуть окно" onClick={() => window.nexLauncher?.minimize()}>
            <Minus size={15} />
          </IconButton>
          <IconButton title="Развернуть окно" onClick={() => window.nexLauncher?.maximize()}>
            <Maximize2 size={14} />
          </IconButton>
          <IconButton title="Закрыть окно" onClick={() => window.nexLauncher?.close()}>
            <X size={16} />
          </IconButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Сайдбар */}
        <aside className={`${collapsed ? "w-[72px]" : "w-[240px]"} flex shrink-0 flex-col rounded-2xl bg-[#1A1A1A] p-3 transition-all duration-200`}>
          <button onClick={() => setCollapsed(!collapsed)}
            className="mb-4 flex h-10 items-center gap-3 rounded-lg px-3 text-xs
            font-semibold text-gray-500 hover:bg-[#252525] hover:text-white">
            <ChevronLeft size={18} className={collapsed ? "rotate-180" : ""} />
            {!collapsed && "Свернуть"}
          </button>
          <nav className="space-y-1">
            {nav.map(({ id, label, Icon, badge }) => (
              <button key={id} onClick={() => setPage(id)}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3
                text-left text-sm font-semibold transition ${
                  page === id
                    ? "bg-[#5dbb3a]/15 text-[#72c952]"
                    : "text-gray-400 hover:bg-[#252525] hover:text-white"
                }`}>
                <Icon size={20} className={page === id ? "text-[#5DBB3A]" : "text-gray-400"} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && badge && <span className="grid h-5 w-5 place-items-center rounded-md bg-[#5DBB3A] text-[11px] font-bold text-black">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <button onClick={() => setPage("settings")}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3
              text-sm font-semibold transition ${
                page === "settings"
                  ? "bg-[#5dbb3a]/15 text-[#72c952]"
                  : "text-gray-400 hover:bg-[#252525] hover:text-white"
              }`}>
              <Settings size={18} />
              {!collapsed && "Настройки"}
            </button>
            <button onClick={() => { setTempName(username); setShowNameModal(true); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[#252525]">
              <img src="https://placehold.co/80x80/daa38b/242424?text=P"
                alt="Аватар" className="h-10 w-10 rounded-xl" />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{username}</div>
                  <div className="truncate text-xs text-gray-500">Guest Mode</div>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Контент */}
        <main className="min-w-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {page === "play" && (
            <div className="space-y-6 pb-6">
              <section className="relative h-[320px] overflow-hidden rounded-2xl bg-[#27252c]">
                <img src="https://placehold.co/1500x600/625b65/c9d7c3?text=NEX+LAUNCHER"
                  alt="Пейзаж Minecraft" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/5" />
                <div className="absolute right-4 top-4 flex gap-2">
                  <IconButton title="Звук"><Volume2 size={17} /></IconButton>
                  <IconButton title="Фон"><ImageIcon size={17} /></IconButton>
                </div>
                <div className="absolute inset-x-8 bottom-8 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-1 text-[11px] font-extrabold tracking-[0.14em] text-[#c2d4b6]">
                      ПРОДОЛЖИТЬ
                    </p>
                    <h1 className="truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      {selected?.name || "Нет сборки"}
                    </h1>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold">
                        {selected?.modLoader || "—"}
                      </span>
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold">
                        {selected?.mcVersion || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button className="grid h-14 w-14 place-items-center rounded-2xl bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition">
                      <Settings size={19} />
                    </button>
                    <button onClick={launch} disabled={status === "downloading" || !selected}
                      className="flex h-14 items-center gap-3 rounded-2xl bg-[#5DBB3A] px-8 text-[16px] font-bold text-white shadow-lg shadow-[#5DBB3A]/20 transition hover:bg-[#6ED44A] hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70">
                      {status === "downloading"
                        ? <RefreshCw size={18} className="animate-spin" />
                        : <Play size={18} />}
                      {status === "downloading" ? "Загрузка" : "Играть"}
                    </button>
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3
                rounded-xl border border-[#292929] bg-[#191919] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-200">
                      Сервер: {selected?.server?.name || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selected?.server?.ip || "—"}:{selected?.server?.port || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-[#5dbb3a]" : "bg-yellow-500"}`} />
                  {apiOnline ? "API подключён" : "API не подключён"}
                </div>
              </div>

              {(status !== "idle" || error) && (
                <div className="rounded-xl border border-[#303030] bg-[#1b1b1b] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {status === "done" || status === "started"
                        ? <CheckCircle size={17} className="text-[#5dbb3a]" />
                        : <Download size={17} className="text-[#80cf5e]" />}
                      {message}
                    </div>
                    <span className="text-xs tabular-nums text-gray-400">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#303030]">
                    <div className="h-full rounded-full bg-[#5dbb3a] transition-all duration-300"
                      style={{ width: `${progress}%` }} />
                  </div>
                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </div>
              )}

              <section>
                <SectionTitle action={{ label: "Все сборки", onClick: () => setPage("builds") }}>
                  Мои сборки
                </SectionTitle>
                <div className="flex flex-wrap gap-4">
                  {packs.length === 0 && localBuilds.length === 0 && <div className="flex min-h-[180px] w-full max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-[#333] p-6 text-center"><Box size={34} className="mb-3 text-gray-600" /><p className="font-bold text-white">Пока нет сборок</p><p className="mt-2 text-sm text-gray-500">Добавь сборку через API, чтобы запустить Minecraft.</p></div>}
                  {packs.map(pack => (
                    <button key={pack.id} onClick={() => setSelected(pack)}
                      className={`group w-[140px] overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 ${
                        selected?.id === pack.id
                          ? "border-[#5dbb3a]/50 bg-[#233522]"
                          : "border-[#2b2b2b] bg-[#1e1e1e] hover:border-[#444]"
                      }`}>
                      <div className="grid h-[140px] place-items-center bg-gradient-to-br from-[#6a5f73] to-[#2e2a33]">
                        <Box size={52} strokeWidth={1.2}
                          className="text-white/60 transition group-hover:scale-110" />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-[13px] font-bold text-[#76c953]">{pack.name}</p>
                        <p className="mt-1 truncate text-[11px] text-gray-400">
                          {pack.modLoader} · {pack.mcVersion}
                        </p>
                      </div>
                    </button>
                  ))}
                  {localBuilds.map(build => (
                    <button key={build.id} onClick={() => setSelected({ ...build, isLocal: true, server: null })}
                      className="group w-[140px] overflow-hidden rounded-2xl border border-[#2b2b2b] bg-[#1e1e1e] text-left transition hover:-translate-y-1 hover:border-[#5dbb3a]">
                      <div className="grid h-[140px] place-items-center bg-gradient-to-br from-[#435b3d] to-[#202b1d]"><Box size={48} className="text-white/70" /></div>
                      <div className="p-3"><p className="truncate text-[13px] font-bold text-[#76c953]">{build.name}</p><p className="mt-1 truncate text-[11px] text-gray-400">{build.modLoader} · {build.mcVersion}</p></div>
                    </button>
                  ))}
                  <button onClick={() => setShowBuildModal(true)} className="flex h-[224px] w-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#333] text-gray-500 transition hover:border-[#5DBB3A] hover:bg-[#5DBB3A]/5 hover:text-[#5DBB3A]"><Plus size={28} /><span className="text-[13px] font-bold">Новая сборка</span></button>
                </div>
              </section>
              <section>
                <SectionTitle action={{ label: "Все серверы", onClick: () => setPage("servers") }}>Рекомендуемые серверы</SectionTitle>
                <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-[#2b2b2b] bg-[#1A1A1A] p-4 transition hover:border-[#444]">
                  <img src="https://placehold.co/320x90/332b24/d4a454?text=MineTown" alt="Демонстрационный баннер сервера" className="h-[90px] w-full rounded-xl object-cover sm:w-[320px]" />
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><h3 className="text-[16px] font-bold text-white">MineTown RP</h3><span className="h-2 w-2 rounded-full bg-[#5DBB3A]" /><span className="text-[13px] text-gray-400 font-medium">Пример сервера</span></div><p className="mt-2 text-[13px] text-gray-400">Демонстрационная карточка — адрес сервера не настроен.</p><span className="mt-3 inline-block rounded-md bg-[#F5A623]/15 px-2.5 py-1 text-[11px] font-bold text-[#F5A623]">Не подключён</span></div>
                </div>
              </section>
            </div>
          )}

          {page === "builds" && (
            <section className="space-y-5 py-3">
              <div className="flex flex-col gap-3"><div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-white">Мои сборки</h1><button onClick={() => setShowBuildModal(true)} className="rounded-lg bg-[#5dbb3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#6ed44a]"><Plus size={16} className="mr-1 inline" />Создать</button></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><button onClick={() => handleImport("prism")} className="rounded-xl border border-[#333] bg-[#1a1a1a] p-3 text-left text-sm text-white transition hover:border-[#5dbb3a]">📦 Импорт из Prism Launcher</button><button onClick={() => handleImport("tlauncher")} className="rounded-xl border border-[#333] bg-[#1a1a1a] p-3 text-left text-sm text-white transition hover:border-[#5dbb3a]">📦 Импорт из TLauncher / .minecraft</button><button onClick={() => handleImport("zip")} className="rounded-xl border border-[#333] bg-[#1a1a1a] p-3 text-left text-sm text-white transition hover:border-[#5dbb3a]">🗜 Импорт готовой сборки ZIP</button></div></div>
              {localBuilds.map(build => (
                <div key={build.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#2b2b2b] bg-[#1c1c1c] p-4">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#253c21]"><Box size={28} /></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-bold">{build.name}</p><p className="mt-1 text-xs text-gray-500">{build.modLoader} · Minecraft {build.mcVersion}</p></div>
                  <button onClick={() => { setSelected({ ...build, isLocal: true, server: null }); setPage("play"); }} className="rounded-lg bg-[#5dbb3a] px-4 py-2 text-sm font-bold text-white hover:bg-[#6ed44a]">Выбрать</button>
                  <button onClick={() => { setSelected({ ...build, isLocal: true, server: null }); setShowModsModal(true); }} className="rounded-lg border border-[#393939] px-3 py-2 text-sm hover:bg-[#292929]">Моды</button>
                </div>
              ))}
              {packs.map(pack => (
                <div key={pack.id} className="flex items-center gap-4 rounded-xl
                  border border-[#2b2b2b] bg-[#1c1c1c] p-4">
                  <div className="grid h-14 w-14 place-items-center rounded-xl
                    bg-gradient-to-br from-[#777080] to-[#302d36]">
                    <Box size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{pack.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {pack.modLoader} · Minecraft {pack.mcVersion}
                    </p>
                  </div>
                  <button onClick={() => { setSelected(pack); setPage("play"); }}
                    className="rounded-lg bg-[#5dbb3a] px-4 py-2 text-sm font-bold
                    text-white hover:bg-[#6ed44a]">
                    Выбрать
                  </button>
                </div>
              ))}
            </section>
          )}

          {page === "mods" && (
            <section className="flex h-full min-h-0 flex-col gap-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Моды</h1>
                  <p className="mt-1 text-sm text-gray-500">Поиск и установка модов из Modrinth</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Сборка:</span>
                  <select
                    value={selected?.isLocal ? selected.id : ""}
                    onChange={e => {
                      const build = localBuilds.find(item => item.id === e.target.value);
                      if (build) setSelected({ ...build, isLocal: true, server: null });
                    }}
                    className="max-w-[240px] rounded-lg border border-[#333] bg-[#121212] px-3 py-2 text-white outline-none focus:border-[#5DBB3A]"
                  >
                    <option value="">Выбери локальную сборку</option>
                    {localBuilds.map(build => <option key={build.id} value={build.id}>{build.name} · {build.mcVersion}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#2b2b2b] bg-[#1A1A1A] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Версия Minecraft</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selected?.isLocal ? selected.mcVersion : "Не выбрана"}</p>
                </div>
                <div className="rounded-xl border border-[#2b2b2b] bg-[#1A1A1A] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Загрузчик модов</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selected?.isLocal ? selected.modLoader : "Не выбрана"}</p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => { setModSource("modrinth"); setSearchResults([]); }} className={"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition " + (modSource === "modrinth" ? "bg-[#5DBB3A]/15 text-[#5DBB3A]" : "bg-[#1A1A1A] text-gray-400 hover:text-white")}>
                  <Box size={16} /> Modrinth
                </button>
                <button type="button" onClick={() => { setModSource("curseforge"); setSearchResults([]); }} className={"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition " + (modSource === "curseforge" ? "bg-[#F5A623]/15 text-[#F5A623]" : "bg-[#1A1A1A] text-gray-400 hover:text-white")}>
                  <Flame size={16} /> CurseForge
                </button>
              </div>
              <form className="flex shrink-0 gap-2" onSubmit={async e => {
                e.preventDefault();
                if (!searchQuery.trim()) return;
                setIsSearching(true);
                try {
                  setSearchResults([]);
                  const params = { query: searchQuery.trim(), mcVersion: selected?.isLocal ? selected.mcVersion : "", loader: selected?.isLocal ? selected.modLoader : "" };
                  const results = modSource === "curseforge"
                    ? await window.nexLauncher.searchModsCurseForge(params)
                    : await window.nexLauncher.searchMods(params);
                  setSearchResults(results);
                } catch (err) {
                  alert("Ошибка поиска " + (modSource === "curseforge" ? "CurseForge" : "Modrinth") + ": " + (err.message || "не удалось выполнить поиск"));
                } finally {
                  setIsSearching(false);
                }
              }}>
                <div className="relative min-w-0 flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск модов по названию..."
                    className="w-full rounded-lg border border-[#333] bg-[#121212] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#5DBB3A]" />
                </div>
                <button type="submit" disabled={isSearching || !searchQuery.trim()}
                  className="rounded-lg bg-[#5DBB3A] px-5 font-bold text-white transition hover:bg-[#6ED44A] disabled:opacity-50">
                  {isSearching ? "Поиск…" : "Найти"}
                </button>
              </form>

              <div className="custom-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-[#2b2b2b] bg-[#1A1A1A]">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#222] text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-3 font-semibold">Мод</th>
                      <th className="p-3 text-right font-semibold">Скачивания</th>
                      <th className="p-3 text-right font-semibold">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b]">
                    {searchResults.map(mod => {
                      const downloadKey = (modSource === "curseforge" ? "curseforge:" : "modrinth:") + mod.id;
                      const downloadState = modDownloads[downloadKey];
                      const busy = ["starting", "downloading"].includes(downloadState?.status);
                      return (
                        <tr key={mod.id} className="transition hover:bg-[#222]">
                          <td className="p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {mod.icon ? <img src={mod.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-[#333] object-cover" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#303030]"><Box size={19} /></div>}
                              <div className="min-w-0">
                                <p className="font-bold text-white">{mod.title}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{mod.description}</p>
                                {downloadState?.status === "error" && <p className="mt-1 text-xs text-red-400">{downloadState.error || "Ошибка скачивания"}</p>}
                                {busy && <div className="mt-2 max-w-xs">
                                  <div className="mb-1 flex justify-between text-[11px] text-[#9be47d]"><span>{downloadState.status === "starting" ? "Подготовка…" : "Скачивание…"}</span><span>{downloadState.progress}%</span></div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-[#333]"><div className="h-full rounded-full bg-[#5dbb3a] transition-all" style={{ width: downloadState.progress + "%" }} /></div>
                                </div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-400">{Number(mod.downloads || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            {downloadState?.status === "done" ? (
                              <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap font-bold text-[#5DBB3A]"><CheckCircle size={15} /> Установлен</span>
                            ) : (
                              <button disabled={!selected?.isLocal || modAction === mod.id || busy}
                                onClick={async () => {
                                  if (!selected?.isLocal) {
                                    alert("Сначала выбери локальную сборку в верхней части вкладки.");
                                    return;
                                  }
                                  setModAction(mod.id);
                                  try {
                                    if (modSource === "curseforge") await window.nexLauncher.installModCurseForge({ projectId: mod.id, buildId: selected.id });
                                    else await window.nexLauncher.installMod({ projectId: mod.id, buildId: selected.id });
                                    setModDownloads(prev => ({ ...prev, [downloadKey]: { progress: 100, status: "done" } }));
                                  } catch (err) {
                                    setModDownloads(prev => ({ ...prev, [downloadKey]: { progress: 0, status: "error", error: err.message || "Ошибка установки" } }));
                                  } finally {
                                    setModAction("");
                                  }
                                }}
                                className="min-w-[112px] rounded-lg bg-[#303f2a] px-3 py-2 text-xs font-bold text-[#9be47d] transition hover:bg-[#3a5032] disabled:cursor-not-allowed disabled:opacity-40">
                                {busy ? "Скачивание…" : modAction === mod.id ? "Подготовка…" : downloadState?.status === "error" ? "Повторить" : "Установить"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!searchResults.length && (
                  <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                    <Search size={28} className="mb-3 text-gray-600" />
                    <p className="text-sm text-gray-400">{isSearching ? "Ищем моды…" : "Введи название мода и нажми «Найти»."}</p>
                  </div>
                )}
              </div>
              {!selected?.isLocal && <p className="shrink-0 text-xs text-amber-300">Для установки выбери локальную сборку или создай её в разделе «Мои сборки».</p>}
              {selected?.isLocal && <p className="shrink-0 text-xs text-gray-500">Моды сохраняются в папку выбранной сборки. Для запуска требуется совместимый установленный загрузчик Fabric, Forge, NeoForge или Quilt.</p>}
            </section>
          )}

          {page === "content" && (
            <section className="space-y-5 py-3">
              <h1 className="text-2xl font-extrabold text-white">Контент</h1>
              <p className="text-sm text-gray-500">
                Содержимое сборки: {selected?.name || "не выбрана"}.
              </p>
              <div className="flex flex-wrap gap-3 rounded-xl border border-[#2b2b2b] bg-[#1b1b1b] p-5">
                <button disabled={!selected?.isLocal} onClick={() => setShowModsModal(true)} className="rounded-lg bg-[#5dbb3a] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Search size={16} className="mr-2 inline" />Найти моды на Modrinth</button>
                <button onClick={() => handleImport("tlauncher")} className="rounded-lg border border-[#393939] px-4 py-2 text-sm font-bold hover:bg-[#292929]"><Upload size={16} className="mr-2 inline" />Импорт сборки из TLauncher</button>
                {!selected?.isLocal && <p className="w-full text-xs text-gray-500">Для управления модами выбери или создай локальную сборку.</p>}
                {selected?.isLocal && <p className="w-full text-xs text-gray-500">Локальная папка сборки: instances/{selected.id}. Для запуска модов нужен соответствующий загрузчик.</p>}
              </div>
            </section>
          )}

          {["servers", "skins", "friends", "myserver"].includes(page) && (
            <section className="space-y-4 py-3">
              <h1 className="text-2xl font-extrabold text-white">{nav.find(item => item.id === page)?.label}</h1>
              <div className="rounded-2xl border border-[#2b2b2b] bg-[#1A1A1A] p-6 text-sm text-gray-400">Этот раздел пока в разработке. Здесь появится функциональность NexLauncher.</div>
            </section>
          )}

          {page === "settings" && (
            <section className="max-w-2xl space-y-5 py-3">
              <h1 className="text-2xl font-extrabold text-white">Настройки</h1>
              <div className="space-y-5 rounded-xl border border-[#2b2b2b] bg-[#1b1b1b] p-5">
                <label className="block text-sm font-semibold">
                  API-адрес (InfinityFree)
                  <input value={API_BASE} readOnly
                    className="mt-2 w-full rounded-lg border border-[#333] bg-[#121212]
                    px-3 py-2.5 text-gray-400 outline-none" />
                </label>
                <label className="block text-sm font-semibold">
                  Оперативная память
                  <select defaultValue="4096"
                    className="mt-2 w-full rounded-lg border border-[#333] bg-[#121212]
                    px-3 py-2.5 outline-none focus:border-[#5dbb3a]">
                    <option value="2048">2 ГБ</option>
                    <option value="4096">4 ГБ</option>
                    <option value="6144">6 ГБ</option>
                    <option value="8192">8 ГБ</option>
                  </select>
                </label>
                <p className="text-xs text-gray-500">
                  Настройки сохраняются автоматически. Для публичного сервера
                  используйте лицензионную авторизацию Microsoft (Guest Mode небезопасен).
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
      {showBuildModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#333] bg-[#1b1b1b] p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-bold text-white">Создать сборку</h2>
            <label className="mb-4 block text-sm font-semibold">Название<input value={buildName} onChange={e => setBuildName(e.target.value)} maxLength={40} placeholder="Моя сборка" className="mt-2 w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2.5 text-white outline-none focus:border-[#5DBB3A]" /></label>
            <label className="mb-4 block text-sm font-semibold">Версия Minecraft<input value={buildVersion} onChange={e => setBuildVersion(e.target.value)} placeholder="1.20.1" className="mt-2 w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2.5 text-white outline-none focus:border-[#5DBB3A]" /></label>
            <label className="block text-sm font-semibold">Загрузчик<select value={buildLoader} onChange={e => setBuildLoader(e.target.value)} className="mt-2 w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2.5 text-white outline-none focus:border-[#5DBB3A]"><option>Vanilla</option><option>Fabric</option><option>Forge</option><option>NeoForge</option><option>Quilt</option></select></label>
            <p className="mt-3 text-xs text-gray-500">Профиль и папка создаются локально. Автоматическая установка Fabric/Forge для запуска модов пока не реализована.</p>
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowBuildModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Отмена</button><button onClick={async () => { try { const build = await window.nexLauncher.createLocalBuild({ name: buildName, mcVersion: buildVersion, modLoader: buildLoader }); setLocalBuilds(prev => [...prev, build]); setSelected({ ...build, isLocal: true, server: null }); setBuildName(""); setShowBuildModal(false); setPage("builds"); } catch (e) { alert(e.message); } }} className="rounded-lg bg-[#5DBB3A] px-4 py-2 font-bold text-white hover:bg-[#6ED44A]">Создать</button></div>
          </div>
        </div>
      )}
      {showModsModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[#333] bg-[#1b1b1b] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Моды Modrinth</h2><button onClick={() => setShowModsModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-[#303030] hover:text-white"><X size={18} /></button></div>
            <p className="mb-3 text-xs text-gray-500">Сборка: {selected?.name} · Minecraft {selected?.mcVersion} · {selected?.modLoader}</p>
            <div className="flex gap-2"><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Название мода..." className="min-w-0 flex-1 rounded-lg border border-[#333] bg-[#121212] px-3 py-2.5 text-white outline-none focus:border-[#5DBB3A]" /><button disabled={isSearching} onClick={async () => { setIsSearching(true); try { setSearchResults(await window.nexLauncher.searchMods({ query: searchQuery, mcVersion: selected?.mcVersion, loader: selected?.modLoader })); } catch (e) { alert(e.message); } finally { setIsSearching(false); } }} className="rounded-lg bg-[#5DBB3A] px-4 py-2 font-bold text-white disabled:opacity-50">{isSearching ? "Поиск…" : "Найти"}</button></div>
            <div className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{searchResults.map(mod => {
              const downloadState = modDownloads[mod.id];
              return <div key={mod.id} className="flex items-center gap-3 rounded-xl border border-[#303030] bg-[#202020] p-3">{mod.icon ? <img src={mod.icon} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#303030]"><Box size={20} /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{mod.title}</p><p className="line-clamp-2 text-xs text-gray-500">{mod.description}</p><p className="mt-1 text-[11px] text-gray-600">{Number(mod.downloads || 0).toLocaleString()} загрузок</p>{downloadState && ["starting", "downloading"].includes(downloadState.status) && <div className="mt-2"><div className="mb-1 flex justify-between text-[11px] text-[#9be47d]"><span>{downloadState.status === "starting" ? "Подготовка скачивания…" : "Скачивание…"}</span><span>{downloadState.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#303030]"><div className="h-full rounded-full bg-[#5dbb3a] transition-all duration-200" style={{ width: downloadState.progress + "%" }} /></div></div>}{downloadState?.status === "error" && <p className="mt-1 text-[11px] text-red-400">{downloadState.error || "Ошибка скачивания"}</p>}</div><div className="w-28 shrink-0">{downloadState?.status === "done" ? <button disabled className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#2b2b2b] px-2 py-2 text-xs text-gray-400"><CheckCircle size={14} />Установлен</button> : <button disabled={modAction === mod.id || ["starting", "downloading"].includes(downloadState?.status)} onClick={async () => { setModAction(mod.id); try { await window.nexLauncher.installMod({ projectId: mod.id, buildId: selected.id }); setModDownloads(prev => ({ ...prev, [mod.id]: { progress: 100, status: "done" } })); } catch (e) { setModDownloads(prev => ({ ...prev, [mod.id]: { progress: 0, status: "error", error: e.message } })); } finally { setModAction(""); } }} className="w-full rounded-lg bg-[#303f2a] px-2 py-2 text-xs font-bold text-[#9be47d] hover:bg-[#3a5032] disabled:opacity-50">{modAction === mod.id ? "…" : downloadState?.status === "error" ? "Повторить" : "Установить"}</button>}</div></div>;
            })}
              {!searchResults.length && <p className="py-8 text-center text-sm text-gray-500">Введи название и нажми «Найти».</p>}
            </div><p className="mt-3 text-xs text-gray-600">Для запуска модов необходим установленный совместимый загрузчик.</p>
          </div>
        </div>
      )}
      {showNameModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#333] bg-[#1b1b1b] p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-white">Сменить ник</h2>
            <input value={tempName} maxLength={16} onChange={e => setTempName(e.target.value)} placeholder="Например, Player123" className="w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2.5 text-white outline-none focus:border-[#5DBB3A]" />
            <p className="mt-2 text-xs text-gray-500">3–16 символов: латинские буквы, цифры и подчёркивание.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNameModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Отмена</button>
              <button onClick={async () => { try { const saved = await window.nexLauncher.setUsername(tempName); setUsername(saved.username); setShowNameModal(false); } catch (e) { alert(e.message); } }} className="rounded-lg bg-[#5DBB3A] px-4 py-2 font-bold text-white hover:bg-[#6ED44A]">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
