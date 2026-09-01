import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScanResults } from '@/components/ScanResults';
import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { TransactionInput } from '@/types/transactions';

export default function EditTransactionScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { transactions, isLoading, error, updateTransaction, deleteTransaction } = useFinances();
    const transaction = transactions.find((item) => item.id === id);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (isLoading) {
        return (
            <View style={[styles.loadingPage, { backgroundColor: theme.background }]}>
                <ActivityIndicator />
                <Text style={{ color: theme.textSecondary }}>Loading transaction...</Text>
            </View>
        );
    }

    if (error || !transaction) {
        return (
            <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
                <Text style={[styles.missingTitle, { color: theme.text }]}>{error ? 'Could not load transaction' : 'Transaction not found'}</Text>
                {error ? <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error.message}</Text> : null}
                <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.buttonText}>Back</Text></Pressable>
            </ScrollView>
        );
    }

    async function save(changes: TransactionInput) {
        if (saving || deleting) return;

        setSaving(true);
        try {
            await updateTransaction(transaction!.id, changes);
            router.back();
        } catch (error) {
            console.error('Update failed:', error);
            Alert.alert('Save failed', 'The transaction could not be updated. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    function remove() {
        Alert.alert('Delete transaction?', 'This permanently removes the transaction from your totals and history.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => void confirmDelete(),
            },
        ]);
    }

    async function confirmDelete() {
        if (saving || deleting) return;

        setDeleting(true);
        try {
            await deleteTransaction(transaction!.id);
            router.back();
        } catch (error) {
            console.error('Delete failed:', error);
            Alert.alert('Delete failed', 'The transaction could not be deleted. Please try again.');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
            <ScanResults draft={transaction} title="Edit transaction" confirmLabel="Save changes" onCancel={() => router.back()} onConfirm={save} />
            {saving || deleting ? <View style={styles.progress}><ActivityIndicator /><Text style={{ color: theme.textSecondary }}>{deleting ? 'Deleting transaction...' : 'Saving changes...'}</Text></View> : null}
            <Pressable disabled={saving || deleting} onPress={remove} style={styles.deleteButton}><Text style={styles.deleteText}>Delete transaction</Text></Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: { flexGrow: 1, padding: 24 },
    loadingPage: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
    errorText: { marginBottom: 20 },
    deleteButton: { alignItems: 'center', borderColor: '#DC2626', borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 14 },
    deleteText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
    progress: { alignItems: 'center', gap: 8, padding: 12 },
    missingTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
    backButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, padding: 14 },
    buttonText: { color: '#FFF', fontWeight: '700' },
});
