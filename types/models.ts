export type Profile = {
  id: string;
  full_name: string | null;
  created_at?: string;
};

export type MealTiming =
  | 'farketmez'
  | 'yemekten_once'
  | 'yemekten_sonra'
  | 'tok_karna'
  | 'ac_karna';

export type DurationType = 'days' | 'end_date' | 'unlimited';

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dose: string;
  reminder_time: string;
  frequency?: string;
  reminder_times?: string[];
  meal_timing?: MealTiming;
  duration_type?: DurationType;
  duration_days?: number | null;
  end_date?: string | null;
  start_date?: string | null;
  created_at?: string;
};

export type MedicationInsert = Omit<Medication, 'id' | 'created_at'>;

export type MedicationIntakeLog = {
  id: string;
  user_id: string;
  medication_id: string;
  intake_date: string;
  reminder_time: string;
  taken: boolean;
  taken_at?: string | null;
  created_at?: string;
};

export type TodayDose = {
  medicationId: string;
  medicationName: string;
  dose: string;
  reminderTime: string;
  taken: boolean;
  logId?: string;
};

export type AdherenceStats = {
  monthlyPercent: number;
  streak: number;
  takenThisMonth: number;
  expectedThisMonth: number;
};

export type FamilyConnection = {
  id: string;
  owner_id: string;
  member_email: string;
  member_name: string | null;
  status: 'pending' | 'accepted';
  created_at?: string;
};

export type FamilyConnectionInsert = Omit<FamilyConnection, 'id' | 'created_at'>;

export type Caregiver = {
  id: string;
  patient_id: string;
  caregiver_email: string;
  token: string;
  accepted_at?: string | null;
  created_at?: string;
};

export type CaregiverInsert = Pick<Caregiver, 'patient_id' | 'caregiver_email' | 'token'>;

export type MedicineInfo = {
  ilac_adi: string;
  etken_madde: string;
  ne_icin: string;
  yan_etkiler: string[];
  birlikte_alinmaz: string[];
  kullanim: string;
  alkol_uyarisi: boolean;
  gebelik_uyarisi: string;
  max_doz: string;
};

export type MedicineScan = {
  id: string;
  user_id: string;
  ilac_adi: string;
  etken_madde: string | null;
  scan_data: MedicineInfo;
  created_at?: string;
};

export type MedicineScanInsert = Omit<MedicineScan, 'id' | 'created_at'>;
