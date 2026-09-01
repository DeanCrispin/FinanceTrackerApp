import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { FinanceProvider } from '@/context/finance-context';
import { initializeDatabase } from '@/database/database';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <SQLiteProvider databaseName="finance.db" onInit={initializeDatabase}>
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <FinanceProvider>
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                        <Stack.Screen name="scan" options={{ title: 'Scan transaction' }} />
                        <Stack.Screen name="transaction/[id]" options={{ title: 'Edit transaction' }} />
                    </Stack>
                </FinanceProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} />
            </ThemeProvider>
        </SQLiteProvider>
    );
}
