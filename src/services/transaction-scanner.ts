import { readTextFromImage } from '@/services/ocr';
import { parseDoorDash } from '@/utils/parseDoorDash';
import { parseGasPump } from '@/utils/parseGasPump';
import { DoorDashTransactionDraft, GasTransactionDraft } from '@/types/transactions';

export async function scanGasImages(uris: string[]): Promise<GasTransactionDraft> {
    let expense = 0;
    let gallons = 0;
    let foundExpense = false;
    let foundGallons = false;

    for (const uri of uris) {
        const ocr = await readTextFromImage(uri);
        const result = parseGasPump(ocr.text);

        if (result.price !== null) {
            expense += result.price;
            foundExpense = true;
        }
        if (result.gallons !== null) {
            gallons += result.gallons;
            foundGallons = true;
        }
    }

    return {
        type: 'expense',
        category: 'gas',
        amount: foundExpense ? expense : null,
        gallons: foundGallons ? gallons : null,
    };
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
