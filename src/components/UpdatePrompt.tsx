import { useRegisterSW } from 'virtual:pwa-register/react';
import { RotateCcw } from 'lucide-react';

/**
 * Bezpieczna aktualizacja: nowa wersja aplikacji jest stosowana dopiero po zgodzie opiekuna.
 * Aktualizacja dotyczy wyłącznie plików aplikacji – dane w pamięci przeglądarki (localStorage) pozostają bez zmian.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="card fade-up mb-4 flex items-center gap-3 !p-4" role="status">
      <RotateCcw className="h-6 w-6 shrink-0 text-caramel" />
      <p className="flex-1 text-sm font-semibold">Dostępna jest nowa wersja aplikacji. Twoje wpisy zostaną zachowane.</p>
      <div className="flex flex-col gap-1">
        <button type="button" className="btn-navy min-h-[40px] px-3 text-sm" onClick={() => updateServiceWorker(true)}>
          Odśwież
        </button>
        <button type="button" className="text-xs font-bold text-navy/60" onClick={() => setNeedRefresh(false)}>
          Później
        </button>
      </div>
    </div>
  );
}
