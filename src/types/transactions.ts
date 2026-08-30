export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
    | 'doordash'
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
};

export type DoorDashTransactionDraft = TransactionBase<'income', 'doordash'> & {
    amount: number | null;
    minutes: number | null;
    deliveries: number | null;
    miles: number | null;
};

export type ManualExpenseCategory = 'maintenance' | 'food' | 'tolls' | 'tax' | 'other';

export type ManualTransactionDraft =
    | TransactionBase<'expense', ManualExpenseCategory> & { amount: number | null }
    | TransactionBase<'income', 'other'> & { amount: number | null };

export type TransactionDraft = GasTransactionDraft | DoorDashTransactionDraft | ManualTransactionDraft;

export type TransactionInput =
    | Omit<GasTransactionDraft, 'amount'> & { amount: number }
    | Omit<DoorDashTransactionDraft, 'amount'> & { amount: number }
    | Omit<ManualTransactionDraft, 'amount'> & { amount: number };

export type FinanceTransaction = TransactionInput & {
    id: string;
    createdAt: string;
};
