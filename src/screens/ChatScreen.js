import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    FlatList, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform, 
    Text, 
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generateAESKey, encryptMessage, decryptMessage } from '../crypto/aes';
import { encryptWithPublicKey, decryptWithPrivateKey } from '../crypto/rsa';
import { sendEncryptedMessage, addMessageListener, removeMessageListener, getChatId, isSocketConnected, emitDebugLog } from '../services/socketService';
import { uint8ArrayToBase64, base64ToUint8Array } from '../utils/helpers';
import { updateLastActivity } from '../security/sessionManager';
import { getUserList } from '../services/authService';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function ChatScreen({ route, navigation }) {
    const [messages, setMessages] = useState([]);
    const [decryptedMessages, setDecryptedMessages] = useState({});
    const [connected, setConnected] = useState(isSocketConnected());
    const [onlineUsers, setOnlineUsers] = useState([]);
    const flatListRef = useRef(null);

    const { userId, receiverId, userName, receiverPublicKey, currentUserName } = route.params;
    const chatId = getChatId(userId, receiverId);

    useEffect(() => {
        loadOnlineUsers();
        const interval = setInterval(loadOnlineUsers, 5000);

        const handleNewMessage = (message) => {
            setMessages(prev => [...prev, message]);
            if (message.senderId !== userId) {
                tryDecryptMessage(message);
            }
        };

        addMessageListener(chatId, handleNewMessage);

        return () => {
            removeMessageListener(chatId, handleNewMessage);
            clearInterval(interval);
        };
    }, [chatId]);

    const loadOnlineUsers = async () => {
        const users = await getUserList(userId);
        const online = users.filter(u => u.isOnline);
        setOnlineUsers(online);
    };

    const tryDecryptMessage = async (message) => {
        try {
            const aesKeyEncrypted = message.encryptedAESKey;
            let aesKeyDecrypted;
            try {
                aesKeyDecrypted = await decryptWithPrivateKey(aesKeyEncrypted);
            } catch (rsaError) {
                if (rsaError.message.includes('padding') || rsaError.message.includes('Private key bulunamadı')) {
                    setDecryptedMessages(prev => ({
                        ...prev,
                        [message.messageId]: '🔒 Eski mesaj (anahtar uyumsuz)',
                    }));
                    return;
                }
                throw rsaError;
            }
            
            const aesKey = base64ToUint8Array(aesKeyDecrypted);
            const decrypted = decryptMessage(message.encryptedMessage, message.iv, aesKey);
            
            setDecryptedMessages(prev => ({
                ...prev,
                [message.messageId]: decrypted,
            }));
        } catch (error) {
            setDecryptedMessages(prev => ({
                ...prev,
                [message.messageId]: '❌ Mesaj çözülemedi',
            }));
        }
    };

    const handleSendMessage = async (text) => {
        try {
            if (!text.trim()) return;
            if (!connected) return;

            await updateLastActivity();

            if (!receiverPublicKey) {
                alert('Alıcının public key\'i bulunamadı. Lütfen kullanıcı listesini yenileyin.');
                return;
            }

            const aesKey = await generateAESKey();
            const aesKeyBase64 = uint8ArrayToBase64(aesKey);
            const { cipherText, iv } = await encryptMessage(text, aesKey);
            const encryptedAESKey = encryptWithPublicKey(aesKeyBase64, receiverPublicKey);

            const result = sendEncryptedMessage({
                senderId: userId,
                receiverId,
                encryptedMessage: cipherText,
                encryptedAESKey,
                iv,
            });

            if (result.success) {
                // Görselleştirme için debug log gönder
                emitDebugLog({
                    messageId: result.messageId,
                    plainText: text,
                    aesKey: aesKeyBase64,
                    encryptedAESKey: encryptedAESKey,
                    iv: iv,
                    timestamp: result.timestamp
                });

                const myMessage = {
                    messageId: result.messageId,
                    senderId: userId,
                    receiverId,
                    encryptedMessage: cipherText,
                    encryptedAESKey,
                    iv,
                    timestamp: result.timestamp,
                    status: result.status,
                };

                setMessages(prev => [...prev, myMessage]);
                setDecryptedMessages(prev => ({
                    ...prev,
                    [myMessage.messageId]: text,
                }));
            }
        } catch (error) {
            alert('Mesaj gönderilemedi: ' + error.message);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>
                        {userName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
                <View>
                    <Text style={styles.headerTitle}>{userName || 'Bilinmeyen'}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, onlineUsers.some(u => u.userId === receiverId) ? styles.dotOnline : styles.dotOffline]} />
                        <Text style={styles.headerStatus}>
                            {onlineUsers.some(u => u.userId === receiverId) ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.headerButton}>
                <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}
            
            <KeyboardAvoidingView 
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    contentContainerStyle={styles.messageList}
                    keyExtractor={(item) => item.messageId}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            decryptedText={decryptedMessages[item.messageId]}
                            isMine={item.senderId === userId}
                        />
                    )}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="lock-outline" size={48} color={COLORS.surfaceLight} />
                            <Text style={styles.emptyText}>Bu sohbet uçtan uca şifrelidir.</Text>
                            <Text style={styles.emptySubtext}>Mesajlarınız sadece sizin ve alıcının cihazında çözülebilir.</Text>
                        </View>
                    }
                />

                <ChatInput onSend={handleSendMessage} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.small,
    },
    headerButton: {
        padding: SPACING.sm,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: SPACING.xs,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    headerAvatarText: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    dotOnline: {
        backgroundColor: COLORS.success,
    },
    dotOffline: {
        backgroundColor: COLORS.textMuted,
    },
    headerStatus: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    messageList: {
        paddingVertical: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 150,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.xs,
        lineHeight: 18,
    },
});
