import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { scanDoorDashImages, scanGasImages } from '@/services/transaction-scanner';
import { TransactionDraft } from '@/types/transactions';

type Menu = 'type' | 'expense' | 'income' | 'gas-source' | 'doordash-source' | null;

export default function FinanceDashboard() {
    const theme = useTheme();
    const { transactions, totals, addTransaction } = useFinances();
    const [menu, setMenu] = useState<Menu>(null);
    const [pending, setPending] = useState<TransactionDraft | null>(null);
    const [reviewKey, setReviewKey] = useState(0);
    const [scanning, setScanning] = useState(false);
    const last = transactions.at(-1);
    const hours = totals.minutes / 60;
    const net = totals.revenue - totals.expenses;
    const hourlyNet = hours > 0 ? net / hours : 0;

    function review(draft: TransactionDraft, allowEmpty = false) {
        const empty = draft.type === 'gas'
            ? draft.expense === null && draft.gallons === null
            : draft.revenue === null && draft.minutes === null && draft.deliveries === null && draft.miles === null;
        if (empty && !allowEmpty) {
            Alert.alert('No information found', 'No transaction values could be identified. You can try another image or enter them manually.');
            return;
        }
        setPending(draft);
        setReviewKey((value) => value + 1);
    }

    async function selectImages(type: 'gas' | 'doordash') {
        setMenu(null);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: true, quality: 1,
        });
        if (result.canceled) return;
        setScanning(true);
        try {
            const uris = result.assets.map((asset) => asset.uri);
            review(type === 'gas' ? await scanGasImages(uris) : await scanDoorDashImages(uris));
        } catch (error) {
            console.error('Transaction scan failed:', error);
            Alert.alert('Scan failed', 'The selected image could not be processed.');
        } finally {
            setScanning(false);
        }
    }

    async function takeGasPhoto() {
        setMenu(null);
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Camera permission required', 'Allow camera access to photograph a gas pump.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
        if (result.canceled) return;
        setScanning(true);
        try {
            review(await scanGasImages([result.assets[0].uri]));
        } catch (error) {
            console.error('Gas scan failed:', error);
            Alert.alert('Scan failed', 'The gas-pump image could not be processed.');
        } finally {
            setScanning(false);
        }
    }

    function manual(type: 'gas' | 'doordash') {
        setMenu(null);
        review(type === 'gas'
            ? { type: 'gas', expense: null, gallons: null }
            : { type: 'doordash', revenue: null, minutes: null, deliveries: null, miles: null }, true);
    }

    function confirm(draft: TransactionDraft) {
        addTransaction(draft);
        setPending(null);
    }

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
            <Text style={[styles.title, { color: theme.text }]}>Finances</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Add expenses and income to build your running totals.</Text>
            <View style={styles.primaryGrid}>
                <Metric label="Total revenue" value={`$${totals.revenue.toFixed(2)}`} color="#16A34A" theme={theme} />
                <Metric label="Total hours" value={hours.toFixed(2)} theme={theme} />
                <Metric label="Total expenses" value={`$${totals.expenses.toFixed(2)}`} color="#DC2626" theme={theme} />
                <Metric label="Net revenue" value={`$${net.toFixed(2)}`} theme={theme} />
                <Metric label="Hourly net revenue" value={`$${hourlyNet.toFixed(2)}`} theme={theme} />
            </View>
            <Text style={[styles.count, { color: theme.textSecondary }]}>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} added</Text>
            <Pressable disabled={scanning} onPress={() => setMenu('type')} style={({ pressed }) => [styles.addButton, (pressed || scanning) && styles.pressed]}>
                {scanning ? <View style={styles.loading}><ActivityIndicator color="#FFF" /><Text style={styles.addText}>Reading photos...</Text></View> : <Text style={styles.addText}>Add transaction</Text>}
            </Pressable>
            {last ? <LastTransaction transaction={last} theme={theme} /> : null}
            <View style={styles.secondaryGrid}>
                <SmallMetric label="Gallons" value={totals.gallons.toFixed(3)} theme={theme} />
                <SmallMetric label="Deliveries" value={String(totals.deliveries)} theme={theme} />
                <SmallMetric label="Miles" value={totals.miles.toFixed(1)} theme={theme} />
            </View>
            <Modal transparent animationType="fade" visible={menu !== null || pending !== null} onRequestClose={() => { setMenu(null); setPending(null); }}>
                <Pressable style={styles.backdrop} onPress={() => { setMenu(null); setPending(null); }}>
                    <Pressable onPress={(event) => event.stopPropagation()} style={[styles.modal, { backgroundColor: theme.background }]}>
                        {pending ? <ScanResults key={reviewKey} draft={pending} onCancel={() => setPending(null)} onConfirm={confirm} /> : (
                            <MenuContent menu={menu} setMenu={setMenu} selectImages={selectImages} takeGasPhoto={takeGasPhoto} manual={manual} theme={theme} />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

function MenuContent({ menu, setMenu, selectImages, takeGasPhoto, manual, theme }: any) {
    const title = menu === 'type' ? 'Add transaction' : menu === 'expense' ? 'Choose expense type' : menu === 'income' ? 'Choose income source' : menu === 'gas-source' ? 'Add gas receipt' : 'Add DoorDash summary';
    return <><Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
        {menu === 'type' && <><Choice label="Expense" onPress={() => setMenu('expense')} theme={theme} /><Choice label="Income" onPress={() => setMenu('income')} theme={theme} /></>}
        {menu === 'expense' && <><Choice label="Gas" onPress={() => setMenu('gas-source')} theme={theme} /><Choice label="Taxes - coming soon" onPress={() => Alert.alert('Coming soon')} theme={theme} /><Choice label="Car expenses - coming soon" onPress={() => Alert.alert('Coming soon')} theme={theme} /></>}
        {menu === 'income' && <Choice label="DoorDash" onPress={() => setMenu('doordash-source')} theme={theme} />}
        {menu === 'gas-source' && <><Choice label="Take photo" onPress={takeGasPhoto} theme={theme} /><Choice label="Choose photos from library" onPress={() => selectImages('gas')} theme={theme} /><Choice label="Enter manually" onPress={() => manual('gas')} theme={theme} /></>}
        {menu === 'doordash-source' && <><Choice label="Choose photos from library" onPress={() => selectImages('doordash')} theme={theme} /><Choice label="Enter manually" onPress={() => manual('doordash')} theme={theme} /></>}
        <Pressable onPress={() => setMenu(null)} style={styles.cancel}><Text style={{ color: theme.textSecondary }}>Cancel</Text></Pressable>
    </>;
}

function Choice({ label, onPress, theme }: any) { return <Pressable onPress={onPress} style={[styles.choice, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.choiceText, { color: theme.text }]}>{label}</Text></Pressable>; }
function Metric({ label, value, color, theme }: any) { return <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.metricLabel, { color: color ?? theme.textSecondary }]}>{label}</Text><Text style={[styles.metricValue, { color: color ?? theme.text }]}>{value}</Text></View>; }
function SmallMetric({ label, value, theme }: any) { return <View style={[styles.smallMetric, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.smallLabel, { color: theme.textSecondary }]}>{label}</Text><Text style={[styles.smallValue, { color: theme.text }]}>{value}</Text></View>; }
function LastTransaction({ transaction, theme }: any) { return <View style={[styles.last, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.lastTitle, { color: theme.text }]}>Last transaction</Text><Text style={{ color: theme.textSecondary }}>Type: {transaction.type === 'gas' ? 'Gas' : 'DoorDash'}</Text>{transaction.type === 'gas' ? <><Text style={{ color: theme.textSecondary }}>Expense: {transaction.expense === null ? '-' : `$${transaction.expense.toFixed(2)}`}</Text><Text style={{ color: theme.textSecondary }}>Gallons: {transaction.gallons ?? '-'}</Text></> : <><Text style={{ color: theme.textSecondary }}>Revenue: {transaction.revenue === null ? '-' : `$${transaction.revenue.toFixed(2)}`}</Text><Text style={{ color: theme.textSecondary }}>Hours: {((transaction.minutes ?? 0) / 60).toFixed(2)}</Text><Text style={{ color: theme.textSecondary }}>Deliveries: {transaction.deliveries ?? '-'}</Text><Text style={{ color: theme.textSecondary }}>Miles: {transaction.miles ?? '-'}</Text></>}</View>; }

