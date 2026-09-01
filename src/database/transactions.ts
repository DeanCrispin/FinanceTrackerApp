import type { SQLiteDatabase } from 'expo-sqlite';

import type {
    FinanceTransaction,
    ManualExpenseCategory,
    TransactionCategory,
    TransactionInput,
    TransactionType,
} from '@/types/transactions';

type TransactionRow = {
    id: number;
    type: TransactionType;
    amount: number;
    category: TransactionCategory;
    gallons: number | null;
    minutes: number | null;
    deliveries: number | null;
    miles: number | null;
    isBusinessExpense: number | null;
    date: string;
};

type DatabaseValues = {
    gallons: number | null;
    minutes: number | null;
    deliveries: number | null;
    miles: number | null;
    isBusinessExpense: number | null;
};

const manualExpenseCategories = new Set<TransactionCategory>([
    'maintenance',
    'food',
    'tolls',
    'tax',
    'other',
]);

function getDatabaseValues(transaction: TransactionInput): DatabaseValues {
    const isDelivery =
        transaction.category === 'doordash' || transaction.category === 'ubereats';

    return {
        gallons: transaction.category === 'gas' ? transaction.gallons : null,
        minutes: isDelivery ? transaction.minutes : null,
        deliveries: isDelivery ? transaction.deliveries : null,
        miles: transaction.category === 'doordash' ? transaction.miles : null,
        isBusinessExpense:
            'isBusinessExpense' in transaction
                ? Number(transaction.isBusinessExpense)
                : null,
    };
}

function mapRowToTransaction(row: TransactionRow): FinanceTransaction {
    const shared = {
        id: String(row.id),
        amount: row.amount,
        createdAt: row.date,
    };

    if (row.type === 'expense' && row.category === 'gas') {
        return {
            ...shared,
            type: 'expense',
            category: 'gas',
            gallons: row.gallons,
            isBusinessExpense: Boolean(row.isBusinessExpense),
        };
    }

    if (row.type === 'income' && row.category === 'doordash') {
        return {
            ...shared,
            type: 'income',
            category: 'doordash',
            minutes: row.minutes,
            deliveries: row.deliveries,
            miles: row.miles,
        };
    }

    if (row.type === 'income' && row.category === 'ubereats') {
        return {
            ...shared,
            type: 'income',
            category: 'ubereats',
            minutes: row.minutes,
            deliveries: row.deliveries,
        };
    }

    if (row.type === 'income' && row.category === 'other') {
        return { ...shared, type: 'income', category: 'other' };
    }

    if (row.type === 'expense' && manualExpenseCategories.has(row.category)) {
        return {
            ...shared,
            type: 'expense',
            category: row.category as ManualExpenseCategory,
            isBusinessExpense: Boolean(row.isBusinessExpense),
        };
    }

    throw new Error(
        `Invalid transaction ${row.id}: ${row.type}/${row.category}`
    );
}

export async function getTransactions(
    db: SQLiteDatabase
): Promise<FinanceTransaction[]> {
    const rows = await db.getAllAsync<TransactionRow>(`
        SELECT
            id,
            type,
            amount,
            category,
            gallons,
            minutes,
            deliveries,
            miles,
            isBusinessExpense,
            date
        FROM transactions
        ORDER BY date ASC
    `);

    return rows.map(mapRowToTransaction);
}

export async function addTransaction(
    db: SQLiteDatabase,
    transaction: TransactionInput
): Promise<FinanceTransaction> {
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
        throw new Error('Transaction amount must be greater than zero');
    }

    const createdAt = new Date().toISOString();
    const values = getDatabaseValues(transaction);

    const result = await db.runAsync(
        `
        INSERT INTO transactions (
            type,
            amount,
            category,
            gallons,
            minutes,
            deliveries,
            miles,
            isBusinessExpense,
            date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        transaction.type,
        transaction.amount,
        transaction.category,
        values.gallons,
        values.minutes,
        values.deliveries,
        values.miles,
        values.isBusinessExpense,
        createdAt
    );

    return {
        ...transaction,
        id: String(result.lastInsertRowId),
        createdAt,
    };
}

export async function updateTransaction(
    db: SQLiteDatabase,
    id: string,
    transaction: TransactionInput
): Promise<void> {
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
        throw new Error('Transaction amount must be greater than zero');
    }

    const values = getDatabaseValues(transaction);
    const result = await db.runAsync(
        `
        UPDATE transactions
        SET
            type = ?,
            amount = ?,
            category = ?,
            gallons = ?,
            minutes = ?,
            deliveries = ?,
            miles = ?,
            isBusinessExpense = ?
        WHERE id = ?
        `,
        transaction.type,
        transaction.amount,
        transaction.category,
        values.gallons,
        values.minutes,
        values.deliveries,
        values.miles,
        values.isBusinessExpense,
        id
    );

    if (result.changes === 0) {
        throw new Error(`Transaction ${id} was not found`);
    }
}

export async function deleteTransaction(
    db: SQLiteDatabase,
    id: string
): Promise<void> {
    const result = await db.runAsync(
        'DELETE FROM transactions WHERE id = ?',
        id
    );

    if (result.changes === 0) {
        throw new Error(`Transaction ${id} was not found`);
    }
}
