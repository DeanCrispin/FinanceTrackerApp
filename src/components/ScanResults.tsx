import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { TransactionDraft, TransactionInput } from '@/types/transactions';

type Props = {
    draft: TransactionDraft;
    onCancel: () => void;
    onConfirm: (transaction: TransactionInput) => void;
    title?: string;
    confirmLabel?: string;
};

export function ScanResults({ draft, onCancel, onConfirm, title = 'Does this look correct?', confirmLabel = 'Confirm transaction' }: Props) {
    const theme = useTheme();
    const [amount, setAmount] = useState(draft.amount?.toFixed(2) ?? '');
    const [gallons, setGallons] = useState(draft.category === 'gas' ? draft.gallons?.toFixed(3) ?? '' : '');
    const isDeliveryIncome = draft.category === 'doordash' || draft.category === 'ubereats';
    const initialMinutes = isDeliveryIncome ? draft.minutes : null;
    const [hours, setHours] = useState(initialMinutes === null ? '' : Math.floor(initialMinutes / 60).toString());
    const [minutes, setMinutes] = useState(initialMinutes === null ? '' : (initialMinutes % 60).toString());
    const [deliveries, setDeliveries] = useState(isDeliveryIncome ? draft.deliveries?.toString() ?? '' : '');
    const [miles, setMiles] = useState(draft.category === 'doordash' ? draft.miles?.toString() ?? '' : '');
    const [isBusinessExpense, setIsBusinessExpense] = useState(draft.type === 'expense' && draft.isBusinessExpense);
    const [error, setError] = useState('');

    function optionalNumber(value: string) {
        return value.trim() === '' ? null : Number(value);
    }

    function confirm() {
        if (draft.category === 'gas') {
            const nextAmount = optionalNumber(amount);
            const nextGallons = optionalNumber(gallons);
            if (nextAmount === null || !Number.isFinite(nextAmount) || nextAmount < 0 ||
                (nextGallons !== null && (!Number.isFinite(nextGallons) || nextGallons < 0))) {
                setError('Enter a valid positive amount and optional gallons.');
                return;
            }
            onConfirm({ type: 'expense', category: 'gas', amount: nextAmount, gallons: nextGallons, isBusinessExpense });
            return;
        }

        const nextAmount = optionalNumber(amount);
        if (!isDeliveryIncome) {
            if (nextAmount === null || !Number.isFinite(nextAmount) || nextAmount < 0) {
                setError('Enter a valid positive amount.');
                return;
            }
            if (draft.type === 'expense') {
                onConfirm({ ...draft, amount: nextAmount, isBusinessExpense });
            } else {
                onConfirm({ ...draft, amount: nextAmount });
            }
            return;
        }

        const nextHours = optionalNumber(hours) ?? 0;
        const nextMinutes = optionalNumber(minutes) ?? 0;
        const nextDeliveries = optionalNumber(deliveries);
        const nextMiles = draft.category === 'doordash' ? optionalNumber(miles) : null;
        if (nextAmount === null || !Number.isFinite(nextAmount) || nextAmount < 0 ||
            !Number.isInteger(nextHours) || nextHours < 0 ||
            !Number.isInteger(nextMinutes) || nextMinutes < 0 || nextMinutes > 59 ||
            (nextDeliveries !== null && (!Number.isInteger(nextDeliveries) || nextDeliveries < 0)) ||
            (nextMiles !== null && (!Number.isFinite(nextMiles) || nextMiles < 0))) {
            setError('Enter a valid positive amount, whole hours and deliveries, and minutes from 0 to 59.');
            return;
        }
        const totalMinutes = nextHours * 60 + nextMinutes;
        if (draft.category === 'doordash') {
            onConfirm({
                type: 'income', category: 'doordash', amount: nextAmount,
                minutes: totalMinutes, deliveries: nextDeliveries, miles: nextMiles,
            });
        } else {
            onConfirm({
                type: 'income', category: 'ubereats', amount: nextAmount,
                minutes: totalMinutes, deliveries: nextDeliveries,
            });
        }
    }

    const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

    return (
        <View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap any field to correct it before confirming.</Text>
            {draft.category === 'gas' ? (
                <>
                    <Field label="Amount" value={amount} onChangeText={setAmount} prefix="$" style={inputStyle} />
                    <Field label="Gallons" value={gallons} onChangeText={setGallons} style={inputStyle} />
                </>
            ) : isDeliveryIncome ? (
                <>
                    <Field label="Amount" value={amount} onChangeText={setAmount} prefix="$" style={inputStyle} />
                    <View style={styles.row}>
                        <View style={styles.flex}><Field label="Hours" value={hours} onChangeText={setHours} style={inputStyle} integer /></View>
                        <View style={styles.flex}><Field label="Minutes" value={minutes} onChangeText={setMinutes} style={inputStyle} integer /></View>
                    </View>
                    <Field label={draft.category === 'ubereats' ? 'Trips' : 'Deliveries'} value={deliveries} onChangeText={setDeliveries} style={inputStyle} integer />
                    {draft.category === 'doordash' ? <Field label="Miles" value={miles} onChangeText={setMiles} style={inputStyle} /> : null}
                </>
            ) : (
                <Field label="Amount" value={amount} onChangeText={setAmount} prefix="$" style={inputStyle} />
            )}
            {draft.type === 'expense' ? (
                <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isBusinessExpense }}
                    onPress={() => setIsBusinessExpense((value) => !value)}
                    style={styles.checkboxRow}>
                    <View style={[styles.checkbox, { borderColor: theme.textSecondary }, isBusinessExpense && styles.checkboxChecked]}>
                        {isBusinessExpense ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <View style={styles.flex}>
                        <Text style={[styles.checkboxLabel, { color: theme.text }]}>Business expense</Text>
                        <Text style={[styles.checkboxHint, { color: theme.textSecondary }]}>Subtract this expense when calculating hourly net revenue.</Text>
                    </View>
                </Pressable>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={confirm} style={styles.confirm}><Text style={styles.confirmText}>{confirmLabel}</Text></Pressable>
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
    checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 18 },
    checkbox: { alignItems: 'center', borderRadius: 5, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
    checkboxChecked: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    checkmark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    checkboxLabel: { fontSize: 16, fontWeight: '600' },
    checkboxHint: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
