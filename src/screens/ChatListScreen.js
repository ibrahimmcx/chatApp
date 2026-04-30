import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    StyleSheet, 
    RefreshControl,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserList, logoutUser } from '../services/authService';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function ChatListScreen({ route, navigation, onLogout }) {
    const { userId, userName } = route.params || {};
    const [users, setUsers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (userId) {
            connectSocket(userId);
            loadUsers();
            
            const interval = setInterval(loadUsers, 5000);
            return () => {
                disconnectSocket();
                clearInterval(interval);
            };
        }
    }, [userId]);

    const loadUsers = async () => {
        if (!userId) return;
        const userList = await getUserList(userId);
        setUsers(userList);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await logoutUser();
        disconnectSocket();
        if (onLogout) {
            onLogout();
        }
    };

    const openChat = (user) => {
        navigation.navigate('Chat', {
            userId,
            receiverId: user.userId,
            userName: user.displayName,
            receiverPublicKey: user.publicKey,
            currentUserName: userName,
        });
    };

    const onlineUsers = users.filter(u => u.isOnline);
    const offlineUsers = users.filter(u => !u.isOnline);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.profileSection}>
                <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                        {userName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                    <View style={styles.activeBadge} />
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.welcomeText}>Merhaba,</Text>
                    <Text style={styles.userName}>{userName || 'Kullanıcı'}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <MaterialCommunityIcons name="logout-variant" size={24} color={COLORS.error} />
            </TouchableOpacity>
        </View>
    );

    const renderUserItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.userItem}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemAvatarContainer}>
                <View style={[styles.avatar, !item.isOnline && styles.avatarOffline]}>
                    <Text style={styles.avatarText}>
                        {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                {item.isOnline && <View style={styles.onlineDot} />}
            </View>
            
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.displayName}</Text>
                <Text style={styles.itemEmail}>{item.email}</Text>
            </View>
            
            <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={COLORS.divider} 
            />
        </TouchableOpacity>
    );

    const sections = [
        { title: `Çevrimiçi (${onlineUsers.length})`, data: onlineUsers, id: 'online' },
        { title: `Çevrimdışı (${offlineUsers.length})`, data: offlineUsers, id: 'offline' }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}
            
            <FlatList
                contentContainerStyle={styles.listContent}
                data={users}
                keyExtractor={(item) => item.userId}
                renderItem={renderUserItem}
                ListHeaderComponent={() => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sohbetler</Text>
                    </View>
                )}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="account-search-outline" size={80} color={COLORS.surfaceLight} />
                        <Text style={styles.emptyText}>Henüz kullanıcı yok</Text>
                        <Text style={styles.emptySubtext}>Yeni kullanıcılar kayıt olduğunda burada görünecek</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.background,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    userAvatarText: {
        color: COLORS.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    activeBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.success,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    userInfo: {
        marginLeft: SPACING.md,
    },
    welcomeText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    sectionHeader: {
        marginVertical: SPACING.md,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    itemAvatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarOffline: {
        backgroundColor: COLORS.surfaceLight,
    },
    avatarText: {
        color: COLORS.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    onlineDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.success,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    itemInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    itemEmail: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.xs,
        paddingHorizontal: 40,
    },
});
