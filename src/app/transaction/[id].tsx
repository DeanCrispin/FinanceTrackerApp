import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { TransactionInput } from '@/types/transactions';

export default function EditTransactionScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { transactions, updateTransaction, deleteTransaction } = useFinances();
    const transaction = transactions.find((item) => item.id === id);

    if (!transaction) {
        return (
            <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
                <Text style={[styles.missingTitle, { color: theme.text }]}>Transaction not found</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.buttonText}>Back</Text></Pressable>
            </ScrollView>
        );
    }

    function save(changes: TransactionInput) {
        updateTransaction(transaction!.id, changes);
        router.back();
    }

    function remove() {
        Alert.alert('Delete transaction?', 'This permanently removes the transaction from your totals and history.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    deleteTransaction(transaction!.id);
                    router.back();
                },
            },
        ]);
    }

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
            <ScanResults draft={transaction} title="Edit transaction" confirmLabel="Save changes" onCancel={() => router.back()} onConfirm={save} />
            <Pressable onPress={remove} style={styles.deleteButton}><Text style={styles.deleteText}>Delete transaction</Text></Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: { flexGrow: 1, padding: 24 },
    deleteButton: { alignItems: 'center', borderColor: '#DC2626', borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 14 },
    deleteText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
    missingTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
    backButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, padding: 14 },
    buttonText: { color: '#FFF', fontWeight: '700' },
});
