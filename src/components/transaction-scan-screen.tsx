import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { ReceiptScanError, scanDoorDashImages, scanReceiptImages, scanUberEatsImages, UberEatsScanError } from '@/services/transaction-scanner';
import { ExpenseCategory, FinanceTransaction, TransactionCategory, TransactionDraft, TransactionInput, TransactionType } from '@/types/transactions';

type IncomeImageCategory = 'doordash' | 'ubereats';

function isIncomeImageCategory(category: TransactionCategory): category is IncomeImageCategory {
    return category === 'doordash' || category === 'ubereats';
}

function isExpenseCategory(category: TransactionCategory): category is ExpenseCategory {
    return category === 'gas' || category === 'maintenance' || category === 'food' ||
        category === 'tolls' || category === 'tax' || category === 'other';
}

function isExactDuplicate(transaction: TransactionInput, previous: FinanceTransaction): boolean {
    if (transaction.type !== previous.type ||
        transaction.category !== previous.category ||
        transaction.amount !== previous.amount) {
        return false;
    }

    if (transaction.category === 'gas' && previous.category === 'gas') {
        return transaction.gallons === previous.gallons &&
            transaction.isBusinessExpense === previous.isBusinessExpense;
    }

    if (transaction.category === 'doordash' && previous.category === 'doordash') {
        return transaction.minutes === previous.minutes &&
            transaction.deliveries === previous.deliveries &&
            transaction.miles === previous.miles;
    }

    if (transaction.category === 'ubereats' && previous.category === 'ubereats') {
        return transaction.minutes === previous.minutes &&
            transaction.deliveries === previous.deliveries;
    }

    if (transaction.type === 'expense' && previous.type === 'expense') {
        return transaction.isBusinessExpense === previous.isBusinessExpense;
    }

    return true;
}

const categories: Record<TransactionType, { category: TransactionCategory; label: string }[]> = {
    income: [
        { category: 'doordash', label: 'DoorDash' },
        { category: 'ubereats', label: 'Uber' },
        { category: 'other', label: 'Other income' },
    ],
    expense: [
        { category: 'gas', label: 'Gas' },
        { category: 'maintenance', label: 'Maintenance' },
        { category: 'food', label: 'Food' },
        { category: 'tolls', label: 'Tolls' },
        { category: 'tax', label: 'Tax' },
        { category: 'other', label: 'Other expense' },
    ],
};

const photoGuides: Record<IncomeImageCategory, { title: string; description: string; source: ImageSourcePropType }> = {
    doordash: {
        title: 'Choose a DoorDash weekly summary',
        description: 'Weekly summaries are recommended. Include total earnings, Dash time, and completed deliveries in one screenshot.',
        source: require('@/assets/images/scan-examples/doordash-weekly.png'),
    },
    ubereats: {
        title: 'Choose an Uber weekly summary',
        description: 'Weekly summaries are recommended. Include Total Earnings, Online time, and Trips in one screenshot.',
        source: require('@/assets/images/scan-examples/uber-weekly.png'),
    },
};

