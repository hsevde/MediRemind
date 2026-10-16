import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/hooks/useAuth';
import { aiService } from '@/services/aiService';
import { buildScanInsert, listMyMedicineScans, saveMedicineScan } from '@/services/scanService';
import { MedicineInfo, MedicineScan } from '@/types/models';

type InfoCardProps = {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'warning' | 'danger';
};

function InfoCard({ title, children, variant = 'default' }: InfoCardProps) {
  const variantStyle =
    variant === 'danger'
      ? styles.cardDanger
      : variant === 'warning'
        ? styles.cardWarning
        : styles.cardDefault;

  const titleStyle =
    variant === 'danger'
      ? styles.cardTitleDanger
      : variant === 'warning'
        ? styles.cardTitleWarning
        : styles.cardTitleDefault;

  return (
    <View style={[styles.card, variantStyle]}>
      <Text style={[styles.cardTitle, titleStyle]}>{title}</Text>
      {children}
    </View>
  );
}

function formatMedicineInfoForChat(info: MedicineInfo): string {
  return [
    `💊 ${info.ilac_adi}`,
    `Etken madde: ${info.etken_madde}`,
    `Ne için: ${info.ne_icin}`,
    `Kullanım: ${info.kullanim}`,
    `Max doz: ${info.max_doz}`,
    `Yan etkiler: ${info.yan_etkiler.join(', ')}`,
    `Birlikte alınmaz: ${info.birlikte_alinmaz.join(', ')}`,
    info.alkol_uyarisi ? '⚠️ Alkol uyarısı var' : '',
    `Gebelik: ${info.gebelik_uyarisi}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export { formatMedicineInfoForChat };

export function MedicineInfoScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [medicineInfo, setMedicineInfo] = useState<MedicineInfo | null>(null);
  const [recentScans, setRecentScans] = useState<MedicineScan[]>([]);

  const loadRecentScans = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const scans = await listMyMedicineScans(session.user.id, 5);
      setRecentScans(scans);
    } catch {
      setRecentScans([]);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadRecentScans();
    }, [loadRecentScans])
  );

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Kamera izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) {
      return;
    }

    const asset = result.assets[0];
    setPreviewUri(asset.uri);
    setMedicineInfo(null);
    setLoading(true);

    try {
      const info = await aiService.identifyMedicineBox(asset.base64!, asset.mimeType ?? 'image/jpeg');
      if (info) {
        setMedicineInfo(info);
        if (session?.user.id) {
          try {
            await saveMedicineScan(buildScanInsert(session.user.id, info));
            await loadRecentScans();
          } catch {
            // Tarama sonucu gösterilir; kayıt hatası kullanıcıyı engellemez.
          }
        }
      } else {
        Alert.alert('Tanınmadı', 'İlaç kutusu tanımlanamadı. Lütfen daha net bir fotoğraf çekin.');
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf analiz edilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>İlaç Kutusu Tanıma</Text>
          <Text style={styles.subheading}>
            Kamerayla ilaç kutusunun fotoğrafını çekin; AI detaylı bilgi kartları oluştursun.
          </Text>

          {previewUri && (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
            </View>
          )}

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#5C4ECC" />
              <Text style={styles.loadingText}>İlaç kutusu analiz ediliyor...</Text>
            </View>
          )}

          {medicineInfo && !loading && (
          <View style={styles.results}>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>İlaç Adı</Text>
              <Text style={styles.heroTitle}>{medicineInfo.ilac_adi}</Text>
              <Text style={styles.heroSubtitle}>{medicineInfo.etken_madde}</Text>
            </View>

            <InfoCard title="Ne İçin Kullanılır?">
              <Text style={styles.cardBody}>{medicineInfo.ne_icin}</Text>
            </InfoCard>

            <InfoCard title="Kullanım">
              <Text style={styles.cardBody}>{medicineInfo.kullanim}</Text>
            </InfoCard>

            <InfoCard title="Maksimum Doz">
              <Text style={styles.cardBody}>{medicineInfo.max_doz}</Text>
            </InfoCard>

            <InfoCard title="Yan Etkiler" variant="warning">
              {medicineInfo.yan_etkiler.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletWarning}>•</Text>
                  <Text style={styles.listTextWarning}>{item}</Text>
                </View>
              ))}
            </InfoCard>

            <InfoCard title="Birlikte Alınmaz" variant="danger">
              {medicineInfo.birlikte_alinmaz.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletDanger}>•</Text>
                  <Text style={styles.listTextDanger}>{item}</Text>
                </View>
              ))}
            </InfoCard>

            {medicineInfo.alkol_uyarisi && (
              <InfoCard title="Alkol Uyarısı" variant="danger">
                <Text style={styles.cardBodyDanger}>
                  Bu ilaç alkol ile birlikte kullanılmamalıdır.
                </Text>
              </InfoCard>
            )}

            <InfoCard title="Gebelik">
              <Text style={styles.cardBody}>{medicineInfo.gebelik_uyarisi}</Text>
            </InfoCard>

            <Text style={styles.disclaimer}>
              Bu bilgiler yalnızca bilgilendirme amaçlıdır. Kesin bilgi için eczacınıza veya
              doktorunuza danışın.
            </Text>
          </View>
        )}

        {!medicineInfo && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
            <Text style={styles.emptyText}>Aşağıdaki kamera butonuna basarak başlayın.</Text>
          </View>
        )}

        {recentScans.length > 0 && !medicineInfo && !loading && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Son Taramalar</Text>
            {recentScans.map((scan) => (
              <Pressable
                key={scan.id}
                style={styles.historyCard}
                onPress={() => setMedicineInfo(scan.scan_data)}
              >
                <Text style={styles.historyName}>{scan.ilac_adi}</Text>
                <Text style={styles.historyMeta}>{scan.etken_madde ?? 'Etken madde bilinmiyor'}</Text>
              </Pressable>
            ))}
          </View>
        )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.cameraButton, loading && styles.cameraButtonDisabled]}
          onPress={takePhoto}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.cameraButtonIcon}>📷</Text>
          <Text style={styles.cameraButtonText}>{loading ? 'Analiz ediliyor...' : 'Fotoğraf Çek'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subheading: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 4,
  },
  previewWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
  results: {
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#5C4ECC',
    borderRadius: 16,
    padding: 20,
  },
  heroLabel: {
    color: '#ddd6fe',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  heroSubtitle: {
    color: '#ede9fe',
    fontSize: 16,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardDefault: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
  },
  cardWarning: {
    backgroundColor: '#fefce8',
    borderColor: '#facc15',
  },
  cardDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardTitleDefault: {
    color: '#374151',
  },
  cardTitleWarning: {
    color: '#a16207',
  },
  cardTitleDanger: {
    color: '#b91c1c',
  },
  cardBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  cardBodyDanger: {
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletWarning: {
    color: '#ca8a04',
    fontSize: 16,
    marginRight: 8,
    lineHeight: 22,
  },
  listTextWarning: {
    flex: 1,
    fontSize: 15,
    color: '#854d0e',
    lineHeight: 22,
  },
  bulletDanger: {
    color: '#dc2626',
    fontSize: 16,
    marginRight: 8,
    lineHeight: 22,
  },
  listTextDanger: {
    flex: 1,
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  historySection: {
    gap: 8,
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#5C4ECC',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#5C4ECC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraButtonDisabled: {
    opacity: 0.7,
  },
  cameraButtonIcon: {
    fontSize: 22,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
