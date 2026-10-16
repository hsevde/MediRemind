import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthLayout } from '@/components/AuthLayout';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    try {
      setLoading(true);
      await signUp(email.trim(), password, fullName.trim() || undefined);
      Alert.alert('Kayıt başarılı', 'Hesabın oluşturuldu. Şimdi giriş yapabilirsin.');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Kayıt başarısız', error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Kayıt Ol" subtitle="MediRemind ailesine katıl">
      <AppInput label="Ad Soyad" placeholder="Ad Soyad" value={fullName} onChangeText={setFullName} />
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
        placeholder="En az 6 karakter"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <AppButton label="Kayıt Ol" loading={loading} onPress={onRegister} />

      <Text style={styles.footer}>
        Hesabın var mı?{' '}
        <Link href="/(auth)/login" style={styles.link}>
          Giriş yap
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
