import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFinances } from '@/context/finance-context';
import { useTheme } from '@/hooks/use-theme';
import { FinanceTransaction } from '@/types/transactions';

export default function FinanceDashboard() {
    const theme = useTheme();
    const router = useRouter();
    const { transactions, totals, isLoading, error } = useFinances();
    const last = transactions.at(-1);
    const hours = totals.minutes / 60;
    const net = totals.income - totals.expenses;
    const hourlyNet = hours > 0 ? (totals.deliveryIncome - totals.businessExpenses) / hours : 0;

    if (isLoading) {
        return (
            <View style={[styles.status, { backgroundColor: theme.background }]}>
                <ActivityIndicator />
                <Text style={{ color: theme.textSecondary }}>Loading finances...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.status, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorTitle, { color: theme.text }]}>Could not load finances</Text>
                <Text style={{ color: theme.textSecondary }}>{error.message}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
            <Text style={[styles.title, { color: theme.text }]}>Finances</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Add expenses and income to build your running totals.</Text>
            <View style={styles.primaryGrid}>
                <Metric label="Total revenue" value={`$${totals.income.toFixed(2)}`} color="#16A34A" theme={theme} />
                <Metric label="Delivery hours" value={hours.toFixed(2)} theme={theme} />
                <Metric label="Total expenses" value={`$${totals.expenses.toFixed(2)}`} color="#DC2626" theme={theme} />
                <Metric label="Net revenue" value={`$${net.toFixed(2)}`} theme={theme} />
                <Metric label="Hourly delivery net revenue" value={`$${hourlyNet.toFixed(2)}`} theme={theme} />
            </View>
            <Text style={[styles.count, { color: theme.textSecondary }]}>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} added</Text>
            <Pressable onPress={() => router.push('/scan')} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Text style={styles.addText}>Add transaction</Text>
            </Pressable>
            {last ? <LastTransaction transaction={last} theme={theme} /> : null}
            <View style={styles.secondaryGrid}>
                <SmallMetric label="Gallons" value={totals.gallons.toFixed(3)} theme={theme} />
                <SmallMetric label="Deliveries" value={String(totals.deliveries)} theme={theme} />
                <SmallMetric label="Miles" value={totals.miles.toFixed(1)} theme={theme} />
            </View>
        </ScrollView>
    );
}

function Metric({ label, value, color, theme }: any) { return <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.metricLabel, { color: color ?? theme.textSecondary }]}>{label}</Text><Text style={[styles.metricValue, { color: color ?? theme.text }]}>{value}</Text></View>; }
function SmallMetric({ label, value, theme }: any) { return <View style={[styles.smallMetric, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.smallLabel, { color: theme.textSecondary }]}>{label}</Text><Text style={[styles.smallValue, { color: theme.text }]}>{value}</Text></View>; }
function LastTransaction({ transaction, theme }: { transaction: FinanceTransaction; theme: ReturnType<typeof useTheme> }) { return <View style={[styles.last, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.lastTitle, { color: theme.text }]}>Last transaction</Text><Text style={{ color: theme.textSecondary }}>Category: {formatCategory(transaction.category)}</Text><Text style={{ color: theme.textSecondary }}>Amount: ${transaction.amount.toFixed(2)}</Text>{transaction.category === 'gas' ? <Text style={{ color: theme.textSecondary }}>Gallons: {transaction.gallons ?? '-'}</Text> : transaction.category === 'doordash' || transaction.category === 'ubereats' ? <><Text style={{ color: theme.textSecondary }}>Hours: {((transaction.minutes ?? 0) / 60).toFixed(2)}</Text><Text style={{ color: theme.textSecondary }}>{transaction.category === 'ubereats' ? 'Trips' : 'Deliveries'}: {transaction.deliveries ?? '-'}</Text>{transaction.category === 'doordash' ? <Text style={{ color: theme.textSecondary }}>Miles: {transaction.miles ?? '-'}</Text> : null}</> : null}</View>; }

function formatCategory(category: FinanceTransaction['category']) {
    if (category === 'doordash') return 'DoorDash';
    if (category === 'ubereats') return 'Uber';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

const styles = StyleSheet.create({
    status: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 }, errorTitle: { fontSize: 20, fontWeight: '700' },
    page: { flexGrow: 1, padding: 24 }, title: { fontSize: 32, fontWeight: '700', marginBottom: 8 }, subtitle: { fontSize: 16, lineHeight: 23, marginBottom: 28 },
    primaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { borderRadius: 14, flex: 1, flexBasis: '45%', padding: 16 }, metricLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 }, metricValue: { fontSize: 25, fontWeight: '700' },
    count: { fontSize: 14, marginVertical: 12, textAlign: 'center' }, addButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, padding: 16 }, addText: { color: '#FFF', fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.65 },
    last: { borderRadius: 14, gap: 4, marginTop: 24, padding: 16 }, lastTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 }, secondaryGrid: { flexDirection: 'row', gap: 8, marginTop: 24 }, smallMetric: { borderRadius: 12, flex: 1, padding: 12 }, smallLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 }, smallValue: { fontSize: 18, fontWeight: '700' },
});