export default function TransactionScanScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { transactions, addTransaction } = useFinances();
    const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
    const [category, setCategory] = useState<TransactionCategory | null>(null);
    const [pending, setPending] = useState<TransactionDraft | null>(null);
    const [reviewKey, setReviewKey] = useState(0);
    const [scanning, setScanning] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPhotoGuide, setShowPhotoGuide] = useState(false);

    async function pick(scanCategory: TransactionCategory) {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: true, quality: 1,
        });
        if (result.canceled) return;
        await process(scanCategory, result.assets.map((asset) => asset.uri));
    }

    async function takeReceiptPhoto() {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Camera permission required', 'Allow camera access to photograph a receipt.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
        if (!result.canceled && category && isExpenseCategory(category)) await process(category, [result.assets[0].uri]);
    }

    async function process(scanCategory: TransactionCategory, uris: string[]) {
        setScanning(true);
        try {
            const draft = isExpenseCategory(scanCategory) && transactionType === 'expense'
                ? await scanReceiptImages(scanCategory, uris)
                : scanCategory === 'doordash'
                    ? await scanDoorDashImages(uris)
                    : await scanUberEatsImages(uris);
            review(draft);
        } catch (error) {
            console.error('Scan failed:', error);
            if (error instanceof ReceiptScanError) {
                Alert.alert('Receipt total not recognized', error.message);
            } else if (error instanceof UberEatsScanError) {
                Alert.alert('Uber summary not recognized', error.message);
            } else {
                Alert.alert('Scan failed', 'The selected image could not be processed.');
            }
        } finally {
            setScanning(false);
        }
    }

    function review(draft: TransactionDraft) {
        setPending(draft);
        setReviewKey((value) => value + 1);
    }

    function enterManually() {
        if (!transactionType || !category) return;
        if (category === 'gas') {
            review({ type: 'expense', category: 'gas', amount: null, gallons: null, isBusinessExpense: false });
        } else if (category === 'doordash') {
            review({ type: 'income', category: 'doordash', amount: null, minutes: null, deliveries: null, miles: null });
        } else if (category === 'ubereats') {
            review({ type: 'income', category: 'ubereats', amount: null, minutes: null, deliveries: null });
        } else if (transactionType === 'income') {
            review({ type: 'income', category: 'other', amount: null });
        } else {
            review({ type: 'expense', category, amount: null, isBusinessExpense: false });
        }
    }

    function choosePhotos() {
        if (category && transactionType === 'expense' && isExpenseCategory(category)) {
            void pick(category);
        } else if (category && isIncomeImageCategory(category)) {
            setShowPhotoGuide(true);
        }
    }

    function continueToPhotoLibrary() {
        if (!category || !isIncomeImageCategory(category)) return;
        setShowPhotoGuide(false);
        void pick(category);
    }

    function confirm(transaction: TransactionInput) {
        const duplicate = transactions.some((previous) => isExactDuplicate(transaction, previous));
        if (duplicate) {
            Alert.alert(
                'Possible duplicate transaction',
                'A previous transaction has the same category and values. Do you still want to add it?',
                [
                    { text: 'Go back', style: 'cancel' },
                    { text: 'Add anyway', style: 'destructive', onPress: () => void save(transaction) },
                ]
            );
            return;
        }

        void save(transaction);
    }

    async function save(transaction: TransactionInput) {
        if (saving) return;

        setSaving(true);
        try {
            await addTransaction(transaction);
            router.back();
        } catch (error) {
            console.error('Save failed:', error);
            Alert.alert('Save failed', 'The transaction could not be saved. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    function goBack() {
        if (category) setCategory(null);
        else if (transactionType) setTransactionType(null);
        else router.back();
    }

    if (pending) {
        return <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}><ScanResults key={reviewKey} draft={pending} onCancel={() => setPending(null)} onConfirm={confirm} />{saving ? <View style={styles.loading}><ActivityIndicator /><Text style={{ color: theme.textSecondary }}>Saving transaction...</Text></View> : null}</ScrollView>;
    }

    const photoGuide = category && isIncomeImageCategory(category) ? photoGuides[category] : null;

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
            <Text style={[styles.title, { color: theme.text }]}>Add transaction</Text>
            {!transactionType ? (
                <>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Is this income or an expense?</Text>
                    <Choice label="Income" onPress={() => setTransactionType('income')} />
                    <Choice label="Expense" onPress={() => setTransactionType('expense')} />
                </>
            ) : !category ? (
                <>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>Choose a category.</Text>
                    {categories[transactionType].map((item) => <Choice key={item.category} label={item.label} onPress={() => setCategory(item.category)} />)}
                </>
            ) : (
                <>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>How would you like to add this transaction?</Text>
                    {transactionType === 'expense' ? <Choice label="Take receipt photo" onPress={takeReceiptPhoto} /> : null}
                    {(transactionType === 'expense' || isIncomeImageCategory(category)) ? <Choice label={transactionType === 'expense' ? 'Choose receipt photos from library' : 'Choose photos from library'} onPress={choosePhotos} /> : null}
                    <Choice label="Enter manually" onPress={enterManually} />
                    {scanning ? <View style={styles.loading}><ActivityIndicator /><Text style={{ color: theme.textSecondary }}>Reading images...</Text></View> : null}
                </>
            )}
            <Pressable disabled={scanning} onPress={goBack} style={styles.back}><Text style={{ color: theme.textSecondary }}>Back</Text></Pressable>
            <Modal transparent animationType="fade" visible={showPhotoGuide && photoGuide !== null} onRequestClose={() => setShowPhotoGuide(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowPhotoGuide(false)}>
                    <Pressable onPress={(event) => event.stopPropagation()} style={[styles.guideCard, { backgroundColor: theme.background }]}>
                        {photoGuide ? (
                            <>
                                <Text style={[styles.guideTitle, { color: theme.text }]}>{photoGuide.title}</Text>
                                <Text style={[styles.guideDescription, { color: theme.textSecondary }]}>{photoGuide.description}</Text>
                                <Image resizeMode="contain" source={photoGuide.source} style={[styles.exampleImage, { backgroundColor: theme.backgroundElement }]} />
                                <Pressable onPress={continueToPhotoLibrary} style={styles.continueButton}><Text style={styles.buttonText}>Choose photos</Text></Pressable>
                                <Pressable onPress={() => setShowPhotoGuide(false)} style={styles.back}><Text style={{ color: theme.textSecondary }}>Cancel</Text></Pressable>
                            </>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
    return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
    page: { flexGrow: 1, padding: 24 },
    title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
    hint: { fontSize: 16, lineHeight: 23, marginBottom: 24 },
    button: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, marginBottom: 12, padding: 15 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    pressed: { opacity: 0.65 },
    loading: { alignItems: 'center', gap: 10, padding: 24 },
    back: { alignItems: 'center', marginTop: 8, padding: 12 },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', flex: 1, justifyContent: 'center', padding: 20 },
    guideCard: { borderRadius: 18, maxWidth: 440, padding: 20, width: '100%' },
    guideTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    guideDescription: { fontSize: 15, lineHeight: 21, marginBottom: 14 },
    exampleImage: { borderRadius: 12, height: 360, width: '100%' },
    continueButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, marginTop: 16, padding: 15 },
});
