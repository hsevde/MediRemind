import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { aiService } from '@/services/aiService';
import { buildTodayIntakeSummary, getTodayDoses } from '@/services/intakeService';
import { listMyMedications } from '@/services/medicationService';
import { formatMedicineInfoForChat } from '@/screens/Medication/MedicineInfoScreen';
import { getFrequencyLabel, getReminderTimes } from '@/utils/medicationUtils';

type PendingImage = {
  base64: string;
  mimeType: string;
  uri: string;
};

async function buildUserMedContext(userId: string): Promise<string> {
  const [medications, doses] = await Promise.all([
    listMyMedications(userId),
    getTodayDoses(userId),
  ]);

  const medList = medications
    .map(
      (m) =>
        `- ${m.name} (${m.dose}), ${getFrequencyLabel(m)}, saatler: ${getReminderTimes(m).join(', ')}`
    )
    .join('\n');

  const todaySummary = buildTodayIntakeSummary(doses);

  return `İlaç listesi:\n${medList || 'Boş'}\n\nBugünkü durum: ${todaySummary}`;
}

async function preparePlaybackAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    playThroughEarpieceAndroid: false,
    shouldDuckAndroid: false,
    staysActiveInBackground: false,
  });
}

async function speakResponse(text: string) {
  const spokenText = text.trim();
  if (!spokenText) return;

  Speech.stop();
  try {
    await preparePlaybackAudioMode();
  } catch {
    // Ses modu ayarlanamazsa yine de konuşmayı dene
  }

  Speech.speak(spokenText, {
    language: 'tr-TR',
    rate: 0.95,
    pitch: 1.0,
    volume: 1.0,
  });
}