const styles = StyleSheet.create({
    page: { flexGrow: 1, padding: 24 }, title: { fontSize: 32, fontWeight: '700', marginBottom: 8 }, subtitle: { fontSize: 16, lineHeight: 23, marginBottom: 28 },
    primaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { borderRadius: 14, flex: 1, flexBasis: '45%', padding: 16 }, metricLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 }, metricValue: { fontSize: 25, fontWeight: '700' },
    count: { fontSize: 14, marginVertical: 12, textAlign: 'center' }, addButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, padding: 16 }, addText: { color: '#FFF', fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.65 }, loading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    last: { borderRadius: 14, gap: 4, marginTop: 24, padding: 16 }, lastTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 }, secondaryGrid: { flexDirection: 'row', gap: 8, marginTop: 24 }, smallMetric: { borderRadius: 12, flex: 1, padding: 12 }, smallLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 }, smallValue: { fontSize: 18, fontWeight: '700' },
    backdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', flex: 1, justifyContent: 'center', padding: 24 }, modal: { borderRadius: 18, maxWidth: 420, padding: 20, width: '100%' }, modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 }, choice: { borderRadius: 12, marginBottom: 10, padding: 15 }, choiceText: { fontSize: 16, fontWeight: '600' }, cancel: { alignItems: 'center', padding: 12 },
});
