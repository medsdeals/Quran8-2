// src/services/DownloadManager.ts
// Using legacy API for backwards compatibility with react-native-zip-archive
import {
    documentDirectory,
    makeDirectoryAsync,
    deleteAsync,
    getInfoAsync,
    readDirectoryAsync,
    createDownloadResumable,
    DownloadResumable,
} from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { Mushaf, DownloadProgress } from '../types';

export class DownloadManager {
    private activeDownloads = new Map<number, DownloadResumable>();
    private progressCallbacks = new Map<number, (progress: DownloadProgress) => void>();

    /**
     * Télécharge un Mushaf complet avec validation stricte
     */
    async downloadMushaf(
        mushaf: Mushaf,
        onProgress: (progress: DownloadProgress) => void
    ): Promise<void> {
        const mushafDir = `${documentDirectory}mushafs/${mushaf.id}/`;

        const progress: DownloadProgress = {
            mushaf_id: mushaf.id,
            status: 'initializing',
            progress: 0,
            downloaded_bytes: 0,
            total_bytes: mushaf.size_mb * 1024 * 1024,
            speed_mbps: 0,
            eta_seconds: 0,
            current_step: 'Initialisation...'
        };

        this.progressCallbacks.set(mushaf.id, onProgress);

        try {
            // Étape 1: Créer les répertoires
            await makeDirectoryAsync(mushafDir, { intermediates: true });
            await makeDirectoryAsync(`${mushafDir}fonts/`, { intermediates: true });

            // Étape 2: Télécharger la base de données SQLite (10% du temps)
            progress.status = 'downloading';
            progress.current_step = 'Téléchargement de la base de données...';
            onProgress(progress);

            const dbPath = `${mushafDir}mushaf_layout.db`;
            await this.downloadFile(
                mushaf.download_urls.database_sqlite,
                dbPath,
                (downloadProgress) => {
                    progress.progress = downloadProgress * 10;
                    progress.downloaded_bytes = downloadProgress * progress.total_bytes * 0.1;
                    onProgress(progress);
                }
            );

            // Étape 3: Télécharger les polices communes (5% du temps)
            progress.current_step = 'Téléchargement des polices communes...';
            onProgress(progress);

            const commonFontsZip = `${mushafDir}common_fonts.zip`;
            await this.downloadFile(
                mushaf.download_urls.common_fonts_zip,
                commonFontsZip,
                (downloadProgress) => {
                    progress.progress = 10 + (downloadProgress * 5);
                    onProgress(progress);
                }
            );

            // Étape 4: Télécharger le ZIP des 604 polices (60% du temps)
            progress.current_step = `Téléchargement des ${mushaf.pages_count} polices...`;
            onProgress(progress);

            const fontsZipPath = `${mushafDir}fonts.zip`;
            const startTime = Date.now();

            await this.downloadFile(
                mushaf.download_urls.fonts_zip,
                fontsZipPath,
                (downloadProgress) => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const bytesDownloaded = downloadProgress * progress.total_bytes * 0.6;

                    progress.progress = 15 + (downloadProgress * 60);
                    progress.downloaded_bytes = bytesDownloaded;
                    progress.speed_mbps = elapsed > 0 ? (bytesDownloaded / 1024 / 1024) / elapsed : 0;

                    const remainingBytes = progress.total_bytes - bytesDownloaded;
                    progress.eta_seconds = progress.speed_mbps > 0
                        ? Math.round(remainingBytes / (progress.speed_mbps * 1024 * 1024))
                        : 0;

                    onProgress(progress);
                }
            );

            // Étape 5: Décompresser les polices communes (5% du temps)
            progress.status = 'extracting';
            progress.current_step = 'Extraction des polices communes...';
            progress.progress = 75;
            onProgress(progress);

            await unzip(commonFontsZip, `${mushafDir}fonts/common/`);
            await deleteAsync(commonFontsZip, { idempotent: true });

            // Étape 6: Décompresser les 604 polices (15% du temps)
            progress.current_step = `Extraction des ${mushaf.pages_count} polices...`;
            progress.progress = 80;
            onProgress(progress);

            await unzip(fontsZipPath, `${mushafDir}fonts/pages/`);
            await deleteAsync(fontsZipPath, { idempotent: true });

            progress.progress = 95;
            onProgress(progress);

            // Étape 7: Vérifier l'intégrité (5% du temps)
            progress.status = 'verifying';
            progress.current_step = 'Vérification de l\'intégrité...';
            onProgress(progress);

            await this.verifyIntegrity(mushafDir, mushaf);

            // Étape 8: Validation des 15 lignes par page
            await this.validate15LinesPerPage(dbPath, mushaf.pages_count);

            // Étape 9: Enregistrer dans la base principale
            const mainDb = await SQLite.openDatabaseAsync('mushaf_library.db');
            await mainDb.runAsync(
                `INSERT INTO installed_mushafs (id, name, code, pages_count, lines_per_page, local_path, installed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [mushaf.id, mushaf.name, mushaf.code, mushaf.pages_count, mushaf.lines_per_page, mushafDir, new Date().toISOString()]
            );

            // Étape 10: Sauvegarder dans AsyncStorage
            await AsyncStorage.setItem(`mushaf_${mushaf.id}_installed`, 'true');
            await AsyncStorage.setItem(`mushaf_${mushaf.id}_path`, mushafDir);

            // Terminé !
            progress.status = 'completed';
            progress.progress = 100;
            progress.current_step = 'Installation terminée !';
            onProgress(progress);

        } catch (error) {
            progress.status = 'failed';
            progress.error = (error as Error).message;
            progress.current_step = `Erreur: ${(error as Error).message}`;
            onProgress(progress);

            // Nettoyer les fichiers partiels
            await this.cleanupPartialDownload(mushafDir);

            throw error;
        } finally {
            this.activeDownloads.delete(mushaf.id);
            this.progressCallbacks.delete(mushaf.id);
        }
    }

    /**
     * Télécharge un fichier avec gestion de la progression
     */
    private async downloadFile(
        url: string,
        filePath: string,
        onProgress: (progress: number) => void
    ): Promise<void> {
        const downloadResumable = createDownloadResumable(
            url,
            filePath,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                onProgress(progress);
            }
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || result.status !== 200) {
            throw new Error(`Échec du téléchargement: ${url}`);
        }
    }

    /**
     * Vérifie l'intégrité des fichiers téléchargés
     */
    private async verifyIntegrity(mushafDir: string, mushaf: Mushaf): Promise<void> {
        // Vérifier que tous les fichiers critiques existent
        const criticalFiles = [
            `${mushafDir}mushaf_layout.db`,
            `${mushafDir}fonts/common/bismillah.ttf`,
            `${mushafDir}fonts/common/surah_names.ttf`,
            `${mushafDir}fonts/pages/p1.ttf`,
            `${mushafDir}fonts/pages/p${mushaf.pages_count}.ttf`
        ];

        for (const filePath of criticalFiles) {
            const fileInfo = await getInfoAsync(filePath);
            if (!fileInfo.exists) {
                throw new Error(`Fichier manquant: ${filePath}`);
            }
        }

        // Vérifier le nombre total de polices de pages
        const pagesDir = await readDirectoryAsync(`${mushafDir}fonts/pages/`);
        const fontFiles = pagesDir.filter(file => file.endsWith('.ttf'));

        if (fontFiles.length !== mushaf.pages_count) {
            throw new Error(
                `Nombre de polices incorrect: attendu ${mushaf.pages_count}, trouvé ${fontFiles.length}`
            );
        }
    }

    /**
     * VALIDATION CRITIQUE: Vérifie que chaque page a exactement 15 lignes
     */
    private async validate15LinesPerPage(dbPath: string, totalPages: number): Promise<void> {
        const db = await SQLite.openDatabaseAsync(dbPath);

        // Vérifier pages 1 et 2 (doivent avoir 8 lignes)
        for (const page of [1, 2]) {
            const result = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM page_lines WHERE page_number = ?',
                [page]
            );

            if (result && result.count !== 8) {
                throw new Error(`Page ${page} devrait avoir 8 lignes, mais a ${result.count} lignes`);
            }
        }

        // Vérifier pages 3-604 (doivent avoir exactement 15 lignes)
        for (let page = 3; page <= totalPages; page++) {
            const result = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM page_lines WHERE page_number = ?',
                [page]
            );

            if (result && result.count !== 15) {
                throw new Error(
                    `ERREUR CRITIQUE: Page ${page} devrait avoir 15 lignes, mais a ${result.count} lignes`
                );
            }
        }

        console.log(`✅ Validation réussie: Toutes les pages respectent la règle des 15 lignes`);
    }

    /**
     * Supprime un Mushaf installé
     */
    async deleteMushaf(mushafId: number): Promise<void> {
        const mushafDir = `${documentDirectory}mushafs/${mushafId}/`;
        await deleteAsync(mushafDir, { idempotent: true });

        const mainDb = await SQLite.openDatabaseAsync('mushaf_library.db');
        await mainDb.runAsync('DELETE FROM installed_mushafs WHERE id = ?', [mushafId]);

        await AsyncStorage.removeItem(`mushaf_${mushafId}_installed`);
        await AsyncStorage.removeItem(`mushaf_${mushafId}_path`);
    }

    /**
     * Nettoie les fichiers partiels après un échec
     */
    private async cleanupPartialDownload(mushafDir: string): Promise<void> {
        try {
            await deleteAsync(mushafDir, { idempotent: true });
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    }

    /**
     * Vérifie si un Mushaf est installé
     */
    async isInstalled(mushafId: number): Promise<boolean> {
        const installed = await AsyncStorage.getItem(`mushaf_${mushafId}_installed`);
        return installed === 'true';
    }

    /**
     * Récupère le chemin local d'un Mushaf
     */
    async getMushafPath(mushafId: number): Promise<string | null> {
        return await AsyncStorage.getItem(`mushaf_${mushafId}_path`);
    }
}

// Singleton instance
export const downloadManager = new DownloadManager();
