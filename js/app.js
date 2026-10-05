/**
 * ThinkTank GWAP - Main Application Module
 * Initializes the app and provides unified API
 */

const ThinkTankApp = {
    initialized: false,
    mode: 'demo', // 'demo' or 'production'

    /**
     * Initialize the application
     * @returns {Promise<boolean>}
     */
    async init() {
        // Always try to initialize Supabase if not yet in production mode
        if (ThinkTankConfig.isSupabaseConfigured() && this.mode !== 'production') {
            const success = ThinkTankConfig.initSupabase();
            if (success) {
                this.mode = 'production';
                console.log('ThinkTank initialized in production mode');
            } else {
                console.log('ThinkTank: Supabase SDK not ready, will use demo mode');
            }
        } else if (!ThinkTankConfig.isSupabaseConfigured()) {
            console.log('ThinkTank initialized in demo mode (Supabase not configured)');
        }

        this.initialized = true;
        return true;
    },

    /**
     * Check if running in demo mode
     * @returns {boolean}
     */
    isDemoMode() {
        return this.mode === 'demo';
    },

    /**
     * Get current user (unified API)
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        if (this.isDemoMode()) {
            const cached = localStorage.getItem('thinktank_user');
            return cached ? JSON.parse(cached) : null;
        }
        return ThinkTankAuth.getCurrentUser();
    },

    /**
     * Check if user is logged in
     * @returns {Promise<boolean>}
     */
    async isLoggedIn() {
        const user = await this.getCurrentUser();
        return user !== null;
    },

    /**
     * Redirect to login if not authenticated
     * @param {string} returnUrl - URL to return to after login
     */
    async requireAuth(returnUrl = null) {
        const loggedIn = await this.isLoggedIn();
        if (!loggedIn) {
            if (returnUrl) {
                sessionStorage.setItem('thinktank_return_url', returnUrl);
            }
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    /**
     * Create a demo user (for demo mode)
     * @param {string} username
     * @param {string} avatarUrl
     * @returns {object}
     */
    createDemoUser(username, avatarUrl) {
        const user = {
            id: 'demo_' + Date.now(),
            username,
            avatar: avatarUrl,
            points: 0,
            highestLevel: 'novice',
            unlockedLevels: ['novice'],
            levelsCompleted: {
                novice: 0,
                apprentice: 0,
                expert: 0,
                master: 0
            },
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('thinktank_user', JSON.stringify(user));
        return user;
    },

    /**
     * Sign up or create demo user
     * @param {string} email - Email (null for demo)
     * @param {string} password - Password (null for demo)
     * @param {string} username
     * @param {string} avatarUrl
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signUp(email, password, username, avatarUrl) {
        if (this.isDemoMode() || !email || !password) {
            const user = this.createDemoUser(username, avatarUrl);
            return { user, error: null };
        }
        return ThinkTankAuth.signUp(email, password, username, avatarUrl);
    },

    /**
     * Sign in or continue as demo user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signIn(email, password) {
        if (this.isDemoMode()) {
            const user = await this.getCurrentUser();
            if (user) return { user, error: null };
            return { user: null, error: { message: 'No demo user found' } };
        }
        return ThinkTankAuth.signIn(email, password);
    },

    /**
     * Sign out
     * @returns {Promise<{error: object|null}>}
     */
    async signOut() {
        if (this.isDemoMode()) {
            localStorage.removeItem('thinktank_user');
            localStorage.removeItem('thinktank_current_level');
            localStorage.removeItem('thinktank_last_result');
            localStorage.removeItem('thinktank_speed_best');
            return { error: null };
        }
        return ThinkTankAuth.signOut();
    },

    /**
     * Get user profile
     * @returns {Promise<object|null>}
     */
    async getProfile() {
        const user = await this.getCurrentUser();
        if (!user) return null;

        if (this.isDemoMode()) {
            return ThinkTankData._getLocalProfile();
        }
        return ThinkTankData.getProfile(user.id);
    },

    /**
     * Get chains for gameplay
     * @param {string} mode - 'calibration', 'consensus', 'speed'
     * @param {string|null} level
     * @returns {Promise<object[]>}
     */
    async getChains(mode, level = null) {
        return ThinkTankData.getChains(mode, level);
    },

    /**
     * Get random chain
     * @param {string} mode
     * @param {string|null} level
     * @returns {Promise<object|null>}
     */
    async getRandomChain(mode, level = null) {
        return ThinkTankData.getRandomChain(mode, level);
    },

    /**
     * Submit judgment and update user progress
     * @param {object} judgment
     * @returns {Promise<{success: boolean, unlockedLevel: string|null, error: object|null}>}
     */
    async submitJudgment(judgment) {
        const user = await this.getCurrentUser();
        if (!user) return { success: false, unlockedLevel: null, error: { message: 'Not logged in' } };

        // Submit judgment
        const result = await ThinkTankData.submitJudgment({
            ...judgment,
            userId: user.id
        });

        if (result.error) {
            return { success: false, unlockedLevel: null, error: result.error };
        }

        // Update points if calibration mode
        if (judgment.mode === 'calibration' && judgment.level) {
            const pointsPerLevel = { novice: 1, apprentice: 2, expert: 3, master: 4 };
            const points = pointsPerLevel[judgment.level] || 1;
            const pointsResult = await ThinkTankData.addPoints(user.id, points, judgment.level);
            return { success: true, unlockedLevel: pointsResult.unlockedLevel, error: null };
        }

        return { success: true, unlockedLevel: null, error: null };
    },

    /**
     * Get leaderboard
     * @param {number} limit
     * @returns {Promise<object[]>}
     */
    async getLeaderboard(limit = 100) {
        return ThinkTankData.getLeaderboard(limit);
    },

    /**
     * Update speed trial score
     * @param {number} score
     * @returns {Promise<{isNewBest: boolean}>}
     */
    async updateSpeedScore(score) {
        const user = await this.getCurrentUser();
        if (!user) return { isNewBest: false };

        return ThinkTankData.updateSpeedBest(user.id, score);
    },

    /**
     * Get consensus data for a chain
     * @param {string} chainId
     * @returns {Promise<object[]>}
     */
    async getConsensus(chainId) {
        return ThinkTankData.getConsensus(chainId);
    }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    ThinkTankApp.init();
});

// Export
window.ThinkTankApp = ThinkTankApp;
