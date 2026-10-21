import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_NEXLAUNCHER_API || 'http://localhost/nexlauncher/api/index.php';

export default function App() {
  const [packs, setPacks] = useState([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('Выбери сборку и нажми «Играть»');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}?list=1`)
      .then((r) => {
        if (!r.ok) throw new Error('API вернул ошибку');
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data.packs) ? data.packs.filter((p) => p.enabled !== false) : [];
        setPacks(items);
        if (items.length) setSelected(items[0].id);
        setStatus(items.length ? 'Сборки загружены' : 'В API пока нет доступных сборок');
      })
      .catch(() => {
        if (active) setStatus('Не удалось подключиться к API. Проверь адрес в настройках проекта.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const current = packs.find((p) => p.id === selected);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span><span>NexLauncher<small>MINECRAFT LAUNCHER</small></span></div>
        <nav><button className="nav-item active">⌂ <span>Главная</span></button><button className="nav-item" onClick={() => setStatus('Выбери сборку в списке справа.')}>▦ <span>Сборки</span></button><button className="nav-item" onClick={() => setStatus('Настройки памяти и Java будут добавлены в следующей версии.')}>⚙ <span>Настройки</span></button></nav>
        <div className="sidebar-bottom"><span className="online-dot" /> Лаунчер готов</div>
      </aside>
      <section className="content">
        <header className="topbar"><span>ГЛАВНАЯ</span><div className="profile"><div className="avatar">N</div><span>Игрок</span></div></header>
        <div className="hero">
          <div className="hero-copy"><div className="eyebrow">ТВОЁ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ ЗДЕСЬ</div><h1>Твой мир.<br/><span>Твои правила.</span></h1><p>Выбирай сборку и отправляйся исследовать мир Minecraft.</p><button className="primary" onClick={() => setStatus(current ? `Сборка «${current.name}» выбрана. Автозапуск Minecraft пока не подключён.` : 'Сначала добавь сборку через API.')}>▶　Играть</button></div>
          <div className="hero-art" aria-hidden="true"><div className="cube cube-back"></div><div className="cube cube-front"></div><div className="pixel pixel-one"></div><div className="pixel pixel-two"></div></div>
        </div>
        <div className="section-heading"><div><span className="eyebrow">ТВОЙ ВЫБОР</span><h2>Доступные сборки</h2></div><span className="pack-count">{packs.length} сборок</span></div>
        {loading ? <div className="empty-state">Загрузка сборок…</div> : packs.length === 0 ? <div className="empty-state">Сборок пока нет. Добавь первую через PHP-админку и укажи ссылку на ZIP-архив.</div> :
          <div className="pack-grid">{packs.map((pack) => <button key={pack.id} className={`pack-card ${selected === pack.id ? 'selected' : ''}`} onClick={() => { setSelected(pack.id); setStatus(`Выбрана сборка «${pack.name}»`); }}><span className="pack-icon">▦</span><span className="pack-name">{pack.name}</span><span className="pack-meta">Minecraft {pack.mcVersion || '—'} · {(pack.modLoader || 'Vanilla').toUpperCase()}</span><span className="pack-arrow">↗</span></button>)}</div>}
        <footer className="statusbar"><span className="online-dot" />{status}<span className="version">NEXLAUNCHER 0.1.0</span></footer>
      </section>
    </main>
  );
}
