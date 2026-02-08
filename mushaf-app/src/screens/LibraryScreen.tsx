// src/screens/LibraryScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMushafStore } from '../store/mushafStore';
import { AVAILABLE_MUSHAFS } from '../data/availableMushafs';
import { downloadManager } from '../services/DownloadManager';
import { Mushaf, DownloadProgress } from '../types';

interface LibraryScreenProps {
    navigation: any;
}

export function LibraryScreen({ navigation }: LibraryScreenProps) {
    const {
        installedMushafs,
        addInstalledMushaf,
        removeInstalledMushaf,
        downloadProgress,
        setDownloadProgress,
        clearDownloadProgress,
        setCurrentMushaf
    } = useMushafStore();

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkInstalledMushafs();
    }, []);

    const checkInstalledMushafs = async () => {
        for (const mushaf of AVAILABLE_MUSHAFS) {
            const isInstalled = await downloadManager.isInstalled(mushaf.id);
            if (isInstalled) {
                addInstalledMushaf(mushaf.id);
            }
        }
    };

    const handleDownload = async (mushaf: Mushaf) => {
        try {
            await downloadManager.downloadMushaf(mushaf, (progress: DownloadProgress) => {
                setDownloadProgress(mushaf.id, progress);

                if (progress.status === 'completed') {
                    addInstalledMushaf(mushaf.id);
                    setTimeout(() => clearDownloadProgress(mushaf.id), 2000);
                }
            });
        } catch (error) {
            Alert.alert(
                'Erreur de téléchargement',
                (error as Error).message,
                [{ text: 'OK' }]
            );
        }
    };

    const handleDelete = async (mushaf: Mushaf) => {
        Alert.alert(
            'Supprimer le Mushaf',
            `Voulez-vous vraiment supprimer "${mushaf.name}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await downloadManager.deleteMushaf(mushaf.id);
                            removeInstalledMushaf(mushaf.id);
                        } catch (error) {
                            Alert.alert('Erreur', (error as Error).message);
                        }
                    }
                }
            ]
        );
    };

    const handleOpenReader = async (mushaf: Mushaf) => {
        setCurrentMushaf(mushaf.id);
        navigation.navigate('Reader', { mushafId: mushaf.id });
    };

    const renderMushafCard = ({ item }: { item: Mushaf }) => {
        const isInstalled = installedMushafs.includes(item.id);
        const progress = downloadProgress[item.id];
        const isDownloading = progress && !['completed', 'failed'].includes(progress.status);

        return (
            <View style={styles.card}>
                {/* Preview Image */}
                <View style={styles.previewContainer}>
                    {item.preview_images[0] ? (
                        <Image
                            source={{ uri: item.preview_images[0] }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.previewPlaceholder}>
                            <Text style={styles.previewPlaceholderText}>📖</Text>
                        </View>
                    )}

                    {/* Narration Badge */}
                    <View style={styles.narrationBadge}>
                        <Text style={styles.narrationText}>{item.narration}</Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>

                    <View style={styles.cardMeta}>
                        <Text style={styles.metaText}>📄 {item.pages_count} pages</Text>
                        <Text style={styles.metaText}>💾 {item.size_mb} MB</Text>
                    </View>

                    {/* Features */}
                    <View style={styles.features}>
                        {item.features.slice(0, 3).map((feature, idx) => (
                            <View key={idx} style={styles.featureBadge}>
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Download Progress */}
                {isDownloading && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{progress.current_step}</Text>
                        <Text style={styles.progressPercent}>{Math.round(progress.progress)}%</Text>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                    {isInstalled ? (
                        <>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => handleOpenReader(item)}
                            >
                                <Text style={styles.primaryButtonText}>📖 Lire</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDelete(item)}
                            >
                                <Text style={styles.deleteButtonText}>🗑️</Text>
                            </TouchableOpacity>
                        </>
                    ) : isDownloading ? (
                        <View style={styles.downloadingButton}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.downloadingButtonText}>Téléchargement...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={() => handleDownload(item)}
                        >
                            <Text style={styles.downloadButtonText}>⬇️ Télécharger</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📚 Bibliothèque des Mushafs</Text>
                <Text style={styles.headerSubtitle}>
                    {installedMushafs.length} installé(s) sur {AVAILABLE_MUSHAFS.length}
                </Text>
            </View>

            {/* Mushaf List */}
            <FlatList
                data={AVAILABLE_MUSHAFS}
                renderItem={renderMushafCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={() => {
                    setRefreshing(true);
                    checkInstalledMushafs().then(() => setRefreshing(false));
                }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        padding: 20,
        backgroundColor: '#2563eb',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white'
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4
    },
    listContainer: {
        padding: 16,
        gap: 16
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16
    },
    previewContainer: {
        height: 160,
        backgroundColor: '#e5e7eb',
        position: 'relative'
    },
    previewImage: {
        width: '100%',
        height: '100%'
    },
    previewPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6'
    },
    previewPlaceholderText: {
        fontSize: 48
    },
    narrationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#059669',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12
    },
    narrationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600'
    },
    cardContent: {
        padding: 16
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    cardDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        lineHeight: 20
    },
    cardMeta: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12
    },
    metaText: {
        fontSize: 13,
        color: '#9ca3af'
    },
    features: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12
    },
    featureBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    featureText: {
        fontSize: 11,
        color: '#2563eb',
        fontWeight: '500'
    },
    progressContainer: {
        padding: 16,
        paddingTop: 0
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 3
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
        position: 'absolute',
        right: 16,
        bottom: 16
    },
    cardActions: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 0,
        gap: 12
    },
    primaryButton: {
        flex: 1,
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    deleteButton: {
        backgroundColor: '#fee2e2',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    deleteButtonText: {
        fontSize: 18
    },
    downloadButton: {
        flex: 1,
        backgroundColor: '#059669',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    downloadingButton: {
        flex: 1,
        backgroundColor: '#6b7280',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8
    },
    downloadingButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    }
});
