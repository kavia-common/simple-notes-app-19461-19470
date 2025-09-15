import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

// Utility types
/**
 * @typedef Note
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {number} updatedAt
 */

// PUBLIC_INTERFACE
export default function App() {
  /** State management */
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem('notes.v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [theme, setTheme] = useState('light'); // could be extended for dark mode if needed

  // Persist notes
  useEffect(() => {
    localStorage.setItem('notes.v1', JSON.stringify(notes));
  }, [notes]);

  // Ensure a selected note exists
  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
    } else if (selectedId && !notes.find(n => n.id === selectedId)) {
      setSelectedId(notes[0]?.id || null);
    }
  }, [notes, selectedId]);

  const selectedNote = useMemo(
    () => notes.find(n => n.id === selectedId) || null,
    [notes, selectedId]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    return notes
      .filter(n => (n.title + ' ' + n.content).toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, search]);

  // PUBLIC_INTERFACE
  const addNote = () => {
    const now = Date.now();
    const newNote = {
      id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: 'Untitled',
      content: '',
      updatedAt: now
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setIsAdding(false);
  };

  // PUBLIC_INTERFACE
  const updateNote = (id, patch) => {
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  };

  // PUBLIC_INTERFACE
  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // PUBLIC_INTERFACE
  const clearAllNotes = () => {
    if (window.confirm('Delete all notes? This cannot be undone.')) {
      setNotes([]);
      setSelectedId(null);
    }
  };

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'light' : 'light')); // locked to light classic theme per guide; extend as needed
  };

  return (
    <div className="heritage-app" data-theme={theme}>
      <Header onThemeToggle={toggleTheme} />
      <main className="layout">
        <Sidebar
          notes={filteredNotes}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onSearch={setSearch}
          search={search}
          onAdd={() => setIsAdding(true)}
          onClearAll={clearAllNotes}
        />
        <ContentArea
          note={selectedNote}
          onChange={(patch) => selectedNote && updateNote(selectedNote.id, patch)}
          onDelete={() => selectedNote && deleteNote(selectedNote.id)}
          onAddNew={addNote}
          isAdding={isAdding}
          setIsAdding={setIsAdding}
        />
      </main>

      <FloatingAddButton onClick={() => setIsAdding(true)} />
      {isAdding && <AddNoteModal onCancel={() => setIsAdding(false)} onConfirm={addNote} />}
    </div>
  );
}

/** Header */
// PUBLIC_INTERFACE
function Header({ onThemeToggle }) {
  /**
   * Renders the top header with the app title. Theme toggle kept for extensibility.
   */
  return (
    <header className="hb-header">
      <div className="hb-header__content">
        <div className="brand">
          <span className="brand__logo" aria-hidden>✎</span>
          <h1 className="brand__title">Heritage Notes</h1>
        </div>
        <div className="header-actions">
          <span className="header-accent" />
          <button className="btn ghost" onClick={onThemeToggle} aria-label="Toggle theme">
            Classic
          </button>
        </div>
      </div>
    </header>
  );
}

/** Sidebar List */
// PUBLIC_INTERFACE
function Sidebar({ notes, selectedId, setSelectedId, onSearch, search, onAdd, onClearAll }) {
  /**
   * Sidebar showing the list of notes and a search box.
   */
  return (
    <aside className="hb-sidebar" aria-label="Notes list">
      <div className="sidebar__controls">
        <div className="input-group">
          <span className="input-icon" aria-hidden>🔎</span>
          <input
            className="input"
            placeholder="Search notes"
            value={search}
            onChange={e => onSearch(e.target.value)}
            aria-label="Search notes"
          />
        </div>
        <div className="sidebar__buttons">
          <button className="btn primary" onClick={onAdd} aria-label="Add note">Add</button>
          <button className="btn danger outline" onClick={onClearAll}>Clear</button>
        </div>
      </div>

      <ul className="note-list">
        {notes.length === 0 && (
          <li className="note-list__empty">No notes yet. Click Add to create one.</li>
        )}
        {notes.map(n => (
          <li
            key={n.id}
            className={`note-list__item ${selectedId === n.id ? 'active' : ''}`}
            onClick={() => setSelectedId(n.id)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedId(n.id)}
            aria-current={selectedId === n.id ? 'true' : 'false'}
          >
            <div className="note-list__title">{n.title || 'Untitled'}</div>
            <div className="note-list__meta">{formatDate(n.updatedAt)}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Content Area: Viewer/Editor */
// PUBLIC_INTERFACE
function ContentArea({ note, onChange, onDelete, onAddNew, isAdding, setIsAdding }) {
  /**
   * Right-hand side editor/viewer for the selected note.
   */
  if (!note) {
    return (
      <section className="hb-content empty">
        <div className="empty-state">
          <p>No note selected.</p>
          <button className="btn primary" onClick={() => setIsAdding(true)}>Create your first note</button>
        </div>
      </section>
    );
  }

  return (
    <section className="hb-content">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="muted">Last updated: {formatDate(note.updatedAt)}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn danger" onClick={onDelete} aria-label="Delete note">Delete</button>
          <button className="btn outline" onClick={() => setIsAdding(true)} aria-label="New note">New</button>
          {isAdding && (
            <div className="inline-confirm">
              <span>Create new note?</span>
              <button className="btn primary xs" onClick={onAddNew}>Yes</button>
              <button className="btn ghost xs" onClick={() => setIsAdding(false)}>No</button>
            </div>
          )}
        </div>
      </div>

      <div className="editor">
        <input
          className="editor__title"
          value={note.title}
          placeholder="Title"
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Note title"
        />
        <textarea
          className="editor__content"
          value={note.content}
          placeholder="Start typing your note..."
          onChange={(e) => onChange({ content: e.target.value })}
          aria-label="Note content"
        />
      </div>
    </section>
  );
}

/** Floating Action Button */
// PUBLIC_INTERFACE
function FloatingAddButton({ onClick }) {
  /**
   * Floating button for quick adding notes.
   */
  return (
    <button className="fab" onClick={onClick} aria-label="Add note">
      +
    </button>
  );
}

/** Add Note Modal */
// PUBLIC_INTERFACE
function AddNoteModal({ onCancel, onConfirm }) {
  /**
   * Small confirmation modal to add a new note.
   */
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add note">
      <div className="modal">
        <div className="modal__header">
          <h2>New Note</h2>
        </div>
        <div className="modal__body">
          <p>Create a new blank note?</p>
        </div>
        <div className="modal__footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>Create</button>
        </div>
      </div>
    </div>
  );
}

/** Helpers */
function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}
