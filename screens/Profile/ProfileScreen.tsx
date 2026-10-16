import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getAdherenceStats } from '@/services/adherenceService';
import { aiService } from '@/services/aiService';
import { addCaregiver, getPanelLink, listCaregivers, removeCaregiver } from '@/services/caregiverService';
import { getMyProfile, upsertMyProfile } from '@/services/profileService';
import { AdherenceStats, Caregiver } from '@/types/models';

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkModalUrl, setLinkModalUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [aiKeyStatus, setAiKeyStatus] = useState(aiService.getKeyPoolStatus());

  const loadProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      const [profile, adherence, caregiverList] = await Promise.all([
        getMyProfile(userId),
        getAdherenceStats(userId),
        listCaregivers(userId),
      ]);
      if (profile?.full_name) setFullName(profile.full_name);
      setStats(adherence);
      setCaregivers(caregiverList);
    } catch {
      setStats(null);
      setCaregivers([]);
    }
  }, [session?.user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      setAiKeyStatus(aiService.getKeyPoolStatus());
    }, [loadProfile])
  );

  const onSave = async () => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      setLoading(true);
      await upsertMyProfile({ id: userId, full_name: fullName.trim() || null });
      Alert.alert('Başarılı', 'Profil bilgileri güncellendi.');
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const showLinkModal = (url: string) => {
    setLinkModalUrl(url);
    setLinkCopied(false);
    setLinkModalVisible(true);
  };

  const onCopyLinkToClipboard = async () => {
    if (!linkModalUrl) return;
    await Clipboard.setStringAsync(linkModalUrl);
    setLinkCopied(true);
    Alert.alert('Kopyalandı', 'Panel linki panoya kopyalandı.');
  };

  const onOpenLinkInBrowser = async () => {
    if (!linkModalUrl) return;
    const canOpen = await Linking.canOpenURL(linkModalUrl);
    if (!canOpen) {
      Alert.alert('Açılamadı', 'Linki kopyalayıp bilgisayar tarayıcısında aç.');
      return;
    }
    await Linking.openURL(linkModalUrl);
  };

  const onShareLink = async () => {
    if (!linkModalUrl) return;
    try {
      await Share.share({ message: linkModalUrl, title: 'MediRemind Panel' });
    } catch {
      await onCopyLinkToClipboard();
    }
  };

  const onAddCaregiver = async () => {
    const userId = session?.user.id;
    if (!userId || !familyEmail.trim()) {
      Alert.alert('Eksik bilgi', 'Aile üyesinin e-posta adresini gir.');
      return;
    }

    try {
      setFamilyLoading(true);
      const result = await addCaregiver(userId, familyEmail, fullName || 'Hasta');
      setFamilyEmail('');
      setFamilyModalVisible(false);
      await loadProfile();
      showLinkModal(result.panelUrl);

      if (!result.emailSkipped) {
        Alert.alert('Başarılı', 'Davet e-postası da gönderildi.');
      }
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Eklenemedi.');
    } finally {
      setFamilyLoading(false);
    }
  };

  const onRemoveCaregiver = (id: string) => {
    Alert.alert('Onay', 'Bu aile üyesini kaldırmak istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCaregiver(id);
            await loadProfile();
          } catch {
            Alert.alert('Hata', 'Bağlantı kaldırılamadı.');
          }
        },
      },
    ]);
  };

  const onShowCaregiverLink = (token: string) => {
    showLinkModal(getPanelLink(token));
  };

  return (
    <ScreenContainer>
      <KeyboardScreen contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.skaCard}>
          <Text style={styles.skaBadge}>🌍 BM SKA 3</Text>
          <Text style={styles.skaTitle}>Sağlık ve Kaliteli Yaşam</Text>
          <Text style={styles.skaDesc}>
            MediRemind, ilaç uyumunu artırarak tedavi başarısını yükseltir ve sürdürülebilir sağlık
            hedeflerine katkı sağlar.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.monthlyPercent ?? 0}%</Text>
            <Text style={styles.statLabel}>Bu Ay Uyum</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {stats?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>Günlük Seri</Text>
          </View>
        </View>

        {stats && stats.expectedThisMonth > 0 && (
          <Text style={styles.statsDetail}>
            Bu ay {stats.takenThisMonth}/{stats.expectedThisMonth} doz alındı.
          </Text>
        )}

        <AppInput label="Ad Soyad" placeholder="Ad Soyad" value={fullName} onChangeText={setFullName} />
        <AppInput label="E-posta" value={session?.user.email ?? ''} editable={false} />
        <AppButton label="Kaydet" loading={loading} onPress={onSave} />

        <Text style={styles.sectionTitle}>Aile Takip Paneli</Text>
        <Text style={styles.sectionDesc}>
          Yakınlarına özel link gönder; web panelden ilaç durumunu read-only takip etsinler.
        </Text>

        <AppButton
          label="Aile Üyesi Davet Et"
          variant="secondary"
          onPress={() => setFamilyModalVisible(true)}
        />

        {caregivers.length > 0 && (
          <View style={styles.familyList}>
            {caregivers.map((cg) => (
              <View key={cg.id} style={styles.familyCard}>
                <View style={styles.familyInfo}>
                  <Text style={styles.familyName}>{cg.caregiver_email}</Text>
                  <Text style={[styles.familyStatus, cg.accepted_at ? styles.statusAccepted : styles.statusPending]}>
                    {cg.accepted_at ? 'Panel açıldı' : 'Davet gönderildi'}
                  </Text>
                </View>
                <Pressable onPress={() => onShowCaregiverLink(cg.token)} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Link</Text>
                </Pressable>
                <Pressable onPress={() => onRemoveCaregiver(cg.id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Kaldır</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Modal visible={familyModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Aile Üyesi Davet Et</Text>
                <Text style={styles.modalDesc}>
                  Aile üyesinin e-posta adresini gir; panel davet linkini paylaşabilirsin.
                </Text>
                <AppInput
                  label="E-posta"
                  placeholder="aile@ornek.com"
                  value={familyEmail}
                  onChangeText={setFamilyEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <AppButton
                  label="Aile Üyesi Davet Et"
                  loading={familyLoading}
                  onPress={onAddCaregiver}
                />
                <AppButton
                  label="İptal"
                  variant="secondary"
                  onPress={() => setFamilyModalVisible(false)}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={linkModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Panel Linki</Text>
              <Text style={styles.modalDesc}>
                Bu linki aile üyenle paylaş. Panelden ilaç durumunu read-only görebilir.
              </Text>
              {linkModalUrl.includes('localhost') && (
                <Text style={styles.localhostWarning}>
                  Telefonda localhost çalışmaz. Bilgisayarda mediremind-web çalışırken linki PC
                  tarayıcısında aç veya .env içinde EXPO_PUBLIC_PANEL_URL değerini bilgisayar IP
                  adresinle güncelle.
                </Text>
              )}
              <Text selectable style={styles.linkBox}>
                {linkModalUrl}
              </Text>
              <AppButton
                label={linkCopied ? 'Kopyalandı ✓' : 'Linki Kopyala'}
                onPress={onCopyLinkToClipboard}
              />
              <AppButton label="Tarayıcıda Aç" variant="secondary" onPress={onOpenLinkInBrowser} />
              <AppButton label="Paylaş" variant="secondary" onPress={onShareLink} />
              <AppButton label="Kapat" variant="secondary" onPress={() => setLinkModalVisible(false)} />
            </View>
          </View>
        </Modal>

        <View style={styles.logoutSection}>
          <Text style={styles.aiStatusText}>
            AI yedek anahtar: {aiKeyStatus.activeKeyNumber}/{aiKeyStatus.totalKeys}
            {aiKeyStatus.exhaustedKeys > 0
              ? ` · ${aiKeyStatus.exhaustedKeys} anahtar kotası doldu (otomatik geçiş yapıldı)`
              : ''}
          </Text>
          <AppButton label="Çıkış Yap" variant="secondary" onPress={() => signOut()} />
        </View>
      </KeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    color: Colors.text,
  },
  skaCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    marginBottom: 4,
  },
  skaBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  skaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  skaDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5C4ECC',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  statsDetail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  familyList: {
    gap: 10,
    marginTop: 4,
  },
  familyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  familyEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  familyStatus: {
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  statusAccepted: {
    color: '#16a34a',
  },
  statusPending: {
    color: '#d97706',
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  removeText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  localhostWarning: {
    fontSize: 12,
    color: '#b45309',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  linkBox: {
    fontSize: 12,
    color: Colors.text,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  logoutSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  aiStatusText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
});
