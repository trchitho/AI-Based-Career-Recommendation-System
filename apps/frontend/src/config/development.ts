// Development Configuration for Voice Interview System
export const developmentConfig = {
    // Debug Settings - Improved for development
    MAX_TAB_SWITCH: 10, // Increased from 3 to 10 for better debugging
    DEBUG_VOICE_PROCESSING: true, // Enable voice processing debug logs
    ENABLE_PERFORMANCE_LOGGING: true, // Enable performance metrics logging

    // Voice Interview Settings
    VOICE_PROCESSING_TIMEOUT: 60, // Extended timeout for debugging
    ENABLE_MOCK_SERVICES: true, // Enable mock TTS/STT for development

    // UI Debug Settings
    SHOW_COMPONENT_BOUNDARIES: true, // Show component boundaries in dev
    ENABLE_STATE_LOGGING: true, // Log state changes

    // Performance Settings
    ENABLE_PROFILING: true, // Enable React profiler
    LOG_RENDER_TIMES: true, // Log component render times

    // Error Handling
    DETAILED_ERROR_MESSAGES: true, // Show detailed error messages
    ENABLE_ERROR_BOUNDARY_LOGGING: true, // Log error boundary catches

    // API Settings
    API_TIMEOUT: 30000, // 30 seconds for development
    ENABLE_API_MOCKING: false, // Disable by default, can be enabled for testing

    // Audio Settings
    AUDIO_DEBUG_MODE: true, // Enable audio debugging
    SAVE_AUDIO_RECORDINGS: true, // Save recordings for debugging

    // Test Settings
    ENABLE_TEST_HELPERS: true, // Enable test helper functions
    MOCK_USER_MEDIA: false, // Mock getUserMedia for testing
};

export default developmentConfig;