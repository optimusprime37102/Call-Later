import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('calllater.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY NOT NULL,
          contact_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          scheduled_at INTEGER NOT NULL,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          notification_id TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          completed_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_status_scheduled
          ON reminders(status, scheduled_at);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function resetDatabaseConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
