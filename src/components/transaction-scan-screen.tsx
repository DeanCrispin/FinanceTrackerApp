import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { scanDoorDashImages, scanGasImages } from '@/services/transaction-scanner';
import { TransactionCategory, TransactionDraft, TransactionInput, TransactionType } from '@/types/transactions';

type ImageScannableCategory = 'gas' | 'doordash';

function isImageScannableCategory(category: TransactionCategory): category is ImageScannableCategory {
    return category === 'gas' || category === 'doordash';
}

const categories: Record<TransactionType, { category: TransactionCategory; label: string }[]> = {
    income: [
        { category: 'doordash', label: 'DoorDash' },
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

export default function TransactionScanScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { addTransaction } = useFinances();
    const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
    const [category, setCategory] = useState<TransactionCategory | null>(null);
    const [pending, setPending] = useState<TransactionDraft | null>(null);
    const [reviewKey, setReviewKey] = useState(0);
    const [scanning, setScanning] = useState(false);

    async function pick(scanCategory: ImageScannableCategory) {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: true, quality: 1,
        });
        if (result.canceled) return;
        await process(scanCategory, result.assets.map((asset) => asset.uri));
    }

    async function takeGasPhoto() {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Camera permission required', 'Allow camera access to photograph a gas pump.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
        if (!result.canceled) await process('gas', [result.assets[0].uri]);
    }

    async function process(scanCategory: ImageScannableCategory, uris: string[]) {
        setScanning(true);
        try {
            review(scanCategory === 'gas' ? await scanGasImages(uris) : await scanDoorDashImages(uris));
        } catch (error) {
            console.error('Scan failed:', error);
            Alert.alert('Scan failed', 'The selected image could not be processed.');
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
            review({ type: 'expense', category: 'gas', amount: null, gallons: null });
        } else if (category === 'doordash') {
            review({ type: 'income', category: 'doordash', amount: null, minutes: null, deliveries: null, miles: null });
        } else if (transactionType === 'income') {
            review({ type: 'income', category: 'other', amount: null });
        } else {
            review({ type: 'expense', category, amount: null });
        }
    }

    function choosePhotos() {
        if (category && isImageScannableCategory(category)) {
            void pick(category);
        }
    }

    function confirm(transaction: TransactionInput) {
        addTransaction(transaction);
        router.back();
    }

    function goBack() {
        if (category) setCategory(null);
        else if (transactionType) setTransactionType(null);
        else router.back();
    }

    if (pending) {
        return <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}><ScanResults key={reviewKey} draft={pending} onCancel={() => setPending(null)} onConfirm={confirm} /></ScrollView>;
    }

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
                    {category === 'gas' ? <Choice label="Take photo" onPress={takeGasPhoto} /> : null}
                    {isImageScannableCategory(category) ? <Choice label="Choose photos from library" onPress={choosePhotos} /> : null}
                    <Choice label="Enter manually" onPress={enterManually} />
                    {scanning ? <View style={styles.loading}><ActivityIndicator /><Text style={{ color: theme.textSecondary }}>Reading images...</Text></View> : null}
                </>
            )}
            <Pressable disabled={scanning} onPress={goBack} style={styles.back}><Text style={{ color: theme.textSecondary }}>Back</Text></Pressable>
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
});
