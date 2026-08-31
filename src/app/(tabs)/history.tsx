import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';

import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { FinanceTransaction, TransactionCategory, TransactionType } from '@/types/transactions';

type TypeFilter = TransactionType | 'all';
type CategoryFilter = TransactionCategory | 'all';
type DateOrder = 'newest' | 'oldest';

const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All categories' },
    { value: 'doordash', label: 'DoorDash' },
    { value: 'ubereats', label: 'Uber' },
    { value: 'gas', label: 'Gas' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'food', label: 'Food' },
    { value: 'tolls', label: 'Tolls' },
    { value: 'tax', label: 'Tax' },
    { value: 'other', label: 'Other' },
];

export default function HistoryScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { transactions } = useFinances();
    const [showSort, setShowSort] = useState(false);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [dateOrder, setDateOrder] = useState<DateOrder>('newest');

    const visibleTransactions = useMemo(() => transactions
        .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
        .filter((transaction) => categoryFilter === 'all' || transaction.category === categoryFilter)
        .sort((a, b) => {
            const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return dateOrder === 'newest' ? difference : -difference;
        }), [transactions, typeFilter, categoryFilter, dateOrder]);

    const activeFilterCount = Number(typeFilter !== 'all') + Number(categoryFilter !== 'all') + Number(dateOrder !== 'newest');

    return (
        <View style={[styles.screen, { backgroundColor: theme.background }]}>
            <View style={styles.topBar}>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>Transaction history</Text>
                    <Text style={{ color: theme.textSecondary }}>{visibleTransactions.length} shown</Text>
                </View>
                <Pressable onPress={() => setShowSort(true)} style={styles.sortButton}>
                    <Text style={styles.sortButtonText}>Sort & filter{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {visibleTransactions.length === 0 ? (
                    <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions found</Text>
                        <Text style={{ color: theme.textSecondary }}>Add a transaction or change the filters.</Text>
                    </View>
                ) : visibleTransactions.map((transaction) => (
                    <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onPress={() => router.push(`/transaction/${transaction.id}` as Href)}
                    />
                ))}
            </ScrollView>

            <Modal animationType="slide" transparent visible={showSort} onRequestClose={() => setShowSort(false)}>
                <Pressable onPress={() => setShowSort(false)} style={styles.backdrop}>
                    <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sheetTitle, { color: theme.text }]}>Sort and filter</Text>
                        <FilterSection title="Transaction type">
                            <FilterChoice label="All" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
                            <FilterChoice label="Income" selected={typeFilter === 'income'} onPress={() => setTypeFilter('income')} />
                            <FilterChoice label="Expenses" selected={typeFilter === 'expense'} onPress={() => setTypeFilter('expense')} />
                        </FilterSection>
                        <FilterSection title="Date order">
                            <FilterChoice label="Newest to oldest" selected={dateOrder === 'newest'} onPress={() => setDateOrder('newest')} />
                            <FilterChoice label="Oldest to newest" selected={dateOrder === 'oldest'} onPress={() => setDateOrder('oldest')} />
                        </FilterSection>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
                        <ScrollView style={styles.categoryList}>
                            {categoryOptions.map((option) => (
                                <FilterChoice key={option.value} label={option.label} selected={categoryFilter === option.value} onPress={() => setCategoryFilter(option.value)} />
                            ))}
                        </ScrollView>
                        <View style={styles.sheetActions}>
                            <Pressable onPress={() => { setTypeFilter('all'); setCategoryFilter('all'); setDateOrder('newest'); }} style={styles.resetButton}><Text style={{ color: theme.text }}>Reset</Text></Pressable>
                            <Pressable onPress={() => setShowSort(false)} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

function TransactionRow({ transaction, onPress }: { transaction: FinanceTransaction; onPress: () => void }) {
    const theme = useTheme();
    const isIncome = transaction.type === 'income';
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.rowText}>
                <Text style={[styles.category, { color: theme.text }]}>{formatCategory(transaction.category)}</Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>{new Date(transaction.createdAt).toLocaleString()}</Text>
                {transaction.type === 'expense' && transaction.isBusinessExpense ? <Text style={styles.business}>Business expense</Text> : null}
            </View>
            <Text style={[styles.amount, { color: isIncome ? '#16A34A' : '#DC2626' }]}>{isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}</Text>
        </Pressable>
    );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
    const theme = useTheme();
    return <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>{children}</View>;
}

function FilterChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    const theme = useTheme();
    return <Pressable onPress={onPress} style={styles.choice}><View style={[styles.radio, { borderColor: selected ? '#2563EB' : theme.textSecondary }]}>{selected ? <View style={styles.radioDot} /> : null}</View><Text style={{ color: theme.text }}>{label}</Text></Pressable>;
}

function formatCategory(category: TransactionCategory) {
    if (category === 'doordash') return 'DoorDash';
    if (category === 'ubereats') return 'Uber';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    title: { fontSize: 25, fontWeight: '700', marginBottom: 3 },
    sortButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
    sortButtonText: { color: '#FFF', fontWeight: '700' },
    list: { gap: 10, paddingBottom: 28, paddingHorizontal: 20 },
    row: { alignItems: 'center', borderRadius: 13, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    rowText: { flex: 1, marginRight: 12 },
    category: { fontSize: 17, fontWeight: '700' },
    date: { fontSize: 13, marginTop: 4 },
    business: { color: '#2563EB', fontSize: 12, fontWeight: '600', marginTop: 4 },
    amount: { fontSize: 18, fontWeight: '700' },
    pressed: { opacity: 0.65 },
    empty: { alignItems: 'center', borderRadius: 14, padding: 28 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.55)', flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', padding: 22 },
    sheetTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
    section: { marginTop: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, marginTop: 12 },
    choice: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 42 },
    radio: { alignItems: 'center', borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 },
    radioDot: { backgroundColor: '#2563EB', borderRadius: 5, height: 10, width: 10 },
    categoryList: { maxHeight: 220 },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    resetButton: { alignItems: 'center', borderColor: '#9CA3AF', borderRadius: 10, borderWidth: 1, flex: 1, padding: 13 },
    doneButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 10, flex: 1, padding: 13 },
    doneText: { color: '#FFF', fontWeight: '700' },
});
