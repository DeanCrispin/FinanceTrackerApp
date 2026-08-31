import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { FinanceProvider } from '@/context/finance-context';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
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
    );
}
