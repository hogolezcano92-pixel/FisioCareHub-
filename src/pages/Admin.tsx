import { useEffect } from 'react';

/**
 * Compatibility shell for the legacy /admin route.
 * The administrative panel now lives in the dedicated Admin application.
 * Keep this lightweight route temporarily so old links do not crash the main app.
 */
export default function Admin() {
  useEffect(() => {
    const adminUrl = import.meta.env.VITE_ADMIN_APP_URL;
    if (adminUrl) {
      window.location.replace(adminUrl);
    }
  }, []);

  const adminUrl = import.meta.env.VITE_ADMIN_APP_URL;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Painel administrativo atualizado</h1>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          O painel administrativo do FisioCareHub foi migrado para uma aplicação administrativa independente.
        </p>
        {adminUrl ? (
          <a
            href={adminUrl}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-white font-bold"
          >
            Abrir painel administrativo
          </a>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesse a aplicação Admin dedicada para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
