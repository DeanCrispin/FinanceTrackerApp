import { Tabs, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
    const { bottom } = useSafeAreaInsets();
    const router = useRouter();
    const theme = useTheme();
    const bottomPadding = Platform.OS === 'android' ? Math.max(bottom, 8) : 8;

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                headerRight: () => (
                    <Pressable
                        accessibilityLabel="Open settings"
                        accessibilityRole="button"
                        hitSlop={12}
                        onPress={() => router.push('/settings')}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                        <SymbolView
                            name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                            size={24}
                            tintColor={theme.text}
                        />
                    </Pressable>
                ),
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: theme.background,
                    borderTopColor: theme.backgroundElement,
                    height: 57 + bottomPadding,
                    paddingBottom: bottomPadding,
                    paddingTop: 8,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    headerTitle: 'Finance Tracker',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'house', android: 'home' }}
                            size={size}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="finances"
                options={{
                    title: 'Finances',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'wallet.bifold', android: 'account_balance_wallet' }}
                            size={size}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'clock.arrow.circlepath', android: 'history' }}
                            size={size}
                            tintColor={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
