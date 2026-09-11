import { useSQLiteContext } from 'expo-sqlite';
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    addTransaction as insertTransaction,
    deleteTransaction as deleteStoredTransaction,
    getTransactions,
    updateTransaction as updateStoredTransaction,
} from '@/database/transactions';
import { FinanceTransaction, TransactionInput } from '@/types/transactions';

type FinanceTotals = {
    expenses: number;
    businessExpenses: number;
    income: number;
    deliveryIncome: number;
    minutes: number;
    gallons: number;
    deliveries: number;
    miles: number;
};

type FinanceContextValue = {
    transactions: FinanceTransaction[];
    totals: FinanceTotals;
    isLoading: boolean;
    error: Error | null;
    addTransaction: (transaction: TransactionInput) => Promise<void>;
    updateTransaction: (id: string, transaction: TransactionInput) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: PropsWithChildren) {
    const db = useSQLiteContext();
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadTransactions() {
            try {
                const savedTransactions = await getTransactions(db);
                if (!cancelled) {
                    setTransactions(savedTransactions);
                    setError(null);
                }
            } catch (cause) {
                if (!cancelled) {
                    setError(toError(cause, 'Failed to load transactions'));
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void loadTransactions();

        return () => {
            cancelled = true;
        };
    }, [db]);

    const addTransaction = useCallback(async (draft: TransactionInput) => {
        const savedTransaction = await insertTransaction(db, draft);
        setTransactions((current) => [...current, savedTransaction]);
    }, [db]);

    const updateTransaction = useCallback(async (id: string, draft: TransactionInput) => {
        await updateStoredTransaction(db, id, draft);
        setTransactions((current) => current.map((transaction) =>
            transaction.id === id
                ? { ...draft, id: transaction.id, createdAt: transaction.createdAt }
                : transaction
        ));
    }, [db]);

    const deleteTransaction = useCallback(async (id: string) => {
        await deleteStoredTransaction(db, id);
        setTransactions((current) =>
            current.filter((transaction) => transaction.id !== id)
        );
    }, [db]);

    const value = useMemo<FinanceContextValue>(() => {
        const totals = transactions.reduce<FinanceTotals>(
            (sum, transaction) => {
                if (transaction.type === 'expense') {
                    sum.expenses += transaction.amount;
                    if (transaction.isBusinessExpense) {
                        sum.businessExpenses += transaction.amount;
                    }
                } else {
                    sum.income += transaction.amount;
                }

                if (transaction.category === 'gas') {
                    sum.gallons += transaction.gallons ?? 0;
                } else if (transaction.category === 'doordash' || transaction.category === 'ubereats') {
                    sum.deliveryIncome += transaction.amount;
                    sum.minutes += transaction.minutes ?? 0;
                    sum.deliveries += transaction.deliveries ?? 0;
                    if (transaction.category === 'doordash') {
                        sum.miles += transaction.miles ?? 0;
                    }
                }
                return sum;
            },
            { expenses: 0, businessExpenses: 0, income: 0, deliveryIncome: 0, minutes: 0, gallons: 0, deliveries: 0, miles: 0 }
        );

        return {
            transactions,
            totals,
            isLoading,
            error,
            addTransaction,
            updateTransaction,
            deleteTransaction,
        };
    }, [addTransaction, deleteTransaction, error, isLoading, transactions, updateTransaction]);

    return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinances() {
    const value = useContext(FinanceContext);
    if (!value) throw new Error('useFinances must be used inside FinanceProvider');
    return value;
}

function toError(cause: unknown, fallbackMessage: string): Error {
    return cause instanceof Error ? cause : new Error(fallbackMessage);
}
