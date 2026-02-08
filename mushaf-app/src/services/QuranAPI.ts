// src/services/QuranAPI.ts
// Service to fetch real Quran data from quran.com API v4

const API_BASE_URL = 'https://api.quran.com/api/v4';

export interface APIWord {
    id: number;
    position: number;
    audio_url: string | null;
    char_type_name: 'word' | 'end';
    code_v1: string;
    code_v2?: string;
    page_number: number;
    line_number: number;
    text: string;
    translation?: {
        text: string;
        language_name: string;
    };
    transliteration?: {
        text: string | null;
        language_name: string;
    };
}

export interface APIVerse {
    id: number;
    verse_number: number;
    verse_key: string;
    hizb_number: number;
    rub_el_hizb_number: number;
    ruku_number: number;
    manzil_number: number;
    sajdah_number: number | null;
    page_number: number;
    juz_number: number;
    words: APIWord[];
}

export interface APIPageResponse {
    verses: APIVerse[];
    pagination: {
        per_page: number;
        current_page: number;
        next_page: number | null;
        total_pages: number;
        total_records: number;
    };
}

export interface APISurah {
    id: number;
    revelation_place: string;
    revelation_order: number;
    bismillah_pre: boolean;
    name_simple: string;
    name_complex: string;
    name_arabic: string;
    verses_count: number;
    pages: number[];
    translated_name: {
        language_name: string;
        name: string;
    };
}

export interface APIChaptersResponse {
    chapters: APISurah[];
}

export interface PageLine {
    lineNumber: number;
    words: APIWord[];
    isCentered: boolean;
    lineType: 'surah_name' | 'basmallah' | 'ayah';
}

export interface ProcessedPage {
    pageNumber: number;
    lines: PageLine[];
    totalLines: number;
}

/**
 * Fetches verses for a specific page with word-level data
 */
export async function fetchPageWithWords(pageNumber: number): Promise<APIPageResponse> {
    const url = `${API_BASE_URL}/verses/by_page/${pageNumber}?words=true&per_page=all&word_fields=code_v1,code_v2,line_number,page_number,text`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageNumber}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetches all surahs (chapters) metadata
 */
export async function fetchSurahs(): Promise<APISurah[]> {
    const url = `${API_BASE_URL}/chapters`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch chapters: ${response.statusText}`);
    }

    const data: APIChaptersResponse = await response.json();
    return data.chapters;
}

/**
 * Fetches a specific surah with verses
 */
export async function fetchSurah(surahNumber: number): Promise<APISurah> {
    const url = `${API_BASE_URL}/chapters/${surahNumber}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch surah ${surahNumber}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.chapter;
}

/**
 * Processes API response to organize words by line (1-15)
 * This is the key function for 15-line Mushaf rendering
 */
export function processPageData(pageData: APIPageResponse, pageNumber: number): ProcessedPage {
    const linesMap = new Map<number, APIWord[]>();

    // Group all words by their line number
    for (const verse of pageData.verses) {
        for (const word of verse.words) {
            const lineNum = word.line_number;
            if (!linesMap.has(lineNum)) {
                linesMap.set(lineNum, []);
            }
            linesMap.get(lineNum)!.push(word);
        }
    }

    // Determine expected number of lines (page 1-2 have 8 lines, rest have 15)
    const expectedLines = pageNumber <= 2 ? 8 : 15;

    // Build lines array, filling in empty lines if necessary
    const lines: PageLine[] = [];

    for (let lineNum = 1; lineNum <= expectedLines; lineNum++) {
        const words = linesMap.get(lineNum) || [];

        // Determine line type based on content
        let lineType: 'surah_name' | 'basmallah' | 'ayah' = 'ayah';
        let isCentered = false;

        // Check if this might be a surah name or basmallah line
        // (This is a heuristic - actual surah headers may need different handling)
        if (words.length === 0) {
            isCentered = true;
        }

        lines.push({
            lineNumber: lineNum,
            words,
            isCentered,
            lineType
        });
    }

    return {
        pageNumber,
        lines,
        totalLines: lines.length
    };
}

/**
 * Prefetch multiple pages (for smoother navigation)
 */
export async function prefetchPages(startPage: number, count: number = 3): Promise<Map<number, ProcessedPage>> {
    const results = new Map<number, ProcessedPage>();
    const maxPage = 604;

    const pagesToFetch: number[] = [];
    for (let i = 0; i < count; i++) {
        const page = startPage + i;
        if (page >= 1 && page <= maxPage) {
            pagesToFetch.push(page);
        }
    }

    const fetches = pagesToFetch.map(async (pageNum) => {
        try {
            const data = await fetchPageWithWords(pageNum);
            const processed = processPageData(data, pageNum);
            results.set(pageNum, processed);
        } catch (error) {
            console.error(`Error prefetching page ${pageNum}:`, error);
        }
    });

    await Promise.all(fetches);
    return results;
}

/**
 * Get font URL for a specific page (QCF V1 fonts)
 * These fonts are hosted on quran.com CDN
 */
export function getQCFv1FontUrl(pageNumber: number): string {
    // quran.com serves QCF fonts from their CDN
    // Format: https://static.qurancdn.com/fonts/qpc/quran-hafs-v1/woff/p{pageNumber}.woff
    const paddedPage = pageNumber.toString();
    return `https://static.qurancdn.com/fonts/qpc-hafs/qpc_hafs_v1/qpc_v1_page_${paddedPage}.woff2`;
}

/**
 * Get font URL for QCF V2 fonts 
 */
export function getQCFv2FontUrl(pageNumber: number): string {
    const paddedPage = pageNumber.toString();
    return `https://static.qurancdn.com/fonts/qpc-hafs/qpc_hafs_v2/qpc_v2_page_${paddedPage}.woff2`;
}

/**
 * Fetches Uthmani text for a page (fallback if fonts fail)
 */
export async function fetchUthmaniText(pageNumber: number): Promise<string[]> {
    const url = `${API_BASE_URL}/quran/verses/uthmani?page_number=${pageNumber}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch Uthmani text for page ${pageNumber}`);
    }

    const data = await response.json();
    return data.verses.map((v: { text_uthmani: string }) => v.text_uthmani);
}
