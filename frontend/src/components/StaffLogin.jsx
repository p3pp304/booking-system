import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { loginAdmin } from '../api/adminApi';

export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await loginAdmin({ email: email.trim().toLowerCase(), password });

      // Salva sessione
      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_role', data.user.role);
      localStorage.setItem('staff_name', data.user.name);
      if (data.user.workerId) {
        localStorage.setItem('staff_worker_id', data.user.workerId);
      }

      navigate('/admin/schedule');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-zinc-900 shadow-2xl">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center mb-5 mx-auto">
          <Lock className="w-5 h-5" />
        </div>

        <h1 className="text-lg font-bold text-center text-white tracking-tight">
          Area Riservata Staff
        </h1>
        <p className="text-xs text-zinc-500 text-center mt-1 mb-6">
          Accedi per gestire l'agenda e gli appuntamenti
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@atelierbarber.it"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-500 transition"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none focus:border-zinc-500 transition"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Entra nel gestionale</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}