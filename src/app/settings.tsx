import { Appearance, StyleSheet, Switch, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const theme = useTheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.label, { color: theme.text }]}>Dark mode</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        Use a darker appearance throughout the app.
                    </Text>
                </View>
                <Switch
                    accessibilityLabel="Dark mode"
                    onValueChange={(enabled) => Appearance.setColorScheme(enabled ? 'dark' : 'light')}
                    trackColor={{ false: '#9CA3AF', true: '#2563EB' }}
                    value={isDark}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    row: {
        alignItems: 'center',
        borderRadius: 14,
        flexDirection: 'row',
        padding: 16,
    },
    labelContainer: {
        flex: 1,
        paddingRight: 16,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 3,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
});
