import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ClipboardList, Info, PawPrint, Send } from 'lucide-react';
import { useDiary } from '../hooks/useDiary';
import { UpdatePrompt } from './UpdatePrompt';
import { EntryEditorProvider } from './EntryEditor';

const NAV = [
  { to: '/', label: 'Dzienniczek – lista wpisów', short: 'Dzienniczek', Icon: ClipboardList },
  { to: '/dane', label: 'Dane pacjenta i badania', short: 'Dane badania', Icon: PawPrint },
  { to: '/wyslij', label: 'Podgląd, PDF i wysyłka do lekarza', short: 'PDF i wysyłka', Icon: Send },
  { to: '/informacje', label: 'Informacje i nowy dzienniczek', short: 'Informacje', Icon: Info },
];

export function Layout() {
  const { diary } = useDiary();
  const { pathname } = useLocation();
  const petName = diary.patient.petName.trim();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <EntryEditorProvider>
      <div className="app-bg min-h-[100dvh]">
        <header className="sticky top-0 z-30 border-b border-powder/60 bg-offwhite/90 backdrop-blur safe-top print:hidden">
          <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
            <NavLink to="/" aria-label="Łapa na Pulsie – Dzienniczek holterowski" className="flex shrink-0 items-center gap-3">
              <img src="/assets/01_brand/logo_lapa_poziome_granat_transparent.png" alt="Łapa na Pulsie" className="h-10 w-auto" width={101} height={40} />
              <span className="hidden text-[15px] font-extrabold leading-tight sm:block">Dzienniczek holterowski</span>
            </NavLink>
            {petName && (
              <NavLink
                to="/dane"
                className="flex min-h-[40px] max-w-[55%] items-center gap-2 rounded-full bg-cream/80 px-4 text-sm font-bold text-navy"
                aria-label={`Pacjent: ${petName}. Dane badania`}
              >
                <span aria-hidden className="text-burgundy">♥</span>
                <span className="truncate">{petName}</span>
              </NavLink>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 pb-32 pt-5 print:max-w-none print:p-0">
          <UpdatePrompt />
          <Outlet />
        </main>

        <nav aria-label="Główna nawigacja" className="fixed inset-x-0 bottom-0 z-40 border-t border-powder/70 bg-offwhite/95 backdrop-blur safe-bottom print:hidden">
          <ul className="mx-auto grid max-w-2xl grid-cols-4">
            {NAV.map(({ to, label, short, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  aria-label={label}
                  className={({ isActive }) =>
                    `flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-[11.5px] font-bold leading-tight transition ${isActive ? 'text-burgundy' : 'text-navy/75'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-cream' : ''}`}>
                        <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                      </span>
                      {short}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </EntryEditorProvider>
  );
}
