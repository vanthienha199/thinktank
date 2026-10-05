/**
 * ThinkTank GWAP - Data Service Module
 * Handles all data operations: profiles, chains, judgments, consensus, leaderboard
 */

const ThinkTankData = {
    // ============================================
    // PROFILES
    // ============================================

    /**
     * Get a user profile by ID
     * @param {string} userId - User UUID
     * @returns {Promise<object|null>}
     */
    async getProfile(userId) {
        const client = ThinkTankConfig.getClient();
        if (!client) return this._getLocalProfile();

        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return this._getLocalProfile();
        }

        return data;
    },

    /**
     * Update user profile
     * @param {string} userId - User UUID
     * @param {object} updates - Fields to update
     * @returns {Promise<{data: object|null, error: object|null}>}
     */
    async updateProfile(userId, updates) {
        // Always update local profile first (ensures progress is saved)
        this._updateLocalProfile(updates);

        const client = ThinkTankConfig.getClient();
        if (!client) {
            return { data: updates, error: null };
        }

        // Check if userId is a valid UUID (demo users have IDs like 'demo_123456')
        const isValidUUID = userId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        if (!isValidUUID) {
            console.log('Demo user, skipping Supabase profile update');
            return { data: updates, error: null };
        }

        const { data, error } = await client
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile in Supabase:', error);
            // Local profile already updated, so return success
            return { data: updates, error: null };
        }

        if (data) {
            this._updateLocalProfile(data);
        }

        return { data: data || updates, error: null };
    },

    /**
     * Add points to user profile
     * @param {string} userId - User UUID
     * @param {number} points - Points to add
     * @param {string} level - Level to update completion for
     * @returns {Promise<{data: object|null, error: object|null, unlockedLevel: string|null}>}
     */
    async addPoints(userId, points, level) {
        const client = ThinkTankConfig.getClient();

        // Get current profile
        const profile = await this.getProfile(userId);
        if (!profile) return { data: null, error: { message: 'Profile not found' }, unlockedLevel: null };

        // Calculate new values
        const newPoints = (profile.points || 0) + points;
        const levelsCompleted = { ...profile.levels_completed };
        levelsCompleted[level] = (levelsCompleted[level] || 0) + 1;

        // Check for level unlock
        const levelOrder = ['novice', 'apprentice', 'expert', 'master'];
        const currentIndex = levelOrder.indexOf(level);
        let unlockedLevel = null;
        let unlockedLevels = [...(profile.unlocked_levels || ['novice'])];
        let highestLevel = profile.highest_level;

        if (currentIndex < levelOrder.length - 1 && levelsCompleted[level] >= 3) {
            const nextLevel = levelOrder[currentIndex + 1];
            if (!unlockedLevels.includes(nextLevel)) {
                unlockedLevels.push(nextLevel);
                highestLevel = nextLevel;
                unlockedLevel = nextLevel;
            }
        }

        const updates = {
            points: newPoints,
            levels_completed: levelsCompleted,
            unlocked_levels: unlockedLevels,
            highest_level: highestLevel
        };

        const result = await this.updateProfile(userId, updates);
        return { ...result, unlockedLevel };
    },

    // ============================================
    // CHAINS
    // ============================================

    /**
     * Get chains by mode and optionally level
     * @param {string} mode - 'calibration', 'consensus', or 'speed'
     * @param {string|null} level - 'novice', 'apprentice', 'expert', 'master'
     * @returns {Promise<object[]>}
     */
    async getChains(mode, level = null) {
        const client = ThinkTankConfig.getClient();
        if (!client) return this._getLocalChains(mode, level);

        let query = client
            .from('chains')
            .select('*')
            .eq('mode', mode)
            .eq('active', true);

        if (level) {
            query = query.eq('level', level);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching chains:', error);
            return this._getLocalChains(mode, level);
        }

        return data || [];
    },

    /**
     * Get a random chain for gameplay (excludes previously judged chains)
     * @param {string} mode - 'calibration', 'consensus', or 'speed'
     * @param {string|null} level - Level for calibration mode
     * @returns {Promise<object|null>}
     */
    async getRandomChain(mode, level = null) {
        const chains = await this.getChains(mode, level);
        if (chains.length === 0) return null;

        // Get list of already-judged chain IDs for this mode
        const judgedKey = `thinktank_judged_${mode}${level ? '_' + level : ''}`;
        const judgedChains = JSON.parse(localStorage.getItem(judgedKey) || '[]');

        // Filter out already-judged chains
        const availableChains = chains.filter(c => !judgedChains.includes(c.id));

        // If all chains have been judged, reset and start over
        if (availableChains.length === 0) {
            localStorage.removeItem(judgedKey);
            return chains[Math.floor(Math.random() * chains.length)];
        }

        return availableChains[Math.floor(Math.random() * availableChains.length)];
    },

    /**
     * Mark a chain as judged (for duplicate prevention)
     * @param {string} chainId - Chain UUID
     * @param {string} mode - Game mode
     * @param {string|null} level - Level for calibration mode
     */
    markChainJudged(chainId, mode, level = null) {
        if (!chainId) return;
        const judgedKey = `thinktank_judged_${mode}${level ? '_' + level : ''}`;
        const judgedChains = JSON.parse(localStorage.getItem(judgedKey) || '[]');
        if (!judgedChains.includes(chainId)) {
            judgedChains.push(chainId);
            localStorage.setItem(judgedKey, JSON.stringify(judgedChains));
        }
    },

    // ============================================
    // JUDGMENTS
    // ============================================

    /**
     * Submit a judgment
     * @param {object} judgment - Judgment data
     * @returns {Promise<{data: object|null, error: object|null}>}
     */
    async submitJudgment(judgment) {
        const client = ThinkTankConfig.getClient();
        if (!client) {
            // Store locally for demo
            this._storeLocalJudgment(judgment);
            this.markChainJudged(judgment.chainId, judgment.mode, judgment.level);
            return { data: judgment, error: null };
        }

        // Check if chainId is a valid UUID (fallback chains have IDs like 'n1', 'a1')
        const isValidUUID = judgment.chainId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(judgment.chainId);

        if (!isValidUUID) {
            // Fallback chain - store locally but don't insert to DB (would fail FK constraint)
            console.log('Fallback chain used, storing judgment locally');
            this._storeLocalJudgment(judgment);
            this.markChainJudged(judgment.chainId, judgment.mode, judgment.level);
            return { data: judgment, error: null };
        }

        const { data, error } = await client
            .from('judgments')
            .insert({
                user_id: judgment.userId,
                chain_id: judgment.chainId,
                flagged_steps: judgment.flaggedSteps,
                total_steps: judgment.totalSteps,
                time_taken_ms: judgment.timeTakenMs || null,
                mode: judgment.mode,
                level: judgment.level || null,
                session_id: judgment.sessionId || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error submitting judgment:', error);
            // Still store locally as backup
            this._storeLocalJudgment(judgment);
        }

        // Mark chain as judged for duplicate prevention
        this.markChainJudged(judgment.chainId, judgment.mode, judgment.level);

        return { data, error: null }; // Don't return error - we want progress to continue
    },

    /**
     * Get user's judgment history
     * @param {string} userId - User UUID
     * @param {number} limit - Max results
     * @returns {Promise<object[]>}
     */
    async getUserJudgments(userId, limit = 50) {
        const client = ThinkTankConfig.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('judgments')
            .select('*, chains(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching judgments:', error);
            return [];
        }

        return data || [];
    },

    // ============================================
    // CONSENSUS
    // ============================================

    /**
     * Get consensus data for a chain
     * @param {string} chainId - Chain UUID
     * @returns {Promise<object[]>}
     */
    async getConsensus(chainId) {
        const client = ThinkTankConfig.getClient();
        if (!client) return this._getLocalConsensus(chainId);

        const { data, error } = await client
            .from('consensus_cache')
            .select('*')
            .eq('chain_id', chainId)
            .order('step_index', { ascending: true });

        if (error) {
            console.error('Error fetching consensus:', error);
            return this._getLocalConsensus(chainId);
        }

        return data || [];
    },

    // ============================================
    // LEADERBOARD
    // ============================================

    /**
     * Get top players
     * @param {number} limit - Max results
     * @returns {Promise<object[]>}
     */
    async getLeaderboard(limit = 100) {
        const client = ThinkTankConfig.getClient();
        if (!client) {
            console.log('No Supabase client, using local leaderboard');
            return this._getLocalLeaderboard();
        }

        console.log('Fetching leaderboard from Supabase...');
        const { data, error } = await client
            .from('profiles')
            .select('id, username, avatar_url, points, highest_level')
            .order('points', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return this._getLocalLeaderboard();
        }

        console.log('Supabase returned', data ? data.length : 0, 'profiles');
        let leaderboard = data || [];

        // Include current user from localStorage if they're not in Supabase leaderboard
        const localProfile = this._getLocalProfile();
        if (localProfile && localProfile.username) {
            const userInLeaderboard = leaderboard.some(p => p.username === localProfile.username);
            if (!userInLeaderboard) {
                // Add local user to leaderboard
                leaderboard.push({
                    id: localProfile.id,
                    username: localProfile.username,
                    avatar_url: localProfile.avatar_url,
                    points: localProfile.points || 0,
                    highest_level: localProfile.highest_level || 'novice'
                });
                // Re-sort by points
                leaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));
            }
        }

        return leaderboard;
    },

    /**
     * Get user's rank
     * @param {string} userId - User UUID
     * @returns {Promise<number|null>}
     */
    async getUserRank(userId) {
        const client = ThinkTankConfig.getClient();
        if (!client) return null;

        const profile = await this.getProfile(userId);
        if (!profile) return null;

        const { count, error } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('points', profile.points);

        if (error) return null;
        return (count || 0) + 1;
    },

    // ============================================
    // SPEED TRIAL
    // ============================================

    /**
     * Update speed trial best score
     * @param {string} userId - User UUID
     * @param {number} score - Chains completed
     * @returns {Promise<{isNewBest: boolean, error: object|null}>}
     */
    async updateSpeedBest(userId, score) {
        const profile = await this.getProfile(userId);
        if (!profile) return { isNewBest: false, error: { message: 'Profile not found' } };

        if (score > (profile.speed_best || 0)) {
            const result = await this.updateProfile(userId, { speed_best: score });
            // Also update localStorage
            localStorage.setItem('thinktank_speed_best', score.toString());
            return { isNewBest: true, error: result.error };
        }

        return { isNewBest: false, error: null };
    },

    // ============================================
    // LOCAL FALLBACKS (for demo mode)
    // ============================================

    _getLocalProfile() {
        const cached = localStorage.getItem('thinktank_user');
        if (!cached) return null;
        const user = JSON.parse(cached);
        return {
            id: user.id,
            username: user.username,
            avatar_url: user.avatar,
            points: user.points,
            highest_level: user.highestLevel,
            unlocked_levels: user.unlockedLevels,
            levels_completed: user.levelsCompleted,
            speed_best: user.speedBest || parseInt(localStorage.getItem('thinktank_speed_best') || '0')
        };
    },

    _updateLocalProfile(updates) {
        const cached = localStorage.getItem('thinktank_user');
        if (!cached) return;
        const user = JSON.parse(cached);

        if (updates.points !== undefined) user.points = updates.points;
        if (updates.highest_level !== undefined) user.highestLevel = updates.highest_level;
        if (updates.unlocked_levels !== undefined) user.unlockedLevels = updates.unlocked_levels;
        if (updates.levels_completed !== undefined) user.levelsCompleted = updates.levels_completed;
        if (updates.speed_best !== undefined) user.speedBest = updates.speed_best;

        localStorage.setItem('thinktank_user', JSON.stringify(user));
    },

    _getLocalChains(mode, level) {
        // Return hardcoded chains from original HTML files
        // This maintains backwards compatibility with demo mode
        console.warn('Using local fallback chains - Supabase not configured');
        return [];
    },

    _getLocalConsensus(chainId) {
        // Return empty - consensus requires backend
        return [];
    },

    _getLocalLeaderboard() {
        // Return demo leaderboard with current user
        const user = this._getLocalProfile();
        const demoPlayers = [
            { username: 'NeuralNinja', points: 892, avatar_url: 'assets/images/Avatar3.png', highest_level: 'master' },
            { username: 'LogicLord', points: 845, avatar_url: 'assets/images/Avatar5.png', highest_level: 'master' },
            { username: 'ReasonRider', points: 798, avatar_url: 'assets/images/Avatar2.png', highest_level: 'expert' },
            { username: 'ThinkTitan', points: 756, avatar_url: 'assets/images/Avatar7.png', highest_level: 'expert' },
            { username: 'MindMaster', points: 701, avatar_url: 'assets/images/Avatar4.png', highest_level: 'expert' }
        ];

        if (user) {
            demoPlayers.push({
                username: user.username,
                points: user.points,
                avatar_url: user.avatar_url,
                highest_level: user.highest_level,
                isCurrentUser: true
            });
        }

        return demoPlayers.sort((a, b) => b.points - a.points);
    },

    _storeLocalJudgment(judgment) {
        // Store in localStorage for demo analytics
        const judgments = JSON.parse(localStorage.getItem('thinktank_judgments') || '[]');
        judgments.push({
            ...judgment,
            created_at: new Date().toISOString()
        });
        // Keep only last 100
        if (judgments.length > 100) judgments.shift();
        localStorage.setItem('thinktank_judgments', JSON.stringify(judgments));
    }
};

// Export
window.ThinkTankData = ThinkTankData;
