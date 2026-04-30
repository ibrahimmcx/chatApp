import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loginUser } from '../services/authService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
            return;
        }

        setLoading(true);
        const result = await loginUser(email, password);
        setLoading(false);

        if (result.success) {
            onLoginSuccess(result.userId, result.displayName);
        } else {
            Alert.alert('Giriş Başarısız', result.message);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <MaterialCommunityIcons name="shield-lock" size={64} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>SecureChat</Text>
                    <Text style={styles.subtitle}>Uçtan Uca Şifreli Güvenli İletişim</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>E-posta</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email adresiniz"
                                placeholderTextColor={COLORS.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Şifre</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifreniz"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <MaterialCommunityIcons 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color={COLORS.textSecondary} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.buttonText}>Giriş Yap</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.linkText}>
                            Hesabınız yok mu? <Text style={styles.linkBold}>Kayıt Ol</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <View style={styles.securityBadge}>
                        <MaterialCommunityIcons name="shield-check" size={16} color={COLORS.success} />
                        <Text style={styles.securityText}>AES-256 | RSA-2048 | E2EE</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    form: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputWrapper: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: SPACING.sm,
        fontSize: 16,
        color: COLORS.text,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        marginTop: SPACING.md,
        ...SHADOWS.small,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    linkContainer: {
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    linkText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    linkBold: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: BORDER_RADIUS.round,
    },
    securityText: {
        color: COLORS.success,
        fontSize: 11,
        marginLeft: 6,
        fontWeight: '600',
    },
});
