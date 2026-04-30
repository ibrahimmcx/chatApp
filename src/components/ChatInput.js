import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function ChatInput({ onSend }) {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Mesaj yaz..."
                    placeholderTextColor={COLORS.textMuted}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={1000}
                />
            </View>
            <TouchableOpacity 
                style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
                onPress={handleSend}
                disabled={!text.trim()}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons 
                    name={text.trim() ? "send" : "send-outline"} 
                    size={22} 
                    color={text.trim() ? COLORS.background : COLORS.textMuted} 
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        paddingBottom: Platform.OS === 'ios' ? 20 : SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'flex-end',
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: Platform.OS === 'ios' ? 10 : 2,
        marginRight: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    input: {
        fontSize: 16,
        color: COLORS.text,
        maxHeight: 120,
    },
    sendButton: {
        width: 44,
        height: 44,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.round,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        marginBottom: 2,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.surfaceLight,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
});
