// src/screens/ReaderScreen.tsx
// Direct API-based reader - simplified without Reanimated
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Dimensions,
    PanResponder,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MushafPageRenderer } from '../components/MushafPageRenderer';
import { APIWord } from '../services/QuranAPI';

const TOTAL_PAGES = 604;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReaderScreenProps {
    navigation: any;
}

export function ReaderScreen({ navigation }: ReaderScreenProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [showGoToPage, setShowGoToPage] = useState(false);
    const [goToPageValue, setGoToPageValue] = useState('');
    const [fontVersion, setFontVersion] = useState<'v1' | 'v2'>('v1');

    // Simple Animated value for swipe feedback
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadLastPage();
    }, []);

    useEffect(() => {
        saveCurrentPage();
        navigation.setOptions({
            title: `صفحة ${currentPage}`
        });
    }, [currentPage, navigation]);

    const loadLastPage = async () => {
        try {
            const lastPage = await AsyncStorage.getItem('quran_last_page');
            if (lastPage) {
                setCurrentPage(parseInt(lastPage));
            }
        } catch (error) {
            console.log('Error loading last page:', error);
        }
    };

    const saveCurrentPage = async () => {
        try {
            await AsyncStorage.setItem('quran_last_page', currentPage.toString());
        } catch (error) {
            console.log('Error saving page:', error);
        }
    };

    const goToNextPage = useCallback(() => {
        if (currentPage < TOTAL_PAGES) {
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage]);

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const handleGoToPage = () => {
        const page = parseInt(goToPageValue);
        if (page >= 1 && page <= TOTAL_PAGES) {
            setCurrentPage(page);
            setShowGoToPage(false);
            setGoToPageValue('');
        } else {
            Alert.alert('خطأ', `الرجاء إدخال رقم بين 1 و ${TOTAL_PAGES}`);
        }
    };

    // Simple pan responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                translateX.setValue(gestureState.dx * 0.3);
            },
            onPanResponderRelease: (_, gestureState) => {
                // RTL: right swipe = next, left swipe = previous
                if (gestureState.dx > 80 && gestureState.vx > 0.3) {
                    goToNextPage();
                } else if (gestureState.dx < -80 && gestureState.vx < -0.3) {
                    goToPreviousPage();
                }
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 8
                }).start();
            }
        })
    ).current;

    const handleWordPress = useCallback((word: APIWord) => {
        const translation = word.translation || '';
        const transliteration = word.transliteration || '';
        Alert.alert(
            '📖 كلمة',
            `${translation}\n\n${transliteration}`,
            [{ text: 'إغلاق', style: 'cancel' }]
        );
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Main page content with swipe */}
            <Animated.View
                style={[styles.pageContainer, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <MushafPageRenderer
                    pageNumber={currentPage}
                    fontVersion={fontVersion}
                    onWordPress={handleWordPress}
                />
            </Animated.View>

            {/* Bottom toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity
                    style={[styles.navBtn, currentPage === TOTAL_PAGES && styles.navBtnDisabled]}
                    onPress={goToNextPage}
                    disabled={currentPage === TOTAL_PAGES}
                >
                    <Text style={styles.navBtnText}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.pageInfo}
                    onPress={() => setShowGoToPage(true)}
                >
                    <Text style={styles.pageNumber}>{currentPage}</Text>
                    <Text style={styles.pageSeparator}>/</Text>
                    <Text style={styles.totalPages}>{TOTAL_PAGES}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.navBtn, currentPage === 1 && styles.navBtnDisabled]}
                    onPress={goToPreviousPage}
                    disabled={currentPage === 1}
                >
                    <Text style={styles.navBtnText}>←</Text>
                </TouchableOpacity>
            </View>

            {/* Quick actions */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setCurrentPage(1)}
                >
                    <Text style={styles.actionBtnText}>🏠</Text>
                    <Text style={styles.actionBtnLabel}>البداية</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setShowGoToPage(true)}
                >
                    <Text style={styles.actionBtnText}>🔢</Text>
                    <Text style={styles.actionBtnLabel}>انتقال</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setFontVersion(v => v === 'v1' ? 'v2' : 'v1')}
                >
                    <Text style={styles.actionBtnText}>🔤</Text>
                    <Text style={styles.actionBtnLabel}>{fontVersion.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* Go to page modal */}
            <Modal
                visible={showGoToPage}
                transparent
                animationType="fade"
                onRequestClose={() => setShowGoToPage(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowGoToPage(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>انتقال إلى صفحة</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={`1 - ${TOTAL_PAGES}`}
                            keyboardType="number-pad"
                            value={goToPageValue}
                            onChangeText={setGoToPageValue}
                            autoFocus
                            textAlign="center"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowGoToPage(false)}
                            >
                                <Text style={styles.modalCancelText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleGoToPage}
                            >
                                <Text style={styles.modalConfirmText}>انتقال</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefcf3'
    },
    pageContainer: {
        flex: 1
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#e5e0d5'
    },
    navBtn: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e6f5c',
        borderRadius: 25
    },
    navBtnDisabled: {
        backgroundColor: '#d4d4d4'
    },
    navBtnText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold'
    },
    pageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0ebe0',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24
    },
    pageNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e6f5c'
    },
    pageSeparator: {
        fontSize: 18,
        color: '#8b8b8b',
        marginHorizontal: 8
    },
    totalPages: {
        fontSize: 16,
        color: '#8b8b8b'
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#e5e0d5'
    },
    actionBtn: {
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16
    },
    actionBtnText: {
        fontSize: 22
    },
    actionBtnLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 2
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '80%',
        maxWidth: 320
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#1e6f5c'
    },
    modalInput: {
        borderWidth: 2,
        borderColor: '#e5e0d5',
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        marginBottom: 20,
        backgroundColor: '#fafafa'
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12
    },
    modalCancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#f3f3f3',
        alignItems: 'center'
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600'
    },
    modalConfirmBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#1e6f5c',
        alignItems: 'center'
    },
    modalConfirmText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600'
    }
});
