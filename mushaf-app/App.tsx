// App.tsx
// Quran 15-line Mushaf App - Direct API version (Expo Go compatible)
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { ReaderScreen } from './src/screens/ReaderScreen';

// Force RTL layout for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(false);

export type RootStackParamList = {
  Reader: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e6f5c" />
        <Text style={styles.loadingText}>جار التحميل...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Reader"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1e6f5c'
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18
            },
            cardStyle: { backgroundColor: '#fefcf3' }
          }}
        >
          <Stack.Screen
            name="Reader"
            component={ReaderScreen}
            options={{
              title: 'القرآن الكريم',
              headerTitleAlign: 'center'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefcf3'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#1e6f5c'
  }
});
