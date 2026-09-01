import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase) {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            gallons REAL,
            minutes INTEGER,
            deliveries INTEGER,
            miles REAL,
            isBusinessExpense INTEGER,
            date TEXT NOT NULL
        );
    `);

    const columns = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(transactions)'
    );
    const columnNames = new Set(columns.map(({ name }) => name));

    if (!columnNames.has('minutes')) {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN minutes INTEGER');
    }

    if (columnNames.has('dashTimeMinutes')) {
        await db.execAsync(`
            UPDATE transactions
            SET minutes = COALESCE(minutes, dashTimeMinutes)
        `);
    }

    if (!columnNames.has('miles')) {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN miles REAL');
    }

    if (!columnNames.has('isBusinessExpense')) {
        await db.execAsync(
            'ALTER TABLE transactions ADD COLUMN isBusinessExpense INTEGER'
        );
    }
}
