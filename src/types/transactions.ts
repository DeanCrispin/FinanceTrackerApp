export type GasTransactionDraft = {
    type: 'gas';
    expense: number | null;
    gallons: number | null;
};

export type DoorDashTransactionDraft = {
    type: 'doordash';
    revenue: number | null;
    minutes: number | null;
    deliveries: number | null;
    miles: number | null;
};

export type TransactionDraft = GasTransactionDraft | DoorDashTransactionDraft;

export type FinanceTransaction = TransactionDraft & {
    id: string;
    createdAt: string;
};
