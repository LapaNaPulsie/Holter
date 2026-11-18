import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Entry, EntryKind } from '../core/types';
import { useDiary } from '../hooks/useDiary';
import { Modal } from './Modal';
import { blankEntry, EntryForm } from './EntryForm';

const TITLES_NEW: Record<EntryKind, string> = {
  activity: 'Dodaj aktywność',
  sleep: 'Dodaj sen',
  symptom: 'Dodaj objaw / zdarzenie',
  medication: 'Dodaj podanie leku',
};
const TITLES_EDIT: Record<EntryKind, string> = {
  activity: 'Edytuj aktywność',
  sleep: 'Edytuj sen',
  symptom: 'Edytuj objaw / zdarzenie',
  medication: 'Edytuj podanie leku',
};

interface EditorApi {
  add: (kind: EntryKind) => void;
  edit: (entryId: string) => void;
}

const EditorContext = createContext<EditorApi>({ add: () => {}, edit: () => {} });

export function EntryEditorProvider({ children }: { children: ReactNode }) {
  const { diary } = useDiary();
  const [state, setState] = useState<{ entry: Entry; isNew: boolean; key: number } | null>(null);

  const add = useCallback((kind: EntryKind) => setState({ entry: blankEntry(kind), isNew: true, key: Date.now() }), []);
  const edit = useCallback(
    (entryId: string) => {
      const entry = diary.entries.find((e) => e.id === entryId);
      if (entry) setState({ entry, isNew: false, key: Date.now() });
    },
    [diary.entries],
  );
  const close = useCallback(() => setState(null), []);

  return (
    <EditorContext.Provider value={{ add, edit }}>
      {children}
      <Modal open={!!state} title={state ? (state.isNew ? TITLES_NEW : TITLES_EDIT)[state.entry.kind] : ''} onClose={close} dismissOnBackdrop={false}>
        {state && <EntryForm key={state.key} initial={state.entry} isNew={state.isNew} onDone={close} />}
      </Modal>
    </EditorContext.Provider>
  );
}

export const useEntryEditor = () => useContext(EditorContext);
