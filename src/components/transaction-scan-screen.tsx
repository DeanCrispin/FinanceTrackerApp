import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { scanDoorDashImages, scanGasImages } from '@/services/transaction-scanner';
import { TransactionDraft, TransactionInput } from '@/types/transactions';

type ScannableCategory = TransactionDraft['category'];

export default function TransactionScanScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { addTransaction } = useFinances();
    const [pending, setPending] = useState<TransactionDraft | null>(null);
    const [reviewKey, setReviewKey] = useState(0);
    const [scanning, setScanning] = useState(false);

    async function pick(category: ScannableCategory) {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: true, quality: 1,
        });
        if (result.canceled) return;
        await process(category, result.assets.map((asset) => asset.uri));
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

    async function process(category: ScannableCategory, uris: string[]) {
        setScanning(true);
        try {
            const draft = category === 'gas' ? await scanGasImages(uris) : await scanDoorDashImages(uris);
            setPending(draft);
            setReviewKey((value) => value + 1);
        } catch (error) {
            console.error('Scan failed:', error);
            Alert.alert('Scan failed', 'The selected image could not be processed.');
        } finally {
            setScanning(false);
        }
    }

    function confirm(transaction: TransactionInput) {
        addTransaction(transaction);
        router.back();
    }

    return <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
        {pending ? <ScanResults key={reviewKey} draft={pending} onCancel={() => setPending(null)} onConfirm={confirm} /> : <>
            <Text style={[styles.title, { color: theme.text }]}>Scan transaction</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Choose the type of transaction you want to scan.</Text>
            <ScanButton label="Take gas-pump photo" onPress={takeGasPhoto} />
            <ScanButton label="Choose gas-pump photos" onPress={() => pick('gas')} />
            <ScanButton label="Choose DoorDash screenshots" onPress={() => pick('doordash')} />
            {scanning ? <View style={styles.loading}><ActivityIndicator /><Text style={{ color: theme.textSecondary }}>Reading images...</Text></View> : null}
        </>}
    </ScrollView>;
}

function ScanButton({ label, onPress }: { label: string; onPress: () => void }) {
    return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.65 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
    page: { flexGrow: 1, padding: 24 }, title: { fontSize: 30, fontWeight: '700', marginBottom: 8 }, hint: { fontSize: 16, lineHeight: 23, marginBottom: 24 }, button: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, marginBottom: 12, padding: 15 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }, loading: { alignItems: 'center', gap: 10, padding: 24 },
});
