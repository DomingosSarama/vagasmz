import React, { useEffect, useRef, useState } from 'react';
import { Bell, Bookmark, BriefcaseBusiness, Building2, ChevronDown, FileText, GraduationCap, Home, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Sun, UserRound, X } from 'lucide-react';
import type { ActivePage } from '../types/index.ts';

interface ChromeProps { activePage: ActivePage; onNavigate: (page: ActivePage) => void; onImport: () => void; }
const primary = [
  { page: 'dashboard', label: 'Visão Geral', icon: Home }, { page: 'explorar', label: 'Explorar Vagas', icon: Search },
  { page: 'estagios', label: 'Estágios', icon: GraduationCap }, { page: 'empresas', label: 'Empresas', icon: Building2 },
  { page: 'candidaturas', label: 'Candidaturas', icon: FileText }, { page: 'alertas', label: 'Alertas', icon: Bell },
] as const;
const account = [
  { page: 'perfil', label: 'Perfil', icon: UserRound }, { page: 'guardadas', label: 'Vagas Guardadas', icon: Bookmark },
] as const;

export function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="VagasMZ — Visão geral"><span className="brand-mark">MZ</span><span className="brand-word">Vagas<span>MZ</span></span></button>;
}
export function AppSidebar({ activePage, onNavigate, onImport }: ChromeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const renderLinks = (links: typeof primary | typeof account) => links.map(({ page, label, icon: Icon }) => <button key={label} title={collapsed ? label : undefined} onClick={() => onNavigate(page)} className={`sidebar-link ${activePage === page ? 'is-active' : ''}`} aria-current={activePage === page ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label}</span></button>);
  return <aside className={`reference-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Navegação lateral principal">
    <div className="sidebar-brand-row"><Brand onClick={() => onNavigate('dashboard')} /><button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button></div>
    <nav aria-label="Menu principal" className="sidebar-navigation">
      <div className="sidebar-group sidebar-primary">{renderLinks(primary)}</div>
      <div className="sidebar-group"><p className="sidebar-group-label">A minha conta</p>{renderLinks(account)}</div>
      <div className="sidebar-group"><p className="sidebar-group-label">Para empresas</p><button className="sidebar-link" onClick={onImport} title="Adicionar anúncio ao catálogo local"><Plus /><span>Publicar Vaga</span></button><button className="sidebar-link" onClick={() => onNavigate('empresas')}><Building2 /><span>Sala da Empresa</span></button></div>
    </nav>
    <div className="sidebar-bottom"><button className="sidebar-promo" onClick={() => onNavigate('empresas')}><BriefcaseBusiness /><strong>A ligar talentos<br />a Moçambique</strong><span>Mais oportunidades.<br />Mais histórias de sucesso.</span><svg viewBox="0 0 220 110" fill="none" aria-hidden="true"><path d="M0 85L40 48L58 61L97 18L143 57L167 38L220 83M0 96L40 59L58 72L97 29L143 68L167 49L220 94M97 29V110M67 62L97 29L127 63M81 47L97 96L113 47" stroke="currentColor" /></svg></button><button className="sidebar-settings" onClick={() => onNavigate('definicoes')}><Settings /><span>Definições e fontes</span></button></div>
  </aside>;
}

interface TopBarProps {
  theme: 'dark' | 'light'; online: boolean; profileName: string; menuOpen: boolean; onToggleMenu: () => void;
  onTheme: (theme: 'dark' | 'light') => void; onSearch: (query: string) => void; onNavigate: (page: ActivePage) => void;
}
export function AppTopBar({ theme, online, profileName, menuOpen, onToggleMenu, onTheme, onSearch, onNavigate }: TopBarProps) {
  const [query, setQuery] = useState(''); const [profileOpen, setProfileOpen] = useState(false); const [statusOpen, setStatusOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null); const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.isContentEditable) { event.preventDefault(); input.current?.focus(); }
      if (event.key === 'Escape') { setProfileOpen(false); setStatusOpen(false); }
    };
    const close = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) { setProfileOpen(false); setStatusOpen(false); } };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', close); };
  }, []);
  const initials = profileName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <header className="reference-topbar">
    <button className="mobile-menu-toggle" onClick={onToggleMenu} aria-label={menuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}>{menuOpen ? <X /> : <Menu />}</button>
    <form className="topbar-search" onSubmit={event => { event.preventDefault(); onSearch(query.trim()); }} role="search"><Search /><input ref={input} aria-label="Pesquisar vagas, empresas ou competências" placeholder="Pesquisar vagas, empresas ou competências..." value={query} onChange={event => setQuery(event.target.value)} /><kbd aria-hidden="true">/</kbd></form>
    <div className="topbar-controls" ref={menu}>
      <button type="button" className="theme-toggle" role="switch" aria-checked={theme === 'dark'} aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'} title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'} onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}><span className={`theme-choice ${theme === 'light' ? 'is-selected' : ''}`} aria-hidden="true"><Sun /></span><span className={`theme-choice ${theme === 'dark' ? 'is-selected' : ''}`} aria-hidden="true"><Moon /></span></button>
      <div className="topbar-menu-anchor"><button className="connection-status" onClick={() => { setStatusOpen(!statusOpen); setProfileOpen(false); }} aria-expanded={statusOpen}><span className={online ? 'status-dot' : 'status-dot is-offline'} /><span>{online ? 'Online' : 'Offline'}</span><ChevronDown /></button>{statusOpen && <div className="topbar-popover"><strong>{online ? 'Ligação disponível' : 'Sem ligação à Internet'}</strong><p>Os teus dados são guardados neste navegador. Consulta o estado de cada fonte nas definições.</p><button onClick={() => { onNavigate('definicoes'); setStatusOpen(false); }}>Ver fontes e sincronização</button></div>}</div>
      <div className="topbar-menu-anchor profile-anchor"><button className="profile-trigger" aria-label="Abrir menu do perfil" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setStatusOpen(false); }}><span className="profile-avatar">{initials || <UserRound />}</span><ChevronDown /></button>{profileOpen && <div className="topbar-popover profile-popover"><strong>{profileName || 'O teu perfil'}</strong><button onClick={() => { onNavigate('perfil'); setProfileOpen(false); }}>Editar perfil</button><button onClick={() => { onNavigate('guardadas'); setProfileOpen(false); }}>Vagas guardadas</button><button onClick={() => { onNavigate('definicoes'); setProfileOpen(false); }}>Definições e fontes</button></div>}</div>
    </div>
  </header>;
}
