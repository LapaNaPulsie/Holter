import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RotateCcw } from 'lucide-react';
import { useDiary } from '../hooks/useDiary';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/Modal';
import { InstructionCard, NotMonitoredNote } from '../components/Notes';
import { RECIPIENT_EMAIL } from '../core/labels';
import { downloadFile, makePdfFile } from '../lib/pdfClient';

export function InfoPage() {
  const { diary, resetDiary } = useDiary();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const hasData = diary.entries.length > 0 || !!diary.patient.petName.trim();

  function reset() {
    if (resetDiary()) {
      setConfirm(false);
      toast('Rozpoczęto nowy, pusty dzienniczek.');
      navigate('/dane');
    }
  }

  async function backupPdf() {
    try {
      downloadFile(await makePdfFile(diary));
    } catch {
      toast('Nie udało się przygotować pliku PDF.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="page-title">Informacje</h1>
      <InstructionCard />
      <NotMonitoredNote />

      <section className="card space-y-3">
        <h2 className="section-title">Jak korzystać z dzienniczka</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-navy/85">
          <li>Wpisuj godzinę, o której coś się wydarzyło – nie godzinę dodania wpisu. Wpisy możesz dodawać i poprawiać później.</li>
          <li>Przycisk „Teraz” wpisuje aktualną datę i godzinę. Zawsze możesz ją zmienić.</li>
          <li>Godzinę wpisuj w formacie 24-godzinnym, np. 07:45 albo 21:30. Wystarczy wpisać cyfry, np. 0745.</li>
          <li>Sen zapisuj jako okres: zaśnięcie i przebudzenie. Pobudkę możesz uzupełnić rano. Drzemki i nocne wybudzenia zapisuj osobno.</li>
          <li>Po zakończeniu badania uzupełnij godzinę zdjęcia Holtera, pobierz PDF i wyślij go e-mailem na {RECIPIENT_EMAIL}.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Gdzie są zapisane dane</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-navy/85">
          <li>Dane zapisują się automatycznie wyłącznie w tej przeglądarce, na tym urządzeniu. Nie zakładasz konta.</li>
          <li>Lekarz otrzyma dzienniczek dopiero wtedy, gdy wyślesz mu plik PDF na adres {RECIPIENT_EMAIL}.</li>
          <li>Wpisy nie przenoszą się na inny telefon ani do innej przeglądarki. Prowadź dzienniczek na jednym urządzeniu.</li>
          <li>Na iPhonie: jeśli dodasz stronę do ekranu głównego, korzystaj potem tylko z ikony – ma ona osobną pamięć niż Safari.</li>
          <li>Nie używaj trybu prywatnego (incognito) – po jego zamknięciu wpisy znikają.</li>
          <li>Po pobraniu PDF dane pozostają zapisane, dopóki nie rozpoczniesz nowego dzienniczka.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Nowe badanie</h2>
        <p className="text-[15px] leading-relaxed text-navy/85">Rozpoczęcie nowego dzienniczka usuwa z tego urządzenia wszystkie obecne wpisy i dane pacjenta.</p>
        <button type="button" className="btn-danger w-full" onClick={() => setConfirm(true)}>
          <RotateCcw className="h-5 w-5" /> Rozpocznij nowy dzienniczek
        </button>
      </section>

      <ConfirmDialog
        open={confirm}
        title="Rozpocząć nowy dzienniczek?"
        message={
          <div className="space-y-3">
            <p>Wszystkie obecne wpisy oraz dane pacjenta zostaną trwale usunięte z tego urządzenia. Tej operacji nie można cofnąć.</p>
            {hasData && <p className="font-bold text-burgundy">Upewnij się, że plik PDF został wysłany lekarzowi. Jeśli chcesz, najpierw pobierz PDF.</p>}
            {hasData && (
              <button type="button" className="btn-secondary w-full" onClick={backupPdf}>
                <Download className="h-5 w-5" /> Pobierz PDF przed usunięciem
              </button>
            )}
          </div>
        }
        confirmLabel="Tak, usuń dane i zacznij od nowa"
        danger
        onConfirm={reset}
        onCancel={() => setConfirm(false)}
      />

      <p className="pt-2 text-center text-sm font-semibold italic text-navy/70">Łapa na Pulsie · kardiologia</p>
    </div>
  );
}
