// src/components/MushafPageRenderer.tsx
// Real data version using quran.com API
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  fetchPageWithWords,
  processPageData,
  ProcessedPage,
  APIWord
} from '../services/QuranAPI';

interface Props {
  pageNumber: number;
  fontVersion?: 'v1' | 'v2';
  onWordPress?: (word: APIWord) => void;
  onPageLoaded?: () => void;
}

export function MushafPageRenderer({
  pageNumber,
  fontVersion = 'v1',
  onWordPress,
  onPageLoaded
}: Props) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatePageHTML = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch real data from quran.com API
      const pageData = await fetchPageWithWords(pageNumber);
      const processedPage = processPageData(pageData, pageNumber);

      // Generate HTML with the real data
      const html = generateHTML(processedPage, pageNumber, fontVersion);

      setHtmlContent(html);
      setLoading(false);
      onPageLoaded?.();

    } catch (err) {
      console.error('Error generating page:', err);
      setError((err as Error).message);
      setLoading(false);
    }
  }, [pageNumber, fontVersion, onPageLoaded]);

  useEffect(() => {
    generatePageHTML();
  }, [generatePageHTML]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'word_click' && onWordPress) {
        onWordPress(data.word);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  }, [onWordPress]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1e6f5c" />
        <Text style={styles.loadingText}>جار تحميل الصفحة {pageNumber}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>خطأ في تحميل الصفحة</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ html: htmlContent }}
      style={styles.webview}
      scalesPageToFit={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      onMessage={handleMessage}
      originWhitelist={['*']}
      scrollEnabled={false}
      bounces={false}
    />
  );
}

/**
 * Generates HTML for a Mushaf page with 15 lines (or 8 for pages 1-2)
 */
function generateHTML(
  processedPage: ProcessedPage,
  pageNumber: number,
  fontVersion: 'v1' | 'v2'
): string {
  // Use QCF (Quran Complex Font) - page-specific fonts with proper glyph codes
  const paddedPage = pageNumber.toString().padStart(3, '0');
  const fontFamily = `QCF_P${paddedPage}`;

  // GitHub-hosted QCF fonts (mustafa0x/qpc-fonts repository)
  const fontUrl = fontVersion === 'v2'
    ? `https://raw.githubusercontent.com/mustafa0x/qpc-fonts/master/mushaf-v2-woff2/QCF_P${paddedPage}.woff2`
    : `https://raw.githubusercontent.com/mustafa0x/qpc-fonts/master/mushaf-woff2/QCF_P${paddedPage}.woff2`;

  // Generate lines HTML using QCF glyph codes
  const linesHTML = processedPage.lines.map((line) => {
    if (line.words.length === 0) {
      // Empty line placeholder
      return `<div class="line line--empty" data-line="${line.lineNumber}"></div>`;
    }

    // Use QCF glyph codes for proper calligraphic rendering
    const wordsHTML = line.words.map((word, idx) => {
      const glyphCode = fontVersion === 'v1' ? word.code_v1 : (word.code_v2 || word.code_v1);
      const isEnd = word.char_type_name === 'end';

      return `<span 
        class="word ${isEnd ? 'word--end' : ''}" 
        data-id="${word.id}"
        data-position="${word.position}"
        onclick="handleWordClick(${JSON.stringify({
        id: word.id,
        position: word.position,
        text: word.text,
        translation: word.translation?.text || '',
        transliteration: word.transliteration?.text || '',
        page_number: word.page_number,
        line_number: word.line_number
      }).replace(/"/g, '&quot;')})"
      >${glyphCode}</span>`;
    }).join('');

    return `
      <div class="line" data-line="${line.lineNumber}">
        ${wordsHTML}
      </div>
    `;
  }).join('');

  // Calculate font size based on page (pages 1-2 have larger text)
  const baseFontSize = pageNumber <= 2 ? 26 : 22;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontUrl}') format('woff2');
      font-display: swap;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      height: 100%;
      overflow: hidden;
    }
    
    body {
      font-family: '${fontFamily}', 'Traditional Arabic', serif;
      background: #fefcf3;
      direction: rtl;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      margin: 0;
      padding: 0;
    }
    
    .mushaf-page {
      width: 100%;
      max-width: 100%;
      background: #fefcf3;
      padding: 8px 4px;
      box-sizing: border-box;
    }
    
    /* ============================================
       LINES - 15 per page (8 for pages 1-2)
       ============================================ */
    .line {
      width: 100%;
      min-height: ${baseFontSize + 10}px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: nowrap;
      direction: rtl;
      padding: 1px 0;
      gap: 3px;
    }
    
    .line:last-child {
      border-bottom: none;
    }
    
    .line--empty {
      min-height: ${baseFontSize}px;
    }
    
    /* ============================================
       WORDS - QCF glyph fonts
       ============================================ */
    .word {
      font-size: ${baseFontSize}px;
      line-height: 1.4;
      color: #1a1a1a;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0 1px;
      border-radius: 4px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    
    .word:active {
      background-color: rgba(30, 111, 92, 0.15);
      transform: scale(1.02);
    }
    
    .word--end {
      color: #1e6f5c;
      font-size: ${baseFontSize - 2}px;
    }
    
    /* ============================================
       PAGE NUMBER
       ============================================ */
    .page-number {
      text-align: center;
      font-family: 'Amiri', 'Traditional Arabic', serif;
      font-size: 14px;
      color: #8b6d3b;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #d4c5a9;
    }
    
    /* ============================================
       RESPONSIVE
       ============================================ */
    @media (max-width: 380px) {
      .word {
        font-size: ${baseFontSize - 4}px;
      }
      .mushaf-page {
        padding: 12px 14px;
      }
    }
    
    @media (min-width: 768px) {
      .word {
        font-size: ${baseFontSize + 4}px;
      }
      .line {
        min-height: ${baseFontSize + 24}px;
      }
    }
  </style>
</head>
<body>
  <div class="mushaf-page">
    ${linesHTML}
    <div class="page-number">${pageNumber}</div>
  </div>
  
  <script>
    function handleWordClick(word) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'word_click',
          word: word
        }));
      }
    }
  </script>
</body>
</html>
  `;
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefcf3'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'System',
    color: '#1e6f5c',
    textAlign: 'center'
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 24
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  errorText: {
    fontSize: 18,
    color: '#c53030',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8
  },
  errorDetail: {
    fontSize: 14,
    color: '#9b2c2c',
    textAlign: 'center'
  }
});
