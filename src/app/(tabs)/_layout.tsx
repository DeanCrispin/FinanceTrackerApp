import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const { bottom } = useSafeAreaInsets();
    const bottomPadding = Platform.OS === 'android' ? Math.max(bottom, 8) : 8;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
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
        </Tabs>
    );
}