export function MedibotScreen() {
  const { session } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: 'Merhaba! Ben Medibot. İlaç etkileşimleri, yan etkiler veya "bugün ilaçlarımı içtim mi?" gibi sorular sorabilirsin.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<ReturnType<typeof aiService.startChatSession> | null>(
    null
  );
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const initChat = useCallback(async () => {
    try {
      if (session?.user.id) {
        const context = await buildUserMedContext(session.user.id);
        setChatSession(aiService.startChatSession(context));
      } else {
        setChatSession(aiService.startChatSession());
      }
    } catch {
      setChatSession(aiService.startChatSession());
    }
  }, [session?.user.id]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  const appendModelMessage = (text: string, speak = false) => {
    setMessages((prev) => [...prev, { role: 'model', text }]);
    if (speak) speakResponse(text);
  };

  const sendTextMessage = async (text: string, speak = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let activeChat = chatSession;
    if (!activeChat) {
      try {
        if (session?.user.id) {
          const context = await buildUserMedContext(session.user.id);
          activeChat = aiService.startChatSession(context);
        } else {
          activeChat = aiService.startChatSession();
        }
        setChatSession(activeChat);
      } catch {
        appendModelMessage('MediBot hazırlanamadı. Uygulamayı yenileyip tekrar dene.');
        return;
      }
    }

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInputText('');
    setIsTyping(true);

    try {
      if (session?.user.id && aiService.classifyIntent(trimmed) === 'intake_query') {
        const doses = await getTodayDoses(session.user.id);
        const summary = buildTodayIntakeSummary(doses);
        setMessages((prev) => [...prev, { role: 'model', text: summary }]);
        if (speak) await speakResponse(summary);
      } else {
        const result = await activeChat.sendMessage(trimmed);
        const response = await result.response;
        const responseText = response.text();
        setMessages((prev) => [...prev, { role: 'model', text: responseText }]);
        if (speak) await speakResponse(responseText);
      }
    } catch (e: unknown) {
      const errMessage = e instanceof Error ? e.message : '';
      const errText = errMessage.includes('kotası')
        ? errMessage
        : 'Üzgünüm, şu an bağlantı kuramıyorum. İnternet veya AI kotasını kontrol et.';
      setMessages((prev) => [...prev, { role: 'model', text: errText }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendImageMessage = async (image: PendingImage, note: string) => {
    const userLabel = note.trim()
      ? `${note.trim()}\n📷 Fotoğraf eklendi`
      : '📷 Fotoğraf gönderildi';
    const userMsg = [...messages, { role: 'user' as const, text: userLabel }];
    setMessages(userMsg);
    setInputText('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const aiResponse = await aiService.identifyMedicineBox(
        image.base64,
        image.mimeType,
        note.trim() || undefined
      );
      const responseText = aiResponse
        ? formatMedicineInfoForChat(aiResponse)
        : 'İlaç kutusu tanımlanamadı, lütfen tekrar deneyin.';
      setMessages([...userMsg, { role: 'model', text: responseText }]);
    } catch {
      setMessages([...userMsg, { role: 'model', text: 'Fotoğrafı analiz ederken sorun oluştu.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (pendingImage) {
      await sendImageMessage(pendingImage, inputText);
      return;
    }
    await sendTextMessage(inputText);
  };

  const attachImage = (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Hata', 'Fotoğraf okunamadı.');
      return;
    }
    setPendingImage({
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
      uri: asset.uri,
    });
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Kamera izni gerekiyor!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      attachImage(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Galeri izni gerekiyor!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      attachImage(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Fotoğraf ekle', 'Kaynağı seç', [
      { text: 'Kamera', onPress: openCamera },
      { text: 'Galeri', onPress: openGallery },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
      }
    } catch {
      Alert.alert('Hata', 'Mikrofona erişilemedi.');
    }
  }

  async function stopRecording() {
    if (!recording || !session?.user.id) return;

    const activeRecording = recording;
    setRecording(null);

    await activeRecording.stopAndUnloadAsync();
    const uri = activeRecording.getURI();
    if (!uri) return;

    try {
      await preparePlaybackAudioMode();
    } catch {
      // Kayıt sonrası hoparlör moduna geçilemezse devam et
    }

    setIsTyping(true);

    try {
      let mimeType = 'audio/mp4';
      if (uri.endsWith('.m4a')) mimeType = 'audio/m4a';
      else if (uri.endsWith('.wav')) mimeType = 'audio/wav';

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const transcribedText = await aiService.transcribeAudioRaw(base64, mimeType);

      if (!transcribedText) {
        appendModelMessage('Sesi tam anlayamadım, lütfen tekrar dene.');
        return;
      }

      setIsTyping(false);
      await sendTextMessage(transcribedText, true);
    } catch {
      appendModelMessage('Sesin işlenemedi. Tekrar konuşmayı dener misin?');
    } finally {
      setIsTyping(false);
    }
  }

  const toggleRecording = async () => {
    if (recording) await stopRecording();
    else await startRecording();
  };

  const canSend = Boolean(inputText.trim() || pendingImage);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MediBot</Text>
          <Text style={styles.headerSub}>AI ilaç asistanın</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.modelBubble]}
            >
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.modelText]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {isTyping && <ActivityIndicator style={styles.typing} color="#5C4ECC" />}
        </ScrollView>

        {pendingImage && (
          <View style={styles.previewBar}>
            <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>Fotoğraf eklendi</Text>
              <Text style={styles.previewHint}>İstersen mesaj yaz, sonra Gönder'e bas</Text>
            </View>
            <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.previewRemove}>
              <Text style={styles.previewRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={showImageOptions}>
            <Text style={styles.actionButtonText}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, recording && styles.recordingButton]}
            onPress={toggleRecording}
          >
            <Text style={styles.actionButtonText}>🎤</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={pendingImage ? 'Fotoğrafa not ekle...' : "Medibot'a sor..."}
            placeholderTextColor="#9ca3af"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend || isTyping}
          >
            <Text style={styles.sendButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '85%' },
  userBubble: { backgroundColor: '#5C4ECC', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  modelBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: 'white' },
  modelText: { color: 'black' },
  typing: { alignSelf: 'flex-start', margin: 10 },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  previewImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  previewHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: 14,
    backgroundColor: 'white',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: { backgroundColor: '#5C4ECC', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: { backgroundColor: '#ef4444' },
  actionButtonText: { fontSize: 20 },
});
