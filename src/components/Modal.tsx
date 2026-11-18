import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** false – dotknięcie tła nie zamyka okna (chroni wpisywane dane przed przypadkowym zamknięciem). */
  dismissOnBackdrop?: boolean;
}

export function Modal({ open, title, onClose, children, dismissOnBackdrop = true }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 sm:items-center" onClick={dismissOnBackdrop ? onClose : undefined}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fade-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-offwhite p-6 pb-8 shadow-2xl outline-none safe-bottom sm:rounded-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-extrabold">{title}</h2>
          <button type="button" className="-m-2 rounded-full p-2 text-navy/70 hover:bg-cream" onClick={onClose} aria-label="Zamknij">
            <X className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="text-[15px] leading-relaxed text-navy/85">{message}</div>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" className={danger ? 'btn-primary' : 'btn-navy'} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Anuluj
        </button>
      </div>
    </Modal>
  );
}
