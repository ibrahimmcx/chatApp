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
import { registerUser } from '../services/authService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export default function RegisterScreen({ navigation, onRegisterSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    const checkPasswordStrength = (pass) => {
        let strength = 0;
        if (pass.length >= 8) strength++;
        if (/[a-z]/.test(pass)) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^a-zA-Z0-9]/.test(pass)) strength++;
        setPasswordStrength(strength);
    };

    const handlePasswordChange = (text) => {
        setPassword(text);
        checkPasswordStrength(text);
    };

    const handleRegister = async () => {
        if (!email || !password || !displayName) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Hata', 'Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
            return;
        }

        setLoading(true);
        const result = await registerUser(email, password, displayName);
        setLoading(false);

        if (result.success) {
            onRegisterSuccess(result.userId, result.displayName);
        } else {
            Alert.alert('Kayıt Başarısız', result.message);
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 1) return COLORS.error;
        if (passwordStrength <= 3) return COLORS.warning;
        return COLORS.success;
    };

    const getStrengthText = () => {
        if (passwordStrength <= 1) return 'Zayıf';
        if (passwordStrength <= 3) return 'Orta';
        return 'Güçlü';
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <MaterialCommunityIcons name="account-plus" size={50} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Hesap Oluştur</Text>
                    <Text style={styles.subtitle}>Güvenli mesajlaşmaya başlayın</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Görünen Ad</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Adınız Soyadınız"
                                placeholderTextColor={COLORS.textMuted}
                                value={displayName}
                                onChangeText={setDisplayName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>E-posta</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="E-posta adresiniz"
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
                                placeholder="Güçlü bir şifre seçin"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={handlePasswordChange}
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

                    {password.length > 0 && (
                        <View style={styles.strengthContainer}>
                            <View style={styles.strengthBar}>
                                <View 
                                    style={[
                                        styles.strengthFill, 
                                        { width: `${(passwordStrength / 5) * 100}%`, backgroundColor: getStrengthColor() }
                                    ]} 
                                />
                            </View>
                            <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                                {getStrengthText()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Şifre Tekrar</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="lock-check-outline" size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifrenizi doğrulayın"
                                placeholderTextColor={COLORS.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>
                    </View>

                    {loading && (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="small" color={COLORS.primary} style={{marginRight: 10}} />
                            <Text style={styles.loadingText}>RSA-2048 anahtar çifti üretiliyor...</Text>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <Text style={styles.buttonText}>Hesap Oluştur</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.linkContainer}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.linkText}>
                            Zaten hesabınız var mı? <Text style={styles.linkBold}>Giriş Yap</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <View style={styles.infoTitleRow}>
                        <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.infoTitle}>Güvenlik Bilgisi</Text>
                    </View>
                    <Text style={styles.infoText}>• Şifreniz sunucuya asla açık metin olarak gönderilmez.</Text>
                    <Text style={styles.infoText}>• Cihazınızda size özel şifreleme anahtarları üretilir.</Text>
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
        padding: SPACING.lg,
        paddingTop: 60,
    },
    backButton: {
        marginBottom: SPACING.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
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
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: -SPACING.xs,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        backgroundColor: COLORS.divider,
        borderRadius: 2,
        marginRight: 10,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        padding: 12,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 255, 0.2)',
    },
    loadingText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '500',
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
    infoBox: {
        marginTop: SPACING.xl,
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoTitle: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
});
