// src/data/availableMushafs.ts

import { Mushaf } from '../types';

export const AVAILABLE_MUSHAFS: Mushaf[] = [
    {
        id: 1,
        name: 'KFGQPC V2 (1421H)',
        code: 'qpc_v2',
        description: 'King Fahd Glorious Quran Printing Complex - Calligraphie Uthman Taha - Version standard',
        pages_count: 604,
        lines_per_page: 15,
        size_mb: 185,
        narration: 'Hafs',
        features: ['juz_markers', 'hizb_markers', 'sajdah_markers'],
        download_urls: {
            fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/qpc_v2_fonts.zip',
            database_sqlite: 'https://cdn.qul.tarteel.ai/databases/qpc_v2_layout.db',
            common_fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/common_fonts.zip'
        },
        preview_images: [
            'https://cdn.qul.tarteel.ai/previews/qpc_v2_page_1.jpg',
            'https://cdn.qul.tarteel.ai/previews/qpc_v2_page_300.jpg'
        ],
        checksum_sha256: 'abc123def456...',
        is_installed: false
    },
    {
        id: 2,
        name: 'KFGQPC V1 (1405H)',
        code: 'qpc_v1',
        description: 'King Fahd Complex - Version classique 1405H',
        pages_count: 604,
        lines_per_page: 15,
        size_mb: 178,
        narration: 'Hafs',
        features: ['juz_markers', 'hizb_markers'],
        download_urls: {
            fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/qpc_v1_fonts.zip',
            database_sqlite: 'https://cdn.qul.tarteel.ai/databases/qpc_v1_layout.db',
            common_fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/common_fonts.zip'
        },
        preview_images: ['https://cdn.qul.tarteel.ai/previews/qpc_v1_page_1.jpg'],
        checksum_sha256: 'def456ghi789...',
        is_installed: false
    },
    {
        id: 3,
        name: 'Indopak Nastaleeq 15 Lignes',
        code: 'indopak_15',
        description: 'Style calligraphique du sous-continent indien',
        pages_count: 610,
        lines_per_page: 15,
        size_mb: 195,
        narration: 'Hafs',
        features: ['juz_markers'],
        download_urls: {
            fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/indopak_15_fonts.zip',
            database_sqlite: 'https://cdn.qul.tarteel.ai/databases/indopak_15_layout.db',
            common_fonts_zip: 'https://cdn.qul.tarteel.ai/fonts/common_fonts.zip'
        },
        preview_images: ['https://cdn.qul.tarteel.ai/previews/indopak_page_1.jpg'],
        checksum_sha256: 'ghi789jkl012...',
        is_installed: false
    }
];
