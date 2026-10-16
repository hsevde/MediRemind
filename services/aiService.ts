import { GoogleGenerativeAI } from '@google/generative-ai';

import { MedicineInfo } from '@/types/models';

const rawApiKeys = [
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_4,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_5,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_6,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_7,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_8,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_9,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_10,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_11,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_12,
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_13,
].filter((key): key is string => Boolean(key && key.trim().length > 10));

const apiKeys = [...new Set(rawApiKeys)];

export type AiKeyPoolStatus = {
  totalKeys: number;
  activeKeyNumber: number;
  exhaustedKeys: number;
};

const exhaustedKeyIndexes = new Set<number>();

if (__DEV__) {
  if (apiKeys.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[AI] .env dosyasında EXPO_PUBLIC_GEMINI_API_KEY_* tanımlı değil.');
  } else if (rawApiKeys.length !== apiKeys.length) {
    // eslint-disable-next-line no-console
    console.log(`[AI] ${apiKeys.length} benzersiz anahtar (${rawApiKeys.length - apiKeys.length} yinelenen elendi).`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[AI] ${apiKeys.length} benzersiz Gemini anahtarı yüklendi.`);
  }
}

const MEDIBOT_BASE_PROMPT =
  "Sen MediRemind uygulamasının uzman eczacı asistanı Medibot'sun. İlaç etkileşimleri (ör. 'parol alkolle içilir mi'), yan etkiler, dozaj ve sağlıklı ilaç kullanımı hakkında Türkçe ve anlaşılır yanıtlar ver. Genel sohbet de edebilirsin ama odak noktan ilaç ve sağlık rehberliği. Asla teşhis koyma, ciddi durumlarda doktora yönlendir.";

function buildSystemInstruction(userContext?: string): string {
  const contextPart = userContext
    ? `\n\nKullanıcının güncel ilaç ve alım bilgisi:\n${userContext}`
    : '';
  return MEDIBOT_BASE_PROMPT + contextPart;
}

let currentKeyIndex = 0;

function getModel(systemInstruction?: string) {
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys found in environment variables.');
  }
  const genAI = new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
  const options: { model: string; systemInstruction?: string } = { model: 'gemini-2.5-flash' };
  if (systemInstruction) {
    options.systemInstruction = systemInstruction;
  }
  return genAI.getGenerativeModel(options);
}

function isTranscriptionGarbage(text: string): boolean {
  const lower = text.toLowerCase();
  const garbagePatterns = [
    'ses kaydını dinle',
    'ses kaydini dinle',
    'sessiz kalındıysa',
    'sessiz kalindiysa',
    'anlaşılmıyorsa',
    'anlasilmiyorsa',
    'metne dök',
    'metne dok',
    'başka bir şey ekleme',
    'baska bir sey ekleme',
    'duyduğun konuşmayı',
    'duydugun konusmayi',
    'eksiksiz metne',
    'yalnızca şu json',
    'yalnizca su json',
  ];
  return garbagePatterns.some((p) => lower.includes(p));
}

function cleanTranscription(text: string): string {
  return text
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTranscriptFromAiResponse(responseText: string): string | null {
  const trimmed = responseText.trim();
  if (!trimmed) return null;

  const startIndex = trimmed.indexOf('{');
  const endIndex = trimmed.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1) {
    try {
      const parsed = JSON.parse(trimmed.substring(startIndex, endIndex + 1)) as {
        transcript?: unknown;
      };
      if (typeof parsed.transcript === 'string') {
        const transcript = cleanTranscription(parsed.transcript);
        return transcript || null;
      }
    } catch {
      // JSON parse başarısız — düz metne düş
    }
  }

  const plain = cleanTranscription(trimmed);
  if (plain && isTranscriptionGarbage(plain)) return null;
  return plain || null;
}

function isQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate') ||
    lower.includes('limit') ||
    lower.includes('exhausted') ||
    lower.includes('resource_exhausted')
  );
}

// Wrapper to automatically handle rate limits and quota errors
async function withKeyRotation<T>(operation: (model: any) => Promise<T>): Promise<T> {
  let attempts = 0;
  const startIndex = currentKeyIndex;

  while (attempts < apiKeys.length) {
    try {
      const model = getModel();
      return await operation(model);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);

      if (isQuotaError(errorMessage)) {
        exhaustedKeyIndexes.add(currentKeyIndex);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        attempts++;

        if (currentKeyIndex === startIndex && attempts >= apiKeys.length) {
          break;
        }
        continue;
      }

      throw e;
    }
  }

  throw new Error('AI kotası şu an dolu. Birkaç dakika sonra tekrar dene.');
}

export const aiService = {
  getKeyPoolStatus(): AiKeyPoolStatus {
    return {
      totalKeys: apiKeys.length,
      activeKeyNumber: apiKeys.length > 0 ? currentKeyIndex + 1 : 0,
      exhaustedKeys: exhaustedKeyIndexes.size,
    };
  },

  /**
   * YENİ - ADIM 1: Sesi doğrudan metne çeviren bölüm
   */
  async transcribeAudioRaw(audioBase64: string, mimeType: string = 'audio/m4a'): Promise<string | null> {
    try {
      return await withKeyRotation(async (model) => {
        const prompt = `Ses kaydındaki konuşmayı Türkçe metne çevir.
Yanıtın yalnızca şu JSON formatında olsun, başka hiçbir metin yazma:
{"transcript":"duyduğun cümle"}
Kayıt sessiz veya anlaşılmazsa: {"transcript":""}`;

        const audioPart = {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType,
          },
        };

        const result = await model.generateContent([audioPart, prompt]);
        const transcript = parseTranscriptFromAiResponse(await result.response.text());

        if (!transcript || transcript === '...' || transcript.length < 2) {
          return null;
        }
        if (isTranscriptionGarbage(transcript)) {
          return null;
        }
        return transcript;
      });
    } catch {
      return null;
    }
  },

  /**
   * YENİ - ADIM 2: Metin haline gelmiş sesi alıp JSON formatına dönüştüren bölüm
   */
  async parseTextToMedicationJSON(text: string): Promise<{ ilac: string; frekans: string; zamanlar: string[] } | null> {
    try {
      return await withKeyRotation(async (model) => {
        const prompt = `Şu hasta cümlesini incele: "${text}"
Sen bir ilaç asistanısın. Kullanıcının hangi ilacı, hangi sıklıkla ve tahmini hangi saatlerde alacağını çıkar ve KESİNLİKLE sadece aşağıdaki JSON formatında dön. Başka metin ekleme.
Format: { "ilac": "İlaç Adı", "frekans": "3_kez", "zamanlar": ["08:00", "14:00", "20:00"] }`;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = responseText.substring(startIndex, endIndex + 1);
          return JSON.parse(jsonStr);
        }
        return null;
      });
    } catch {
      return null;
    }
  },

  /**
   * 1. Speech-to-Text & Parsing for Medication (Eski Tek Adımlı Versiyon - Korumak İçin Bırakıldı)
   */
  async parseAudioToMedication(audioBase64: string, mimeType: string = 'audio/mp4'): Promise<{ ilac: string; frekans: string; zamanlar: string[] } | null> {
    try {
      return await withKeyRotation(async (model) => {
        const prompt = `Şu ses kaydını dinle. Sen bir ilaç formunu dolduran asistanısın. 
Kullanıcının hangi ilacı, hangi sıklıkla ve tahmini hangi saatlerde alacağını çıkar ve KESİNLİKLE sadece aşağıdaki JSON formatında dön. Başka TEK BİR KELİME BİLE ekleme.
E�er sesi hiç anlayamazsan boş bir JSON dön.
Format: { "ilac": "İlaç Adı", "frekans": "3_kez", "zamanlar": ["08:00", "14:00", "20:00"] }`;

        const audioPart = {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType,
          },
        };

        const result = await model.generateContent([prompt, audioPart]);
        const response = await result.response;
        let text = response.text();
        
        // Sadece JSON kısmını ayıklama güvenlik kontrolü
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = text.substring(startIndex, endIndex + 1);
          return JSON.parse(jsonStr);
        }
        
        return null;
      });
    } catch {
      return null;
    }
  },

  /**
   * 1.5 Görüntüden İlaç Adı Çıkarma (Sadece İlaç Ekle Formu İçin)
   */
  async extractMedicationInfoFromImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<{ ilac: string; doz: string } | null> {
    try {
      return await withKeyRotation(async (model) => {
        const prompt = `Fotoğraftaki ilaç kutusunu incele. Sadece ilacın adını ve yazıyorsa dozunu (örneğin 500 mg, 100 ml vb.) KESİNLİKLE sadece şu JSON formatında dön. Başka tek kelime ekleme!
Format: { "ilac": "Parol", "doz": "500 mg" }`;

        const imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();
        
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = text.substring(startIndex, endIndex + 1);
          return JSON.parse(jsonStr);
        }
        return null;
      });
    } catch {
      return null;
    }
  },

  /**
   * 2. Vision - Pill Box Identification
   */
  async identifyMedicineBox(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    userNote?: string
  ): Promise<MedicineInfo | null> {
    try {
      return await withKeyRotation(async (model) => {
        const notePart = userNote?.trim()
          ? `\n\nKullanıcının ek sorusu veya notu: "${userNote.trim()}" — bunu da yanıtında dikkate al.`
          : '';
        const prompt = `Sen uzman bir eczacısın. Fotoğraftaki ilaç kutusunu incele ve KESİNLİKLE sadece aşağıdaki JSON formatında dön. Başka tek kelime bile ekleme.
Fotoğraf net değilse veya ilaç tanımlanamıyorsa alanları makul tahminlerle doldur ama yine de aynı JSON formatını kullan.${notePart}

Format:
{
  "ilac_adi": "Parol",
  "etken_madde": "Parasetamol",
  "ne_icin": "Ağrı kesici, ateş düşürücü",
  "yan_etkiler": ["Mide bulantısı", "Karaciğer hasarı (yüksek dozda)"],
  "birlikte_alinmaz": ["Alkol", "Warfarin", "Diğer parasetamol içeren ilaçlar"],
  "kullanim": "Aç veya tok karnına alınabilir",
  "alkol_uyarisi": true,
  "gebelik_uyarisi": "Doktora danışın",
  "max_doz": "Günde 4g (8 tablet)"
}`;

        const imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = await result.response.text();

        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = responseText.substring(startIndex, endIndex + 1);
          return JSON.parse(jsonStr) as MedicineInfo;
        }
        return null;
      });
    } catch {
      return null;
    }
  },

  /**
   * Ses/metin niyetini sınıflandır
   */
  classifyIntent(text: string): 'intake_query' | 'add_medication' | 'general' {
    const lower = text.toLowerCase();
    const intakePatterns = [
      'içtim mi',
      'aldım mı',
      'aldim mi',
      'içtim mi',
      'ictim mi',
      'bugün ilaç',
      'bugun ilac',
      'ilaçlarımı',
      'ilaclarimi',
      'hatırlatma',
      'kaldı mı',
      'kaldi mi',
    ];
    const addPatterns = ['ekle', 'kaydet', 'hatırlat', 'yeni ilaç', 'yeni ilac', 'kullanıyorum', 'kullaniyorum'];

    if (intakePatterns.some((p) => lower.includes(p))) return 'intake_query';
    if (addPatterns.some((p) => lower.includes(p)) && /\d|mg|saat|kez|parol|aspirin|ilaç|ilac/i.test(lower)) {
      return 'add_medication';
    }
    return 'general';
  },

  /**
   * 3. AI Health/Medication Assistant Chatbot
   */
  startChatSession(userContext?: string) {
    const systemInstruction = buildSystemInstruction(userContext);
    let sessionKeyIndex = currentKeyIndex;
    let sessionModel = getModel(systemInstruction);
    let currentHistory = [
      {
        role: 'user',
        parts: [{ text: 'Merhaba, sen kimsin?' }],
      },
      {
        role: 'model',
        parts: [
          {
            text: 'Merhaba! Ben MediRemind asistanınız Medibot. İlaç bilgileriniz, yan etkiler ve sağlıklı ilaç kullanımı konusunda size yardımcı olmak için buradayım. Size bugün nasıl yardımcı olabilirim?',
          },
        ],
      },
    ];

    let chatSession = sessionModel.startChat({
      history: currentHistory,
      generationConfig: { maxOutputTokens: 1000 },
    });

    return {
      async sendMessage(text: string) {
        return await withKeyRotation(async () => {
          if (sessionKeyIndex !== currentKeyIndex) {
            sessionKeyIndex = currentKeyIndex;
            sessionModel = getModel(systemInstruction);
            const historyObj = await chatSession.getHistory();

            chatSession = sessionModel.startChat({
              history: historyObj,
              generationConfig: { maxOutputTokens: 1000 },
            });
          }

          return chatSession.sendMessage(text);
        });
      },
    };
  },
};