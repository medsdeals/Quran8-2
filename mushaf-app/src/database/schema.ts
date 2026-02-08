// src/database/schema.ts
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export const DB_NAME = 'mushaf_library.db';

export async function initMainDatabase(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Table des Mushafs installés
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS installed_mushafs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      pages_count INTEGER NOT NULL,
      lines_per_page INTEGER NOT NULL,
      local_path TEXT NOT NULL,
      installed_at TEXT NOT NULL
    );
  `);

    // Table des signets
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mushaf_id INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      line_number INTEGER,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_mushaf 
      ON bookmarks(mushaf_id, page_number);
  `);

    // Table de l'historique de lecture
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mushaf_id INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_history_mushaf_time 
      ON reading_history(mushaf_id, timestamp DESC);
  `);

    // Table des préférences utilisateur
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

    return db;
}

// Chaque Mushaf a sa propre DB avec les métadonnées de mise en page
export async function getMushafDatabase(mushafPath: string): Promise<SQLite.SQLiteDatabase> {
    const dbPath = `${mushafPath}mushaf_layout.db`;

    // Vérifier que la DB existe
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) {
        throw new Error(`Base de données Mushaf introuvable: ${dbPath}`);
    }

    return await SQLite.openDatabaseAsync(dbPath);
}

// Get all installed mushafs from database
export async function getInstalledMushafs(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync<{
        id: number;
        name: string;
        code: string;
        pages_count: number;
        lines_per_page: number;
        local_path: string;
        installed_at: string;
    }>('SELECT * FROM installed_mushafs');
}

// Add a bookmark
export async function addBookmark(
    db: SQLite.SQLiteDatabase,
    mushafId: number,
    pageNumber: number,
    lineNumber?: number,
    note?: string
) {
    return await db.runAsync(
        `INSERT INTO bookmarks (mushaf_id, page_number, line_number, note, created_at)
     VALUES (?, ?, ?, ?, ?)`,
        [mushafId, pageNumber, lineNumber ?? null, note ?? null, new Date().toISOString()]
    );
}

// Get bookmarks for a mushaf
export async function getBookmarks(db: SQLite.SQLiteDatabase, mushafId: number) {
    return await db.getAllAsync<{
        id: number;
        mushaf_id: number;
        page_number: number;
        line_number: number | null;
        note: string | null;
        created_at: string;
    }>('SELECT * FROM bookmarks WHERE mushaf_id = ? ORDER BY created_at DESC', [mushafId]);
}

// Record reading session
export async function recordReadingSession(
    db: SQLite.SQLiteDatabase,
    mushafId: number,
    pageNumber: number,
    durationSeconds: number
) {
    return await db.runAsync(
        `INSERT INTO reading_history (mushaf_id, page_number, duration_seconds, timestamp)
     VALUES (?, ?, ?, ?)`,
        [mushafId, pageNumber, durationSeconds, new Date().toISOString()]
    );
}

// Get last read page for a mushaf
export async function getLastReadPage(db: SQLite.SQLiteDatabase, mushafId: number): Promise<number | null> {
    const result = await db.getFirstAsync<{ page_number: number }>(
        'SELECT page_number FROM reading_history WHERE mushaf_id = ? ORDER BY timestamp DESC LIMIT 1',
        [mushafId]
    );
    return result?.page_number ?? null;
}

// Set user preference
export async function setPreference(db: SQLite.SQLiteDatabase, key: string, value: string) {
    return await db.runAsync(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`,
        [key, value]
    );
}

// Get user preference
export async function getPreference(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
    const result = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        [key]
    );
    return result?.value ?? null;
}
