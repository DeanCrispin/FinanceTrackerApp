export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
    | 'doordash'
    | 'ubereats'
    | 'gas'
    | 'maintenance'
    | 'food'
    | 'tolls'
    | 'tax'
    | 'other';

type TransactionBase<TType extends TransactionType, TCategory extends TransactionCategory> = {
    type: TType;
    category: TCategory;
};

export type GasTransactionDraft = TransactionBase<'expense', 'gas'> & {
    amount: number | null;
    gallons: number | null;
    isBusinessExpense: boolean;
};

export type DoorDashTransactionDraft = TransactionBase<'income', 'doordash'> & {
    amount: number | null;
    minutes: number | null;
    deliveries: number | null;
    miles: number | null;
};

export type UberEatsTransactionDraft = TransactionBase<'income', 'ubereats'> & {
    amount: number | null;
    minutes: number | null;
    deliveries: number | null;
};

export type ManualExpenseCategory = 'maintenance' | 'food' | 'tolls' | 'tax' | 'other';
export type ExpenseCategory = 'gas' | ManualExpenseCategory;

export type ManualTransactionDraft =
    | TransactionBase<'expense', ManualExpenseCategory> & { amount: number | null; isBusinessExpense: boolean }
    | TransactionBase<'income', 'other'> & { amount: number | null };

export type TransactionDraft = GasTransactionDraft | DoorDashTransactionDraft | UberEatsTransactionDraft | ManualTransactionDraft;

type WithConfirmedAmount<T extends { amount: number | null }> =
    T extends unknown ? Omit<T, 'amount'> & { amount: number } : never;

export type TransactionInput = WithConfirmedAmount<TransactionDraft>;

export type FinanceTransaction = TransactionInput & {
    id: string;
    createdAt: string;
};
