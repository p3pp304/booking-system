import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Users, Settings, LogOut, Scissors } from 'lucide-react';
import Footer from './Footer';

export default function AdminLayout() {
  const navigate = useNavigate();
  const role = localStorage.getItem('staff_role') || 'staff';
  const staffName = localStorage.getItem('staff_name') || 'Operatore';

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_worker_id');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Agenda', path: '/admin/schedule', icon: Calendar, roles: ['admin', 'staff'] },
    { label: 'Staff & Team', path: '/admin/workers', icon: Users, roles: ['admin'] },
    { label: 'Impostazioni', path: '/admin/settings', icon: Settings, roles: ['admin'] },
  ];

return (
  <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
    
    {/* --- HEADER SUPERIORE MOBILE (nascosto su desktop) --- */}
    <header className="md:hidden flex items-center justify-between p-3 bg-zinc-950/95 border-b border-zinc-900 sticky top-0 z-30 backdrop-blur-md">
      <div 
        onClick={() => navigate('/admin/schedule')}
        className=" pl-3 flex items-center gap-2 cursor-pointer select-none transition-transform duration-200 ease-out hover:scale-105 active:scale-95 origin-left"
      >
        <span className="text-xs uppercase tracking-[0.2em] font-extrabold text-white">
          ATELIER // BARBER
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 px-2.5 py-1 rounded-xl">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-800 text-zinc-100">
            <Scissors className="w-3 h-3 text-zinc-300" />
          </div>
          <span className="text-xs font-medium text-zinc-200 truncate max-w-[100px]">
            {staffName}
          </span>
        </div>

        <button
          onClick={handleLogout}
          title="Esci"
          className="p-1.5 rounded-lg cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>

    {/* --- SIDEBAR DESKTOP (nascosta su mobile) --- */}
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 h-screen sticky top-0 flex-col justify-between p-4 bg-zinc-950 border-r border-zinc-800/80 text-zinc-100 z-30">
      <div className="flex flex-col gap-4">
        {/* Header Desktop */}
        <div className="flex items-center justify-between gap-3 px-3 py-3 border border-zinc-800/80 bg-zinc-900/30 rounded-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0 w-9 h-9 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/60 shadow-inner text-zinc-100">
              <Scissors className="w-4 h-4 text-zinc-200" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-xs font-semibold text-zinc-100 tracking-tight truncate leading-tight">
                {staffName}
              </span>
              <span className="text-[10px] tracking-wide font-medium text-zinc-400 capitalize truncate mt-0.5">
                {role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Esci dal gestionale"
            className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Salone Desktop */}
        <div 
            onClick={() => navigate('/admin/schedule')}
            className="w-full flex items-center justify-center gap-2 text-center cursor-pointer select-none transition-transform duration-200 ease-out hover:scale-105 active:scale-95 origin-center"
        >
            <span className="flex items-center text-xs uppercase tracking-[0.2em] font-extrabold text-white">
            ATELIER // BARBER
            </span>
        </div>

        {/* Menu Desktop */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems
            .filter((item) => item.roles.includes(role))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/70'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>
      </div>
        <footer className="mt-2 text-center select-none">
        <p className="text-[10px] text-zinc-400">
            Created by{" "}
            <a
            href="https://www.linkedin.com/in/giuseppe-fuzio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-zinc-200 hover:text-white transition-colors"
            >
            Giuseppe Fuzio
            </a>
        </p>

        <p className="mt-1 text-[9px] tracking-wide text-zinc-600">
            © {new Date().getFullYear()} All rights reserved.
        </p> 
        </footer>
    </aside>

    {/* --- CONTENITORE CONTENUTO PRINCIPALE --- */}
    {/* pb-24 su mobile per non sovrapporsi alla navbar fissa in basso */}
    <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
      <Outlet />
    </main>

    {/* --- BOTTOM NAVBAR MOBILE (fissa in basso su mobile, nascosta su desktop) --- */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-lg px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around gap-1">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                    isActive
                      ? 'text-white bg-zinc-800/80 border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] tracking-tight font-medium truncate max-w-full">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
      </div>
    </nav>

  </div>
)};