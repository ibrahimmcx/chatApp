import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function MessageBubble({ message, decryptedText, isMine }) {
    return (
        <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
            <View style={[
                styles.bubble, 
                isMine ? styles.bubbleMine : styles.bubbleTheirs,
                isMine ? styles.mineRadius : styles.theirsRadius
            ]}>
                <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
                    {decryptedText || '🔒 Şifreleniyor...'}
                </Text>
                <View style={styles.footer}>
                    <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
                        {new Date(message.timestamp).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
    },
    mine: {
        alignItems: 'flex-end',
    },
    theirs: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '85%',
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    mineRadius: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        borderBottomLeftRadius: BORDER_RADIUS.lg,
        borderBottomRightRadius: 4,
    },
    theirsRadius: {
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
        borderBottomRightRadius: BORDER_RADIUS.lg,
        borderBottomLeftRadius: 4,
    },
    bubbleMine: {
        backgroundColor: COLORS.primary,
    },
    bubbleTheirs: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    text: {
        fontSize: 16,
        lineHeight: 22,
    },
    textMine: {
        color: COLORS.background,
        fontWeight: '500',
    },
    textTheirs: {
        color: COLORS.text,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    time: {
        fontSize: 10,
        fontWeight: '600',
    },
    timeMine: {
        color: 'rgba(10, 15, 30, 0.5)',
    },
    timeTheirs: {
        color: COLORS.textSecondary,
    },
});
