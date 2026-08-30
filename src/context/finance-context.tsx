import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { FinanceTransaction, TransactionDraft } from '@/types/transactions';

type FinanceTotals = {
    expenses: number;
    revenue: number;
    minutes: number;
    gallons: number;
    deliveries: number;
    miles: number;
};

type FinanceContextValue = {
    transactions: FinanceTransaction[];
    totals: FinanceTotals;
    addTransaction: (draft: TransactionDraft) => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: PropsWithChildren) {
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

    const value = useMemo<FinanceContextValue>(() => {
        const totals = transactions.reduce<FinanceTotals>(
            (sum, transaction) => {
                if (transaction.type === 'gas') {
                    sum.expenses += transaction.expense ?? 0;
                    sum.gallons += transaction.gallons ?? 0;
                } else {
                    sum.revenue += transaction.revenue ?? 0;
                    sum.minutes += transaction.minutes ?? 0;
                    sum.deliveries += transaction.deliveries ?? 0;
                    sum.miles += transaction.miles ?? 0;
                }
                return sum;
            },
            { expenses: 0, revenue: 0, minutes: 0, gallons: 0, deliveries: 0, miles: 0 }
        );

        return {
            transactions,
            totals,
            addTransaction: (draft) =>
                setTransactions((current) => [
                    ...current,
                    { ...draft, id: `${Date.now()}-${current.length}`, createdAt: new Date().toISOString() },
                ]),
        };
    }, [transactions]);

    return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinances() {
    const value = useContext(FinanceContext);
    if (!value) throw new Error('useFinances must be used inside FinanceProvider');
    return value;
}
