// src/types/index.ts

export interface Mushaf {
  id: number;
  name: string;
  code: 'qpc_v1' | 'qpc_v2' | 'indopak_15' | 'digitalkhatt' | 'warsh';
  description: string;
  pages_count: 604 | 610; // 604 pour Madani, 610 pour Indopak
  lines_per_page: 15;
  size_mb: number;
  narration: 'Hafs' | 'Warsh';
  features: string[];
  download_urls: {
    fonts_zip: string;      // ZIP avec 604 polices .ttf
    database_sqlite: string; // SQLite avec métadonnées exactes
    common_fonts_zip: string; // Polices communes (Bismillah, Surah names)
  };
  preview_images: string[];
  checksum_sha256: string;
  is_installed: boolean;
  installed_at?: string;
  local_path?: string;
}

export interface Word {
  id: number;
  location: string; // "1:1:1" (surah:ayah:word)
  verse_key: string; // "1:1" (surah:ayah)
  text_uthmani: string; // Texte arabe Unicode
  text_simple: string; // Texte simplifié (sans diacritiques)
  qpc_v1?: string; // Code de glyphe pour QPC V1
  qpc_v2?: string; // Code de glyphe pour QPC V2
  indopak_nastaleeq_15?: string;
  page_number: number; // 1-604
  line_number: number; // 1-15
  char_type: 'word' | 'end'; // 'end' pour fin de verset
}

export interface PageLine {
  id: number;
  mushaf_id: number;
  page_number: number; // 1-604
  line_number: number; // 1-15 (sauf pages 1-2: 8 lignes)
  line_type: 'surah_name' | 'basmallah' | 'ayah';
  is_centered: boolean; // true pour surah_name et basmallah
  first_word_id: number | null;
  last_word_id: number | null;
  surah_number: number | null;
  surah_name_arabic?: string;
  words?: Word[]; // Populated at runtime
}

export interface Surah {
  id: number; // 1-114
  name_arabic: string;
  name_transliteration: string;
  name_translation: string;
  revelation_place: 'Makkah' | 'Madinah';
  verses_count: number;
  first_page: number;
  last_page: number;
}

export interface Bookmark {
  id: number;
  mushaf_id: number;
  page_number: number;
  line_number?: number;
  note?: string;
  created_at: string;
}

export interface ReadingSession {
  id: number;
  mushaf_id: number;
  page_number: number;
  duration_seconds: number;
  timestamp: string;
}

export interface DownloadProgress {
  mushaf_id: number;
  status: 'initializing' | 'downloading' | 'extracting' | 'verifying' | 'completed' | 'failed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  downloaded_bytes: number;
  total_bytes: number;
  speed_mbps: number;
  eta_seconds: number;
  current_step: string;
  error?: string;
}
