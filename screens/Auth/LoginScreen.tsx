import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthLayout } from '@/components/AuthLayout';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Giriş başarısız', error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Giriş Yap" subtitle="Hesabına giriş yaparak devam et">
      <AppInput
        label="E-posta"
        placeholder="ornek@mail.com"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />
      <AppInput
        label="Şifre"
        placeholder="••••••••"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <AppButton label="Giriş Yap" loading={loading} onPress={onLogin} />

      <Text style={styles.footer}>
        Hesabın yok mu?{' '}
        <Link href="/(auth)/register" style={styles.link}>
          Kayıt ol
        </Link>
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
