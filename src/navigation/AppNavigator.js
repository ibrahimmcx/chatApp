import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();

const MyTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: COLORS.background,
        card: COLORS.surface,
        text: COLORS.text,
        border: COLORS.border,
        primary: COLORS.primary,
    },
};

export default function AppNavigator({ isAuthenticated, onLoginSuccess, onRegisterSuccess, onLogout, userId, userName }) {
    return (
        <NavigationContainer theme={MyTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <>
                        <Stack.Screen name="Login">
                            {props => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
                        </Stack.Screen>
                        <Stack.Screen name="Register">
                            {props => <RegisterScreen {...props} onRegisterSuccess={onRegisterSuccess} />}
                        </Stack.Screen>
                    </>
                ) : (
                    <>
                        <Stack.Screen 
                            name="ChatList" 
                            initialParams={{ userId, userName }}
                        >
                            {props => <ChatListScreen {...props} onLogout={onLogout} />}
                        </Stack.Screen>
                        <Stack.Screen 
                            name="Chat" 
                            component={ChatScreen}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
