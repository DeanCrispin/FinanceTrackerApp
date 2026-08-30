import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { TransactionDraft } from '@/types/transactions';

type Props = {
    draft: TransactionDraft;
    onCancel: () => void;
    onConfirm: (draft: TransactionDraft) => void;
};

export function ScanResults({ draft, onCancel, onConfirm }: Props) {
    const theme = useTheme();
    const [expense, setExpense] = useState(draft.type === 'gas' ? draft.expense?.toFixed(2) ?? '' : '');
    const [gallons, setGallons] = useState(draft.type === 'gas' ? draft.gallons?.toFixed(3) ?? '' : '');
    const [revenue, setRevenue] = useState(draft.type === 'doordash' ? draft.revenue?.toFixed(2) ?? '' : '');
    const initialMinutes = draft.type === 'doordash' ? draft.minutes : null;
    const [hours, setHours] = useState(initialMinutes === null ? '' : Math.floor(initialMinutes / 60).toString());
    const [minutes, setMinutes] = useState(initialMinutes === null ? '' : (initialMinutes % 60).toString());
    const [deliveries, setDeliveries] = useState(draft.type === 'doordash' ? draft.deliveries?.toString() ?? '' : '');
    const [miles, setMiles] = useState(draft.type === 'doordash' ? draft.miles?.toString() ?? '' : '');
    const [error, setError] = useState('');

    function optionalNumber(value: string) {
        return value.trim() === '' ? null : Number(value);
    }

    function confirm() {
        if (draft.type === 'gas') {
            const nextExpense = optionalNumber(expense);
            const nextGallons = optionalNumber(gallons);
            if ((nextExpense !== null && (!Number.isFinite(nextExpense) || nextExpense < 0)) ||
                (nextGallons !== null && (!Number.isFinite(nextGallons) || nextGallons < 0))) {
                setError('Enter valid positive numbers for expense and gallons.');
                return;
            }
            if (nextExpense === null && nextGallons === null) {
                setError('Enter an expense, gallons, or both.');
                return;
            }
            onConfirm({ type: 'gas', expense: nextExpense, gallons: nextGallons });
            return;
        }

        const nextRevenue = optionalNumber(revenue);
        const nextHours = optionalNumber(hours) ?? 0;
        const nextMinutes = optionalNumber(minutes) ?? 0;
        const nextDeliveries = optionalNumber(deliveries);
        const nextMiles = optionalNumber(miles);
        if ((nextRevenue !== null && (!Number.isFinite(nextRevenue) || nextRevenue < 0)) ||
            !Number.isInteger(nextHours) || nextHours < 0 ||
            !Number.isInteger(nextMinutes) || nextMinutes < 0 || nextMinutes > 59 ||
            (nextDeliveries !== null && (!Number.isInteger(nextDeliveries) || nextDeliveries < 0)) ||
            (nextMiles !== null && (!Number.isFinite(nextMiles) || nextMiles < 0))) {
            setError('Use positive values, whole hours and deliveries, and minutes from 0 to 59.');
            return;
        }
        const totalMinutes = nextHours * 60 + nextMinutes;
        if (nextRevenue === null && totalMinutes === 0 && nextDeliveries === null && nextMiles === null) {
            setError('Enter revenue, time, deliveries, or miles.');
            return;
        }
        onConfirm({
            type: 'doordash',
            revenue: nextRevenue,
            minutes: totalMinutes,
            deliveries: nextDeliveries,
            miles: nextMiles,
        });
    }

    const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

    return (
        <View>
            <Text style={[styles.title, { color: theme.text }]}>Does this look correct?</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap any field to correct it before confirming.</Text>
            {draft.type === 'gas' ? (
                <>
                    <Field label="Expense" value={expense} onChangeText={setExpense} prefix="$" style={inputStyle} />
                    <Field label="Gallons" value={gallons} onChangeText={setGallons} style={inputStyle} />
                </>
            ) : (
                <>
                    <Field label="Revenue" value={revenue} onChangeText={setRevenue} prefix="$" style={inputStyle} />
                    <View style={styles.row}>
                        <View style={styles.flex}><Field label="Hours" value={hours} onChangeText={setHours} style={inputStyle} integer /></View>
                        <View style={styles.flex}><Field label="Minutes" value={minutes} onChangeText={setMinutes} style={inputStyle} integer /></View>
                    </View>
                    <Field label="Deliveries" value={deliveries} onChangeText={setDeliveries} style={inputStyle} integer />
                    <Field label="Miles" value={miles} onChangeText={setMiles} style={inputStyle} />
                </>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={confirm} style={styles.confirm}><Text style={styles.confirmText}>Confirm transaction</Text></Pressable>
            <Pressable onPress={onCancel} style={styles.cancel}><Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text></Pressable>
        </View>
    );
}

type FieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    prefix?: string;
    integer?: boolean;
    style: object;
};

function Field({ label, value, onChangeText, prefix, integer, style }: FieldProps) {
    const theme = useTheme();
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <View style={styles.inputRow}>
                {prefix ? <Text style={[styles.prefix, { color: theme.text }]}>{prefix}</Text> : null}
                <TextInput
                    keyboardType={integer ? 'number-pad' : 'decimal-pad'}
                    onChangeText={onChangeText}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    selectTextOnFocus
                    style={[style, styles.flex, prefix ? styles.prefixedInput : null]}
                    value={value}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
    hint: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    field: { marginTop: 10 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    inputRow: { alignItems: 'center', flexDirection: 'row', position: 'relative' },
    input: { borderRadius: 10, fontSize: 18, paddingHorizontal: 14, paddingVertical: 12 },
    prefix: { fontSize: 18, left: 14, position: 'absolute', zIndex: 1 },
    prefixedInput: { paddingLeft: 30 },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    error: { color: '#DC2626', fontSize: 13, marginTop: 12 },
    confirm: { alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 12, marginTop: 20, padding: 15 },
    confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    cancel: { alignItems: 'center', padding: 12 },
    cancelText: { fontSize: 16, fontWeight: '600' },
});
