/**
 * ThinkTank GWAP - Authentication Module
 * Handles user signup, login, logout, and session management
 */

const ThinkTankAuth = {
    /**
     * Sign up a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} username - Display username
     * @param {string} avatarUrl - Avatar image path
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signUp(email, password, username, avatarUrl = 'assets/images/Avatar1.png') {
        const client = ThinkTankConfig.getClient();
        if (!client) return { user: null, error: { message: 'Supabase not initialized' } };

        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    avatar_url: avatarUrl
                }
            }
        });

        if (error) return { user: null, error };

        // Also store in localStorage for offline/fallback
        if (data.user) {
            this._cacheUserLocally(data.user, username, avatarUrl);

            // Ensure profile exists in database (trigger may fail silently)
            await this._ensureProfileExists(data.user.id, username, avatarUrl);
        }

        return { user: data.user, error: null };
    },

    /**
     * Ensure profile exists in database (backup for trigger)
     * @private
     */
    async _ensureProfileExists(userId, username, avatarUrl) {
        const client = ThinkTankConfig.getClient();
        if (!client) return;

        // Check if profile already exists
        const { data: existing } = await client
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (existing) return; // Profile already exists

        // Create profile manually
        const { error } = await client
            .from('profiles')
            .insert({
                id: userId,
                username: username,
                avatar_url: avatarUrl,
                points: 0,
                highest_level: 'novice',
                unlocked_levels: ['novice'],
                levels_completed: { novice: 0, apprentice: 0, expert: 0, master: 0 },
                speed_best: 0
            });

        if (error) {
            console.error('Error creating profile:', error);
        } else {
            console.log('Profile created successfully for user:', userId);
        }
    },

    /**
     * Sign in an existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signIn(email, password) {
        const client = ThinkTankConfig.getClient();
        if (!client) return { user: null, error: { message: 'Supabase not initialized' } };

        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) return { user: null, error };

        // Fetch and cache profile
        if (data.user) {
            const profile = await ThinkTankData.getProfile(data.user.id);
            if (profile) {
                this._cacheUserLocally(data.user, profile.username, profile.avatar_url, profile);
            }
        }

        return { user: data.user, error: null };
    },

    /**
     * Sign out the current user
     * @returns {Promise<{error: object|null}>}
     */
    async signOut() {
        const client = ThinkTankConfig.getClient();
        if (!client) return { error: { message: 'Supabase not initialized' } };

        const { error } = await client.auth.signOut();

        // Clear local cache
        localStorage.removeItem('thinktank_user');
        localStorage.removeItem('thinktank_current_level');
        localStorage.removeItem('thinktank_last_result');

        return { error };
    },

    /**
     * Get current session
     * @returns {Promise<{session: object|null, user: object|null}>}
     */
    async getSession() {
        const client = ThinkTankConfig.getClient();
        if (!client) return { session: null, user: null };

        const { data: { session }, error } = await client.auth.getSession();

        if (error || !session) {
            return { session: null, user: null };
        }

        return { session, user: session.user };
    },

    /**
     * Get current user (from session or cache)
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        const { user } = await this.getSession();
        if (user) return user;

        // Fallback to localStorage for demo mode
        const cached = localStorage.getItem('thinktank_user');
        return cached ? JSON.parse(cached) : null;
    },

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
    },

    /**
     * Listen for auth state changes
     * @param {function} callback - Called with (event, session)
     * @returns {function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        const client = ThinkTankConfig.getClient();
        if (!client) return () => {};

        const { data: { subscription } } = client.auth.onAuthStateChange(callback);
        return () => subscription.unsubscribe();
    },

    /**
     * Cache user data locally for offline access
     * @private
     */
    _cacheUserLocally(user, username, avatarUrl, profile = null) {
        const userData = {
            id: user.id,
            email: user.email,
            username: username,
            avatar: avatarUrl,
            points: profile?.points || 0,
            highestLevel: profile?.highest_level || 'novice',
            unlockedLevels: profile?.unlocked_levels || ['novice'],
            levelsCompleted: profile?.levels_completed || {
                novice: 0,
                apprentice: 0,
                expert: 0,
                master: 0
            },
            speedBest: profile?.speed_best || 0,
            createdAt: user.created_at || new Date().toISOString()
        };
        localStorage.setItem('thinktank_user', JSON.stringify(userData));
    }
};

// Export
window.ThinkTankAuth = ThinkTankAuth;
