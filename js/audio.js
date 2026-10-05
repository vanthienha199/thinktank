/**
 * ThinkTank GWAP - Audio Manager
 * Handles background music rotation and sound effects
 * Music persists across page navigation using localStorage
 */

const ThinkTankAudio = {
    // Audio elements
    musicPlayer: null,
    currentTrack: 0,
    musicTracks: [
        'assets/sounds/game-music1.mp3',
        'assets/sounds/game-music2.mp3',
        'assets/sounds/game-music3.mp3'
    ],

    // Sound effects cache
    sounds: {},

    // Click sound pool for instant playback (no delay)
    clickPool: [],
    clickPoolSize: 5,
    clickPoolIndex: 0,

    // Volume settings (music quiet, effects loud)
    musicVolume: 0.15,      // 15% - subtle background
    effectsVolume: 0.6,     // 60% - noticeable effects

    // State
    initialized: false,
    musicEnabled: true,
    effectsEnabled: true,
    musicStarted: false,
    savedPosition: 0,       // Saved playback position for resuming
    wasPlaying: false,      // Was music playing before page navigation?
    positionSaveInterval: null,

    /**
     * Initialize the audio system
     */
    init() {
        if (this.initialized) return;

        // Load preferences from localStorage
        const prefs = localStorage.getItem('thinktank_audio');
        if (prefs) {
            const parsed = JSON.parse(prefs);
            this.musicEnabled = parsed.musicEnabled !== false;
            this.effectsEnabled = parsed.effectsEnabled !== false;
            this.currentTrack = parsed.currentTrack || 0;
            this.savedPosition = parsed.savedPosition || 0;
            this.wasPlaying = parsed.wasPlaying || false;
        }

        // Create music player
        this.musicPlayer = new Audio();
        this.musicPlayer.volume = this.musicVolume;
        this.musicPlayer.addEventListener('ended', () => this.playNextTrack());

        // When music is ready to play, seek to saved position
        this.musicPlayer.addEventListener('loadedmetadata', () => {
            if (this.savedPosition > 0 && this.savedPosition < this.musicPlayer.duration) {
                this.musicPlayer.currentTime = this.savedPosition;
                this.savedPosition = 0; // Clear after using
            }
        });

        // Preload sound effects
        this.preloadSounds();

        // Save position periodically (every 500ms)
        this.positionSaveInterval = setInterval(() => this.savePlaybackPosition(), 500);

        // Save position before page unload
        window.addEventListener('beforeunload', () => this.savePlaybackPosition());

        this.initialized = true;
        console.log('ThinkTank Audio initialized');

        // If music was playing before navigation, try to auto-resume
        if (this.wasPlaying && this.musicEnabled) {
            this.resumeFromSaved();
        }
    },

    /**
     * Save current playback position to localStorage
     */
    savePlaybackPosition() {
        if (this.musicPlayer && this.musicStarted && !this.musicPlayer.paused) {
            const prefs = JSON.parse(localStorage.getItem('thinktank_audio') || '{}');
            prefs.savedPosition = this.musicPlayer.currentTime;
            prefs.wasPlaying = true;
            prefs.currentTrack = this.currentTrack;
            localStorage.setItem('thinktank_audio', JSON.stringify(prefs));
        }
    },

    /**
     * Resume music from saved position (called on page load)
     */
    resumeFromSaved() {
        if (!this.musicEnabled) return;

        this.musicPlayer.src = this.musicTracks[this.currentTrack];
        // Position will be set in loadedmetadata event
        this.musicPlayer.play().then(() => {
            // Only mark as started if play succeeded
            this.musicStarted = true;
            this.wasPlaying = true;
            console.log('Music auto-resumed from position:', this.musicPlayer.currentTime);
        }).catch(err => {
            // Browser blocked autoplay - will start on user interaction
            // Keep musicStarted = false so click handler will work
            this.musicStarted = false;
            console.log('Music autoplay blocked, will resume on interaction');
        });
    },

    /**
     * Preload all sound effects for instant playback
     */
    preloadSounds() {
        const soundFiles = {
            click: 'assets/sounds/click-sound.mp3',
            finish: 'assets/sounds/finish-level.mp3',
            alarm: 'assets/sounds/alarm-clock-when-speed-mode-ends.mp3',
            tick: 'assets/sounds/clock-ticking-8-seconds-only.mp3'
        };

        for (const [name, src] of Object.entries(soundFiles)) {
            const audio = new Audio(src);
            audio.volume = this.effectsVolume;
            audio.preload = 'auto';
            this.sounds[name] = audio;
        }

        // Create click sound pool for instant playback (zero delay)
        for (let i = 0; i < this.clickPoolSize; i++) {
            const clickAudio = new Audio('assets/sounds/click-sound.mp3');
            clickAudio.volume = this.effectsVolume;
            clickAudio.preload = 'auto';
            clickAudio.load(); // Force load into memory
            this.clickPool.push(clickAudio);
        }
    },

    /**
     * Start background music (call on first user interaction)
     */
    startMusic() {
        if (!this.musicEnabled) return;

        // If already playing, don't restart
        if (this.musicPlayer && !this.musicPlayer.paused && this.musicPlayer.currentTime > 0) {
            return;
        }

        // Check if we should resume from saved position
        const prefs = JSON.parse(localStorage.getItem('thinktank_audio') || '{}');
        if (prefs.wasPlaying && prefs.savedPosition > 0) {
            this.savedPosition = prefs.savedPosition;
            this.currentTrack = prefs.currentTrack || 0;
        }

        this.musicPlayer.src = this.musicTracks[this.currentTrack];
        this.musicPlayer.play().then(() => {
            this.musicStarted = true;
            this.wasPlaying = true;
            console.log('Music started, track:', this.currentTrack, 'position:', this.musicPlayer.currentTime);
        }).catch(err => {
            // Browser may block autoplay - that's ok, will start on next interaction
            console.log('Music autoplay blocked, will start on interaction');
        });
    },

    /**
     * Play next track in rotation
     */
    playNextTrack() {
        if (!this.musicEnabled) return;

        this.currentTrack = (this.currentTrack + 1) % this.musicTracks.length;
        this.savedPosition = 0; // Reset position for new track

        this.musicPlayer.src = this.musicTracks[this.currentTrack];
        this.musicPlayer.play().catch(() => {});
        this.savePreferences();
    },

    /**
     * Toggle music on/off
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;

        if (this.musicEnabled) {
            this.wasPlaying = true;
            this.startMusic();
        } else {
            this.musicPlayer.pause();
            this.musicStarted = false;
            this.wasPlaying = false;
        }

        this.savePreferences();
        return this.musicEnabled;
    },

    /**
     * Toggle sound effects on/off
     */
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        this.savePreferences();
        return this.effectsEnabled;
    },

    /**
     * Play a sound effect
     * @param {string} name - Sound name: 'click', 'finish', 'alarm', 'tick'
     */
    play(name) {
        if (!this.effectsEnabled) return;
        if (!this.sounds[name]) {
            console.warn('Sound not found:', name);
            return;
        }

        // Clone the audio to allow overlapping sounds
        const sound = this.sounds[name].cloneNode();
        sound.volume = this.effectsVolume;
        sound.play().catch(() => {});
    },

    /**
     * Play click sound (convenience method) - uses pool for instant playback
     */
    click() {
        if (!this.effectsEnabled) return;
        if (this.clickPool.length === 0) {
            this.play('click');
            return;
        }

        // Use pooled audio for instant playback (no cloning delay)
        const audio = this.clickPool[this.clickPoolIndex];
        audio.currentTime = 0; // Reset to start
        audio.play().catch(() => {});

        // Cycle through pool
        this.clickPoolIndex = (this.clickPoolIndex + 1) % this.clickPoolSize;
    },

    /**
     * Play level finish sound
     */
    finish() {
        this.play('finish');
    },

    /**
     * Play alarm sound (speed mode end)
     */
    alarm() {
        this.play('alarm');
    },

    /**
     * Start ticking sound (returns audio element to stop later)
     */
    startTicking() {
        if (!this.effectsEnabled) return null;

        const tick = this.sounds.tick.cloneNode();
        tick.volume = this.effectsVolume * 0.7; // Slightly quieter for sustained sound
        tick.play().catch(() => {});
        return tick;
    },

    /**
     * Stop a specific audio element
     */
    stop(audioElement) {
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
    },

    /**
     * Pause background music
     */
    pauseMusic() {
        if (this.musicPlayer) {
            this.musicPlayer.pause();
        }
    },

    /**
     * Resume background music
     */
    resumeMusic() {
        if (this.musicEnabled && this.musicPlayer) {
            this.musicPlayer.play().catch(() => {});
        }
    },

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        const currentPosition = (this.musicPlayer && !this.musicPlayer.paused)
            ? this.musicPlayer.currentTime
            : this.savedPosition;

        localStorage.setItem('thinktank_audio', JSON.stringify({
            musicEnabled: this.musicEnabled,
            effectsEnabled: this.effectsEnabled,
            currentTrack: this.currentTrack,
            savedPosition: currentPosition,
            wasPlaying: this.wasPlaying
        }));
    },

    /**
     * Get current audio state
     */
    getState() {
        return {
            musicEnabled: this.musicEnabled,
            effectsEnabled: this.effectsEnabled,
            currentTrack: this.currentTrack + 1 // 1-indexed for display
        };
    }
};

