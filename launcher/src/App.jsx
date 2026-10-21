import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_NEXLAUNCHER_API || 'http://localhost/nexlauncher/api/index.php';

export default function App() {
  const [packs, setPacks] = useState([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('Выбери сборку для установки');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('nexlauncher-player') || 'Player'; } catch { return 'Player'; }
  });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}?list=1`)
      .then((r) => { if (!r.ok) throw new Error('API вернул ошибку'); return r.json(); })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data.packs) ? data.packs.filter((p) => p.enabled !== false) : [];
        setPacks(items);
        if (items.length) setSelected(items[0].id);
        setStatus(items.length ? 'Сборки загружены' : 'Добавь сборки через PHP-админку');
      })
      .catch(() => { if (active) setStatus('API недоступен — проверь адрес в конфигурации'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const current = packs.find((p) => p.id === selected);

  function savePlayerName() {
    const clean = nameDraft.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(clean)) {
      setStatus('Ник должен быть 3–16 символов: латиница, цифры или подчёркивание');
      return;
    }
    setPlayerName(clean);
    try { localStorage.setItem('nexlauncher-player', clean); } catch {}
    setEditingName(false);
    setStatus(`Offline-профиль сохранён: ${clean}`);
  }

  async function installSelected() {
    if (!current) { setStatus('Сначала выбери сборку'); return; }
    if (!window.nexLauncher?.installPack) { setStatus('Установка ZIP доступна в настольной версии Electron'); return; }
    setBusy(true);
    setStatus('Скачивание архива сборки…');
    try {
      const result = await window.nexLauncher.installPack(current);
      setStatus(result.message || 'Архив установлен');
    } catch (error) {
      setStatus(error?.message || 'Не удалось установить архив');
    } finally { setBusy(false); }
  }

  async function openFolder() {
    if (!current || !window.nexLauncher?.openPackFolder) { setStatus('Эта функция доступна в приложении Electron'); return; }
    try { await window.nexLauncher.openPackFolder(current.id); }
    catch (error) { setStatus(error?.message || 'Папка сборки ещё не создана'); }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span>NexLauncher<small>MINECRAFT LAUNCHER</small></span></div>
        <nav><button className="nav-item active">⌂ <span>Главная</span></button><button className="nav-item" onClick={() => setStatus('Выбери сборку в каталоге ниже')}>▦ <span>Сборки</span></button><button className="nav-item" onClick={() => setEditingName(true)}>♙ <span>Offline-профиль</span></button></nav>
        <div className="sidebar-bottom"><span className="online-dot" /> Локальный профиль</div>
      </aside>
      <section className="content">
        <header className="topbar"><span>ГЛАВНАЯ</span><button className="profile profile-button" onClick={() => { setNameDraft(playerName); setEditingName(!editingName); }}><span className="avatar">{playerName.slice(0,1).toUpperCase()}</span><span>{playerName}</span><span>✎</span></button></header>
        {editingName && <div className="name-panel"><label>Имя игрока (Offline)<input value={nameDraft} maxLength={16} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && savePlayerName()} placeholder="Player_123" /></label><button className="primary" onClick={savePlayerName}>Сохранить ник</button><button className="secondary-action" onClick={() => setEditingName(false)}>Отмена</button></div>}
        <div className="hero">
          <div className="hero-copy"><div className="eyebrow">ТВОЁ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ ЗДЕСЬ</div><h1>Твой мир.<br/><span>Твои правила.</span></h1><p>Привет, {playerName}. Выбери сборку, скачай архив и подготовь свой игровой профиль.</p><button className="primary" disabled={busy} onClick={installSelected}>{busy ? 'Загрузка…' : '↓　Установить сборку'}</button><button className="secondary-action" onClick={openFolder}>Открыть папку</button></div>
          <div className="hero-art" aria-hidden="true"><div className="cube cube-back"></div><div className="cube cube-front"></div><div className="pixel pixel-one"></div><div className="pixel pixel-two"></div></div>
        </div>
        <div className="section-heading"><div><span className="eyebrow">ТВОЙ ВЫБОР</span><h2>Доступные сборки</h2></div><span className="pack-count">{packs.length} сборок</span></div>
        {loading ? <div className="empty-state">Загрузка сборок…</div> : packs.length === 0 ? <div className="empty-state">Сборок пока нет. Добавь сборку через PHP-админку, укажи HTTPS-ссылку на ZIP-архив и сохрани.</div> :
          <div className="pack-grid">{packs.map((pack) => <button key={pack.id} className={`pack-card ${selected === pack.id ? 'selected' : ''}`} onClick={() => { setSelected(pack.id); setStatus(`Выбрана сборка «${pack.name}»`); }}><span className="pack-icon">▦</span><span className="pack-name">{pack.name}</span><span className="pack-meta">Minecraft {pack.mcVersion || '—'} · {(pack.modLoader || 'Vanilla').toUpperCase()}</span><span className="pack-arrow">↗</span></button>)}</div>}
        <footer className="statusbar"><span className="online-dot" />{status}<span className="version">NEXLAUNCHER 0.1.0 · OFFLINE PROFILE</span></footer>
      </section>
    </main>
  );
}
