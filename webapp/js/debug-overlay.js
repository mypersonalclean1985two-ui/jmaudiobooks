// Debug Overlay System for IAP Debugging
// Activated by 5 taps on subscription modal title

(function () {
    'use strict';

    // Debug log storage (keep last 300 lines)
    const debugLogs = [];
    const MAX_LOGS = 300;
    let tapCount = 0;
    let tapTimeout = null;

    // Create debug overlay HTML
    function createDebugOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 10000; padding: 20px; overflow: hidden; flex-direction: column;';

        overlay.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="color: #10b981; margin: 0; font-family: monospace;">🐛 IAP Debug Console</h3>
                <div style="display: flex; gap: 8px;">
                    <button id="debug-clear-btn" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Clear</button>
                    <button id="debug-close-btn" style="background: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Close</button>
                </div>
            </div>
            <div id="debug-log-container" style="flex: 1; overflow-y: auto; background: #0a0a0a; border: 2px solid #10b981; border-radius: 12px; padding: 12px; font-family: 'Courier New', monospace; font-size: 0.75rem; line-height: 1.4; color: #e5e7eb;">
                <div id="debug-log-content"></div>
            </div>
            <div style="margin-top: 12px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid #10b981;">
                <p style="color: #10b981; font-size: 0.7rem; margin: 0; font-family: monospace;">
                    📱 Tap "Start Free Trial" to see IAP flow • Last 300 lines kept • Scroll to see all logs
                </p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Attach event listeners
        document.getElementById('debug-clear-btn').addEventListener('click', clearDebugLogs);
        document.getElementById('debug-close-btn').addEventListener('click', hideDebugOverlay);
    }

    // Add log entry to debug overlay
    function addDebugLog(type, args) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        const message = Array.from(args).map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        const logEntry = {
            timestamp,
            type,
            message
        };

        debugLogs.push(logEntry);

        // Keep only last 300 logs
        if (debugLogs.length > MAX_LOGS) {
            debugLogs.shift();
        }

        // Update UI if overlay is visible
        updateDebugUI();
    }

    // Update debug overlay UI
    function updateDebugUI() {
        const logContent = document.getElementById('debug-log-content');
        if (!logContent) return;

        const html = debugLogs.map(log => {
            let color = '#e5e7eb';
            let icon = '📝';

            if (log.type === 'error') {
                color = '#ef4444';
                icon = '❌';
            } else if (log.type === 'warn') {
                color = '#f59e0b';
                icon = '⚠️';
            } else if (log.message.includes('[IAP DEBUG]')) {
                color = '#10b981';
                icon = '🔍';
            }

            return `<div style="margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid ${color};">
                <span style="color: #6b7280; font-size: 0.7rem;">[${log.timestamp}]</span>
                <span style="color: ${color}; margin-left: 4px;">${icon}</span>
                <span style="color: ${color}; margin-left: 4px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(log.message)}</span>
            </div>`;
        }).join('');

        logContent.innerHTML = html || '<div style="color: #6b7280; text-align: center; padding: 20px;">No logs yet. Tap "Start Free Trial" to see IAP debug info.</div>';

        // Auto-scroll to bottom
        const container = document.getElementById('debug-log-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Clear debug logs
    function clearDebugLogs() {
        debugLogs.length = 0;
        updateDebugUI();
    }

    // Show debug overlay
    function showDebugOverlay() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            updateDebugUI();
        }
    }

    // Hide debug overlay
    function hideDebugOverlay() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Monkey-patch console methods
    function patchConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = function (...args) {
            addDebugLog('log', args);
            originalLog.apply(console, args);
        };

        console.warn = function (...args) {
            addDebugLog('warn', args);
            originalWarn.apply(console, args);
        };

        console.error = function (...args) {
            addDebugLog('error', args);
            originalError.apply(console, args);
        };

        console.log('[DEBUG OVERLAY] Console patched - all logs will be captured');
    }

    // Setup 5-tap activation on subscription modal title
    function setupTapActivation() {
        // Wait for DOM to be ready
        const checkInterval = setInterval(() => {
            const title = document.getElementById('subscription-modal-title') || document.querySelector('.modal-title');
            if (title) {
                clearInterval(checkInterval);

                title.addEventListener('click', function () {
                    tapCount++;

                    if (tapTimeout) {
                        clearTimeout(tapTimeout);
                    }

                    if (tapCount >= 5) {
                        console.log('[DEBUG OVERLAY] 5 taps detected - opening debug console');
                        showDebugOverlay();
                        tapCount = 0;
                    } else {
                        tapTimeout = setTimeout(() => {
                            tapCount = 0;
                        }, 2000);
                    }
                });

                console.log('[DEBUG OVERLAY] Tap activation ready - tap paywall title 5 times to open debug console');
            }
        }, 500);

        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    // Initialize debug overlay system
    function init() {
        // Create overlay HTML
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createDebugOverlay);
        } else {
            createDebugOverlay();
        }

        // Patch console
        patchConsole();

        // Setup tap activation
        setupTapActivation();

        console.log('[DEBUG OVERLAY] Debug overlay system initialized');
        console.log('[DEBUG OVERLAY] Tap the subscription modal title 5 times to open debug console');
    }

    // Start initialization
    init();

    // Expose functions globally for manual control
    window.debugOverlay = {
        show: showDebugOverlay,
        hide: hideDebugOverlay,
        clear: clearDebugLogs,
        logs: debugLogs
    };
})();
