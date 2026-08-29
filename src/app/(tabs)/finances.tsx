import { StyleSheet, Text, View } from 'react-native';

export default function FinancesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Finances</Text>
            <Text style={styles.subtitle}>
                Your income, expenses, and budget will appear here.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
});