// Auto-initialize when script loads
ThinkTankAudio.init();

// Start/resume music on first user interaction (browser autoplay policy)
// Keep listener active until music actually starts (fixes back button issue)
function startMusicOnInteraction() {
    // Check if music is actually playing
    const isActuallyPlaying = ThinkTankAudio.musicPlayer &&
                               !ThinkTankAudio.musicPlayer.paused &&
                               ThinkTankAudio.musicPlayer.currentTime > 0;

    if (isActuallyPlaying) {
        // Music is playing, remove listener
        document.removeEventListener('click', startMusicOnInteraction);
        return;
    }

    if (ThinkTankAudio.musicEnabled) {
        // Try to start music, remove listener only after successful play
        ThinkTankAudio.musicPlayer.play().then(() => {
            ThinkTankAudio.musicStarted = true;
            ThinkTankAudio.wasPlaying = true;
            document.removeEventListener('click', startMusicOnInteraction);
        }).catch(() => {
            // Still blocked, keep listener for next click
        });

        // Also try the full startMusic for saved position
        if (!ThinkTankAudio.musicPlayer.src || ThinkTankAudio.musicPlayer.src === '') {
            ThinkTankAudio.startMusic();
        }
    }
}
document.addEventListener('click', startMusicOnInteraction);

// Export
window.ThinkTankAudio = ThinkTankAudio;
