/**
 * SecureChat - Uçtan Uca Şifreli Mesajlaşma Uygulaması
 */

import React, { useState, useEffect } from 'react';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { checkSessionValidity, startSessionMonitor, stopSessionMonitor } from './src/security/sessionManager';
import { enableScreenshotProtection, startClipboardProtection, stopClipboardProtection } from './src/security/antiScreenshot';
import { connectSocket, disconnectSocket } from './src/services/socketService';

LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle',
]);

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const [clipboardProtectionId, setClipboardProtectionId] = useState(null);

    useEffect(() => {
        initializeApp();

        return () => {
            stopSessionMonitor();
            disconnectSocket();
            if (clipboardProtectionId) {
                stopClipboardProtection(clipboardProtectionId);
            }
        };
    }, []);

    const initializeApp = async () => {
        enableScreenshotProtection();
        const protectionId = startClipboardProtection();
        setClipboardProtectionId(protectionId);

        const isValid = await checkSessionValidity();
        if (!isValid) {
            setIsAuthenticated(false);
        }

        startSessionMonitor(() => {
            handleSessionExpired();
        });
    };

    const handleSessionExpired = () => {
        disconnectSocket();
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setCurrentUserName('');
    };

    const handleLoginSuccess = (userId, userName) => {
        setCurrentUserId(userId);
        setCurrentUserName(userName);
        setIsAuthenticated(true);
        connectSocket(userId);
    };

    const handleRegisterSuccess = (userId, userName) => {
        setCurrentUserId(userId);
        setCurrentUserName(userName);
        setIsAuthenticated(true);
        connectSocket(userId);
    };

    const handleLogout = () => {
        disconnectSocket();
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setCurrentUserName('');
    };

    return (
        <AppNavigator
            isAuthenticated={isAuthenticated}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            onLogout={handleLogout}
            userId={currentUserId}
            userName={currentUserName}
        />
    );
}
