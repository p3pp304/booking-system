import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
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

      {/* Accesso Discreto Gestionale Staff */}
      <div className="mt-2.5 flex justify-center">
        <button
          onClick={() => navigate('/admin/login')}
          className="group inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-zinc-600 hover:text-zinc-300 transition-colors py-1 px-2.5 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 cursor-pointer"
        >
          <Lock className="w-2.5 h-2.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          <span>Area Riservata</span>
        </button>
      </div>
    </footer>
  );
}