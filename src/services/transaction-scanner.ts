import { readTextFromImage } from '@/services/ocr';
import { parseDoorDash } from '@/utils/parseDoorDash';
import { parseReceipt } from '@/utils/parseReceipt';
import { parseUberEats } from '@/utils/parseUberEats';
import { DoorDashTransactionDraft, ExpenseCategory, GasTransactionDraft, ManualTransactionDraft, UberEatsTransactionDraft } from '@/types/transactions';

export class UberEatsScanError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UberEatsScanError';
    }
}

export class ReceiptScanError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReceiptScanError';
    }
}

type ExpenseTransactionDraft = GasTransactionDraft | Extract<ManualTransactionDraft, { type: 'expense' }>;

export async function scanReceiptImages(category: ExpenseCategory, uris: string[]): Promise<ExpenseTransactionDraft> {
    let total = 0;

    for (const uri of uris) {
        const ocr = await readTextFromImage(uri);
        const result = parseReceipt(ocr.text, ocr.blocks);
        if (result.amount === null) {
            throw new ReceiptScanError('No amount was found to the right of a Total label. Try a clearer receipt photo or enter the amount manually.');
        }
        total += result.amount;
    }

    if (category === 'gas') {
        return { type: 'expense', category: 'gas', amount: total, gallons: null, isBusinessExpense: false };
    }

    return { type: 'expense', category, amount: total, isBusinessExpense: false };
}

export async function scanDoorDashImages(uris: string[]): Promise<DoorDashTransactionDraft> {
    let revenue = 0;
    let minutes = 0;
    let deliveries = 0;
    let miles = 0;
    let foundRevenue = false;
    let foundTime = false;
    let foundDeliveries = false;
    let foundMiles = false;

    for (const uri of uris) {
        const ocr = await readTextFromImage(uri);
        const result = parseDoorDash(ocr.text, ocr.blocks);

        if (result.revenue !== null) {
            revenue += result.revenue;
            foundRevenue = true;
        }
        if (result.dashTimeTotalMinutes !== null) {
            minutes += result.dashTimeTotalMinutes;
            foundTime = true;
        }
        if (result.completedDeliveries !== null) {
            deliveries += result.completedDeliveries;
            foundDeliveries = true;
        }
        if (result.miles !== null) {
            miles += result.miles;
            foundMiles = true;
        }
    }

    return {
        type: 'income',
        category: 'doordash',
        amount: foundRevenue ? revenue : null,
        minutes: foundTime ? minutes : null,
        deliveries: foundDeliveries ? deliveries : null,
        miles: foundMiles ? miles : null,
    };
}

export async function scanUberEatsImages(uris: string[]): Promise<UberEatsTransactionDraft> {
    let earnings = 0;
    let minutes = 0;
    let deliveries = 0;
    let foundEarnings = false;
    let foundMinutes = false;
    let foundDeliveries = false;

    for (const uri of uris) {
        const ocr = await readTextFromImage(uri);
        const result = parseUberEats(ocr.text, ocr.blocks);
        if (result.earnings === null && result.onlineMinutes === null && result.deliveries === null) {
            throw new UberEatsScanError('No Uber earnings, online time, or trips could be identified. Try another screenshot or enter the values manually.');
        }
        if (result.earnings !== null) {
            earnings += result.earnings;
            foundEarnings = true;
        }
        if (result.onlineMinutes !== null) {
            minutes += result.onlineMinutes;
            foundMinutes = true;
        }
        if (result.deliveries !== null) {
            deliveries += result.deliveries;
            foundDeliveries = true;
        }
    }

    return {
        type: 'income',
        category: 'ubereats',
        amount: foundEarnings ? earnings : null,
        minutes: foundMinutes ? minutes : null,
        deliveries: foundDeliveries ? deliveries : null,
    };
}
