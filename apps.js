/**
 * TimeVault - Premium Time Tracking & Payroll PWA
 * AI-Powered Time Card with Local Storage & Cross-Device Sync
 */

// ============================================
// TIMEVAULT APP STATE & CONFIGURATION
// ============================================

const TimeVault = {
	// State
	isWorking: false,
	sessionStart: null,
	timerInterval: null,
	settings: {
		hourlyRate: 25.00,
		overtimeMultiplier: 1.5,
		weeklyTarget: 40,
		overtimeThreshold: 40,
		currencySymbol: '$',
		timeFormat: '12'
	},
	syncData: {
		email: null,
		pin: null,
		lastSync: null
	},
	timeEntries: [],

	// AI Memory
	aiMemory: {
		conversationHistory: [],
		lastInteraction: null,
		userPreferences: {}
	},

	// Enhanced AI Configuration
	aiConfig: {
		// Ollama Settings - LT PC (192.168.1.177)
		ollamaLocalUrl: 'http://localhost:11434',
		ollamaRemoteUrl: 'http://192.168.1.177:11434',
		ollamaModel: 'llama3',
		ollamaEnabled: true,
		connectionStatus: 'disconnected', // 'local', 'remote', 'disconnected'

		// Voice Recognition
		voiceEnabled: true,
		voiceLanguage: 'en-US',
		isListening: false,

		// Smart Suggestions
		suggestionsEnabled: true,
		lastSuggestionUpdate: null,

		// Fallback mode (local AI only)
		useLocalFallback: true
	},

	// Voice Recognition Instance
	voiceRecognition: null,


	// Initialize Application
	init() {
		console.log('TimeVault: Initializing...');
		this.checkBrowserCapabilities();
		this.loadFromStorage();
		this.initClock();
		this.initEventListeners();
		this.initParticles();
		this.initChart();
		this.updateDashboard();
		this.checkActiveSession();
		this.initAIEngine(); // Initialize enhanced AI
		this.hideSplashScreen(); // Hide splash after initialization
		console.log('TimeVault: Ready');
	},

	// ============================================
	// BROWSER CAPABILITIES CHECK
	// ============================================

	checkBrowserCapabilities() {
		const caps = {
			localStorage: 'localStorage' in window,
			serviceWorker: 'serviceWorker' in navigator,
			notification: 'Notification' in window,
			speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
		};

		if (!caps.localStorage) {
			alert('Critical Error: LocalStorage is not available. Your data will not be saved.');
		}

		if (!caps.serviceWorker) {
			console.warn('TimeVault: Service Workers not supported. Offline mode unavailable.');
		}

		if (!caps.notification) {
			console.warn('TimeVault: Notifications not supported.');
		}

		this.browserCaps = caps;
		console.log('TimeVault: Browser Capabilities:', caps);
	},

	// ============================================
	// SPLASH SCREEN & PARTICLES
	// ============================================

	hideSplashScreen() {
		setTimeout(() => {
			const splash = document.getElementById('splash-screen');
			const appContainer = document.getElementById('app-container');

			if (splash) {
				splash.classList.add('hidden');
				setTimeout(() => {
					splash.style.display = 'none';
				}, 800);
			}

			if (appContainer) {
				appContainer.classList.add('visible');
			}
		}, 1500); // Show splash for 1.5 seconds
	},

	initParticles() {
		if (typeof particlesJS !== 'undefined') {
			particlesJS('particles-js', {
				particles: {
					number: { value: 80, density: { enable: true, value_area: 800 } },
					color: { value: '#3d7eff' },
					shape: { type: 'circle' },
					opacity: { value: 0.5, random: false },
					size: { value: 3, random: true },
					line_linked: {
						enable: true,
						distance: 150,
						color: '#3d7eff',
						opacity: 0.4,
						width: 1
					},
					move: {
						enable: true,
						speed: 2,
						direction: 'none',
						random: false,
						straight: false,
						out_mode: 'out',
						bounce: false
					}
				},
				interactivity: {
					detect_on: 'canvas',
					events: {
						onhover: { enable: true, mode: 'repulse' },
						onclick: { enable: true, mode: 'push' },
						resize: true
					}
				},
				retina_detect: true
			});
		}
	},

	// ============================================
	// EVENT LISTENERS
	// ============================================

	initEventListeners() {
		// Clock In/Out Buttons
		const clockInBtn = document.getElementById('clock-in-btn');
		const clockOutBtn = document.getElementById('clock-out-btn');

		if (clockInBtn) {
			clockInBtn.addEventListener('click', () => this.clockIn());
		}
		if (clockOutBtn) {
			clockOutBtn.addEventListener('click', () => this.clockOut());
		}

		// Navigation
		const navItems = document.querySelectorAll('.nav-list-item');
		navItems.forEach(item => {
			item.addEventListener('click', (e) => {
				e.preventDefault();
				const view = item.getAttribute('data-view');
				this.switchView(view);

				// Update active state
				navItems.forEach(nav => nav.classList.remove('active'));
				item.classList.add('active');
			});
		});

		// Sidebar Toggle
		const sidebarToggle = document.getElementById('sidebar-toggle');
		if (sidebarToggle) {
			sidebarToggle.addEventListener('click', () => {
				const sidebar = document.querySelector('.app-left');
				sidebar.classList.toggle('collapsed');
			});
		}

		// Mobile Menu
		const menuButton = document.querySelector('.menu-button');
		const closeMenu = document.querySelector('.close-menu');
		const appLeft = document.querySelector('.app-left');

		if (menuButton) {
			menuButton.addEventListener('click', () => {
				appLeft.classList.add('show');
			});
		}
		if (closeMenu) {
			closeMenu.addEventListener('click', () => {
				appLeft.classList.remove('show');
			});
		}

		// AI Assistant Toggle
		const aiToggleBtn = document.getElementById('ai-toggle-btn');
		const appRight = document.querySelector('.app-right');
		const closeRight = document.querySelector('.close-right');

		if (aiToggleBtn) {
			aiToggleBtn.addEventListener('click', () => {
				appRight.classList.toggle('show');
			});
		}
		if (closeRight) {
			closeRight.addEventListener('click', () => {
				appRight.classList.remove('show');
			});
		}

		// AI Chat Input
		const aiInput = document.getElementById('ai-input');
		const aiSendBtn = document.getElementById('ai-send-btn');

		const sendAIMessage = async () => {
			const message = aiInput.value.trim();
			if (!message) return;

			this.addAIMessage('user', message);
			aiInput.value = '';

			const response = await this.processAIMessageEnhanced(message);
			this.addAIMessage('ai', response);
		};

		if (aiSendBtn) {
			aiSendBtn.addEventListener('click', sendAIMessage);
		}
		if (aiInput) {
			aiInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') sendAIMessage();
			});
		}

		// Voice Input
		const voiceBtn = document.getElementById('voice-input-btn');
		if (voiceBtn) {
			voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
		}

		// Settings Save
		const saveSettingsBtn = document.getElementById('save-settings-btn');
		if (saveSettingsBtn) {
			saveSettingsBtn.addEventListener('click', () => this.saveSettings());
		}

		// Data Management
		const exportDataBtn = document.getElementById('settings-export-data');
		const importDataBtn = document.getElementById('settings-import-data');
		const clearDataBtn = document.getElementById('settings-clear-data');

		if (exportDataBtn) {
			exportDataBtn.addEventListener('click', () => this.exportData());
		}
		if (importDataBtn) {
			importDataBtn.addEventListener('click', () => this.importData());
		}
		if (clearDataBtn) {
			clearDataBtn.addEventListener('click', () => {
				if (confirm('Are you sure you want to delete ALL your TimeVault data? This cannot be undone.')) {
					localStorage.removeItem('timevault_data');
					location.reload();
				}
			});
		}

		// Add Entry Button
		const addEntryBtn = document.getElementById('add-entry-btn');
		if (addEntryBtn) {
			addEntryBtn.addEventListener('click', () => this.showAddEntryModal());
		}

		// Export Buttons
		const exportPayrollBtn = document.getElementById('export-payroll-btn');
		const exportReportBtn = document.getElementById('export-report-btn');

		if (exportPayrollBtn) {
			exportPayrollBtn.addEventListener('click', () => this.exportPayrollPDF());
		}
		if (exportReportBtn) {
			exportReportBtn.addEventListener('click', () => this.exportReportCSV());
		}

		// Timecard Filter
		const timecardFilter = document.getElementById('timecard-filter');
		if (timecardFilter) {
			timecardFilter.addEventListener('change', () => this.filterTimecard());
		}

		// Payroll Period
		const payrollPeriod = document.getElementById('payroll-period-select');
		if (payrollPeriod) {
			payrollPeriod.addEventListener('change', () => this.updatePayrollView());
		}

		// Report Date Filter
		const filterReportBtn = document.getElementById('filter-report-btn');
		if (filterReportBtn) {
			filterReportBtn.addEventListener('click', () => this.filterReport());
		}

		console.log('TimeVault: Event listeners initialized');
	},

	switchView(viewName) {
		// Hide all views
		document.querySelectorAll('.view-content').forEach(view => {
			view.classList.remove('active');
		});

		// Show selected view
		const targetView = document.getElementById(`view-${viewName}`);
		if (targetView) {
			targetView.classList.add('active');
		}

		// Update specific view data
		if (viewName === 'timecard') {
			this.renderTimecard();
		} else if (viewName === 'payroll') {
			this.renderPayroll();
		} else if (viewName === 'reports') {
			this.renderReports();
		} else if (viewName === 'settings') {
			this.renderSettings();
		}
	},

	// ============================================
	// LOCAL STORAGE MANAGEMENT
	// ============================================

	saveToStorage() {
		const data = {
			settings: this.settings,
			syncData: this.syncData,
			timeEntries: this.timeEntries,
			aiMemory: this.aiMemory,
			aiConfig: this.aiConfig, // Save AI config
			isWorking: this.isWorking,

			sessionStart: this.sessionStart
		};
		localStorage.setItem('timevault_data', JSON.stringify(data));
		console.log('TimeVault: Data saved to localStorage');
	},

	loadFromStorage() {
		const stored = localStorage.getItem('timevault_data');
		if (stored) {
			try {
				const data = JSON.parse(stored);
				this.settings = { ...this.settings, ...data.settings };
				this.syncData = { ...this.syncData, ...data.syncData };
				this.timeEntries = data.timeEntries || [];
				this.aiMemory = { ...this.aiMemory, ...data.aiMemory };
				this.aiConfig = { ...this.aiConfig, ...data.aiConfig }; // Restore AI config
				this.isWorking = data.isWorking || false;
				this.sessionStart = data.sessionStart || null;

				// Update UI with loaded settings
				this.updateSettingsUI();
				console.log('TimeVault: Data loaded from localStorage');
			} catch (e) {
				console.error('TimeVault: Error loading data', e);
			}
		}
	},


	updateSettingsUI() {
		const hourlyRate = document.getElementById('hourly-rate');
		const overtimeMult = document.getElementById('overtime-multiplier');
		const weeklyTarget = document.getElementById('weekly-target');
		const syncEmail = document.getElementById('sync-email');
		const syncPin = document.getElementById('sync-pin');

		if (hourlyRate) hourlyRate.value = this.settings.hourlyRate;
		if (overtimeMult) overtimeMult.value = this.settings.overtimeMultiplier;
		if (weeklyTarget) weeklyTarget.value = this.settings.weeklyTarget;
		if (syncEmail && this.syncData.email) syncEmail.value = this.syncData.email;
		if (syncPin && this.syncData.pin) syncPin.value = this.syncData.pin;

		// AI Settings
		const ollamaLocalUrl = document.getElementById('ollama-local-url');
		const ollamaRemoteUrl = document.getElementById('ollama-remote-url');
		const ollamaModel = document.getElementById('ollama-model');
		const ollamaEnabled = document.getElementById('ollama-enabled');

		if (ollamaLocalUrl) ollamaLocalUrl.value = this.aiConfig.ollamaLocalUrl;
		if (ollamaRemoteUrl) ollamaRemoteUrl.value = this.aiConfig.ollamaRemoteUrl;
		if (ollamaModel) ollamaModel.value = this.aiConfig.ollamaModel;
		if (ollamaEnabled) ollamaEnabled.checked = this.aiConfig.ollamaEnabled;
	},

	// ============================================
	// CLOCK IN/OUT FUNCTIONALITY
	// ============================================

	clockIn() {
		if (this.isWorking) return;

		this.isWorking = true;
		this.sessionStart = Date.now();
		this.saveToStorage();

		this.updateClockButtons();
		this.startTimer();

		this.addAIMessage('ai', `⏰ Clocked in at ${this.formatTime(new Date())}. Stay productive!`);
		this.showNotification('Clocked In', 'Your time is now being tracked.');
	},

	clockOut() {
		if (!this.isWorking) return;

		const sessionEnd = Date.now();
		const duration = (sessionEnd - this.sessionStart) / 1000 / 60 / 60; // hours

		// Create time entry
		const entry = {
			id: Date.now(),
			date: new Date(this.sessionStart).toISOString().split('T')[0],
			startTime: this.sessionStart,
			endTime: sessionEnd,
			duration: duration,
			earnings: this.calculateEarnings(duration)
		};

		this.timeEntries.push(entry);

		this.isWorking = false;
		this.sessionStart = null;
		this.saveToStorage();

		this.updateClockButtons();
		this.stopTimer();
		this.updateDashboard();
		this.updateRecentEntries();

		const earningsStr = this.formatCurrency(entry.earnings);
		this.addAIMessage('ai', `✅ Clocked out! Session: ${this.formatDuration(duration)} | Earned: ${earningsStr}`);
		this.showNotification('Clocked Out', `You worked ${this.formatDuration(duration)} and earned ${earningsStr}`);
	},

	checkActiveSession() {
		if (this.isWorking && this.sessionStart) {
			this.updateClockButtons();
			this.startTimer();
			this.addAIMessage('ai', `🔄 Welcome back! You're still clocked in since ${this.formatTime(new Date(this.sessionStart))}`);
		}
	},

	updateClockButtons() {
		const clockInBtn = document.getElementById('clock-in-btn');
		const clockOutBtn = document.getElementById('clock-out-btn');

		if (this.isWorking) {
			clockInBtn.disabled = true;
			clockInBtn.classList.add('disabled');
			clockOutBtn.disabled = false;
			clockOutBtn.classList.remove('disabled');
		} else {
			clockInBtn.disabled = false;
			clockInBtn.classList.remove('disabled');
			clockOutBtn.disabled = true;
			clockOutBtn.classList.add('disabled');
		}
	},

	// ============================================
	// TIMER FUNCTIONALITY
	// ============================================

	startTimer() {
		this.updateTimerDisplay();
		this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
	},

	stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
		document.getElementById('timer-value').textContent = '00:00:00';
	},

	updateTimerDisplay() {
		if (!this.sessionStart) return;

		const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
		const hours = Math.floor(elapsed / 3600);
		const minutes = Math.floor((elapsed % 3600) / 60);
		const seconds = elapsed % 60;

		const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		document.getElementById('timer-value').textContent = display;
	},

	// ============================================
	// REAL-TIME CLOCK
	// ============================================

	initClock() {
		this.updateClock();
		setInterval(() => this.updateClock(), 1000);
	},

	updateClock() {
		const now = new Date();
		const timeStr = this.formatTime(now);
		const dateStr = now.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		document.getElementById('current-time').textContent = timeStr;
		document.getElementById('current-date').textContent = dateStr;
	},

	// ============================================
	// EARNINGS CALCULATIONS
	// ============================================

	calculateEarnings(hours) {
		const weeklyHours = this.getWeeklyHours();
		let earnings = 0;

		if (weeklyHours + hours <= this.settings.overtimeThreshold) {
			earnings = hours * this.settings.hourlyRate;
		} else {
			const regularHours = Math.max(0, this.settings.overtimeThreshold - weeklyHours);
			const overtimeHours = hours - regularHours;
			earnings = (regularHours * this.settings.hourlyRate) +
				(overtimeHours * this.settings.hourlyRate * this.settings.overtimeMultiplier);
		}

		return earnings;
	},

	getTodayHours() {
		const today = new Date().toISOString().split('T')[0];
		let hours = this.timeEntries
			.filter(e => e.date === today)
			.reduce((sum, e) => sum + e.duration, 0);

		// Add current session if working
		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getWeeklyHours() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		let hours = this.timeEntries
			.filter(e => new Date(e.date) >= startOfWeek)
			.reduce((sum, e) => sum + e.duration, 0);

		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getMonthlyHours() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		let hours = this.timeEntries
			.filter(e => new Date(e.date) >= startOfMonth)
			.reduce((sum, e) => sum + e.duration, 0);

		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getTodayEarnings() {
		const today = new Date().toISOString().split('T')[0];
		return this.timeEntries
			.filter(e => e.date === today)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	getWeeklyEarnings() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		return this.timeEntries
			.filter(e => new Date(e.date) >= startOfWeek)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	getMonthlyEarnings() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		return this.timeEntries
			.filter(e => new Date(e.date) >= startOfMonth)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	// ============================================
	// DASHBOARD UPDATES
	// ============================================

	updateDashboard() {
		const todayHours = this.getTodayHours();
		const weekHours = this.getWeeklyHours();
		const monthHours = this.getMonthlyHours();

		const todayEarnings = this.getTodayEarnings() + (this.isWorking ? this.calculateEarnings(todayHours - this.getTodayHours()) : 0);
		const weekEarnings = this.getWeeklyEarnings();
		const monthEarnings = this.getMonthlyEarnings();

		// Update pay displays
		document.getElementById('today-pay').textContent = this.formatCurrency(this.getTodayEarnings());
		document.getElementById('today-hours').textContent = `${todayHours.toFixed(1)} hours`;

		document.getElementById('week-pay').textContent = this.formatCurrency(weekEarnings);
		document.getElementById('week-hours').textContent = `${weekHours.toFixed(1)} hours`;

		document.getElementById('month-pay').textContent = this.formatCurrency(monthEarnings);
		document.getElementById('month-hours').textContent = `${monthHours.toFixed(1)} hours`;

		// Update progress circles
		const todayPercent = Math.min(100, (todayHours / 8) * 100);
		const weekPercent = Math.min(100, (weekHours / this.settings.weeklyTarget) * 100);
		const monthPercent = Math.min(100, (monthHours / (this.settings.weeklyTarget * 4)) * 100);

		document.getElementById('today-progress').setAttribute('stroke-dasharray', `${todayPercent}, 100`);
		document.getElementById('today-percent').textContent = `${Math.round(todayPercent)}%`;

		document.getElementById('week-progress').setAttribute('stroke-dasharray', `${weekPercent}, 100`);
		document.getElementById('week-percent').textContent = `${Math.round(weekPercent)}%`;

		document.getElementById('month-progress').setAttribute('stroke-dasharray', `${monthPercent}, 100`);
		document.getElementById('month-percent').textContent = `${Math.round(monthPercent)}%`;

		this.updateRecentEntries();
		this.updateDistributionBar();
	},

	updateRecentEntries() {
		const container = document.getElementById('recent-entries');
		const recentEntries = this.timeEntries.slice(-5).reverse();

		if (recentEntries.length === 0) {
			container.innerHTML = `
        <div class="entry-line">
          <div class="entry-date">No entries</div>
          <div class="entry-info">
            <span class="entry-hours">--:-- - --:--</span>
            <p class="entry-duration">Clock in to start tracking</p>
          </div>
        </div>
      `;
			return;
		}

		container.innerHTML = recentEntries.map(entry => {
			const start = new Date(entry.startTime);
			const end = new Date(entry.endTime);
			const dateLabel = this.getDateLabel(entry.date);

			return `
        <div class="entry-line">
          <div class="entry-date">${dateLabel}</div>
          <div class="entry-info">
            <span class="entry-hours">${this.formatTime(start)} - ${this.formatTime(end)}</span>
            <p class="entry-duration">${this.formatDuration(entry.duration)} • ${this.formatCurrency(entry.earnings)}</p>
          </div>
        </div>
      `;
		}).join('');
	},

	updateDistributionBar() {
		const weekHours = this.getWeeklyHours();
		const regularHours = Math.min(weekHours, this.settings.overtimeThreshold);
		const overtimeHours = Math.max(0, weekHours - this.settings.overtimeThreshold);

		const total = regularHours + overtimeHours;
		if (total === 0) return;

		const regularPercent = (regularHours / total) * 100;
		const overtimePercent = (overtimeHours / total) * 100;

		document.getElementById('regular-bar').style.width = `${regularPercent}%`;
		document.getElementById('overtime-bar').style.width = `${overtimePercent}%`;
		document.getElementById('breaks-bar').style.width = '0%';

		document.getElementById('regular-percent').textContent = `${Math.round(regularPercent)}%`;
		document.getElementById('overtime-percent').textContent = `${Math.round(overtimePercent)}%`;
		document.getElementById('breaks-percent').textContent = '0%';
	},

	// ============================================
	// CHART INITIALIZATION
	// ============================================

	initChart() {
		const ctx = document.getElementById('chart');
		if (!ctx) return;

		const chartCtx = ctx.getContext('2d');
		const gradient = chartCtx.createLinearGradient(0, 0, 0, 450);
		gradient.addColorStop(0, 'rgba(61, 126, 255, 0.4)');
		gradient.addColorStop(0.5, 'rgba(61, 126, 255, 0.1)');
		gradient.addColorStop(1, 'rgba(61, 126, 255, 0)');

		const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const hoursData = this.getWeeklyHoursBreakdown();

		this.chart = new Chart(chartCtx, {
			type: 'line',
			data: {
				labels: weekDays,
				datasets: [{
					label: 'Hours Worked',
					backgroundColor: gradient,
					pointBackgroundColor: '#3d7eff',
					borderWidth: 2,
					borderColor: '#3d7eff',
					data: hoursData,
					fill: true
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				animation: {
					easing: 'easeInOutQuad',
					duration: 800
				},
				scales: {
					y: {
						beginAtZero: true,
						max: 12,
						ticks: { color: '#5e6a81' },
						grid: { color: 'rgba(200, 200, 200, 0.08)' }
					},
					x: {
						ticks: { color: '#5e6a81' }
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.8)',
						titleColor: 'white',
						bodyColor: 'white',
						cornerRadius: 8,
						padding: 12
					}
				}
			}
		});
	},

	getWeeklyHoursBreakdown() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		const dailyHours = [0, 0, 0, 0, 0, 0, 0];

		this.timeEntries.forEach(entry => {
			const entryDate = new Date(entry.date);
			if (entryDate >= startOfWeek) {
				const dayIndex = entryDate.getDay();
				dailyHours[dayIndex] += entry.duration;
			}
		});

		return dailyHours.map(h => parseFloat(h.toFixed(1)));
	},

	updateChart() {
		if (this.chart) {
			this.chart.data.datasets[0].data = this.getWeeklyHoursBreakdown();
			this.chart.update();
		}
	},

	// ============================================
	// AI ASSISTANT
	// ============================================

	processAIMessage(message) {
		const lowerMsg = message.toLowerCase();

		// Store in memory
		this.aiMemory.conversationHistory.push({
			role: 'user',
			content: message,
			timestamp: Date.now()
		});
		this.aiMemory.lastInteraction = Date.now();

		let response = '';

		// Check various intents
		if (lowerMsg.includes('how much') && (lowerMsg.includes('earned') || lowerMsg.includes('made') || lowerMsg.includes('pay'))) {
			if (lowerMsg.includes('today')) {
				const earnings = this.getTodayEarnings();
				const hours = this.getTodayHours();
				response = `💰 Today you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else if (lowerMsg.includes('week')) {
				const earnings = this.getWeeklyEarnings();
				const hours = this.getWeeklyHours();
				response = `💰 This week you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else if (lowerMsg.includes('month')) {
				const earnings = this.getMonthlyEarnings();
				const hours = this.getMonthlyHours();
				response = `💰 This month you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else {
				const weekEarnings = this.getWeeklyEarnings();
				response = `💰 Your earnings summary:\n• Today: ${this.formatCurrency(this.getTodayEarnings())}\n• This Week: ${this.formatCurrency(weekEarnings)}\n• This Month: ${this.formatCurrency(this.getMonthlyEarnings())}`;
			}
		} else if (lowerMsg.includes('hours') && (lowerMsg.includes('worked') || lowerMsg.includes('many'))) {
			const today = this.getTodayHours();
			const week = this.getWeeklyHours();
			const month = this.getMonthlyHours();
			response = `⏱️ Hours tracked:\n• Today: **${today.toFixed(1)}h**\n• This Week: **${week.toFixed(1)}h** / ${this.settings.weeklyTarget}h\n• This Month: **${month.toFixed(1)}h**`;
		} else if (lowerMsg.includes('rate') || lowerMsg.includes('hourly')) {
			if (lowerMsg.includes('change') || lowerMsg.includes('set')) {
				const match = message.match(/\$?(\d+\.?\d*)/);
				if (match) {
					const newRate = parseFloat(match[1]);
					this.settings.hourlyRate = newRate;
					this.saveToStorage();
					this.updateSettingsUI();
					response = `✅ Hourly rate updated to **${this.formatCurrency(newRate)}**/hour.`;
				} else {
					response = `💡 To change your rate, say: "Set my rate to $30" or update it in Settings.`;
				}
			} else {
				response = `💵 Your current hourly rate is **${this.formatCurrency(this.settings.hourlyRate)}**/hour.\n\nOvertime (after ${this.settings.overtimeThreshold}h/week): **${this.settings.overtimeMultiplier}x** = ${this.formatCurrency(this.settings.hourlyRate * this.settings.overtimeMultiplier)}/hour`;
			}
		} else if (lowerMsg.includes('overtime')) {
			const weekHours = this.getWeeklyHours();
			const overtime = Math.max(0, weekHours - this.settings.overtimeThreshold);
			if (overtime > 0) {
				const overtimePay = overtime * this.settings.hourlyRate * this.settings.overtimeMultiplier;
				response = `⚡ You've worked **${overtime.toFixed(1)} overtime hours** this week, earning an extra **${this.formatCurrency(overtimePay)}**!`;
			} else {
				const remaining = this.settings.overtimeThreshold - weekHours;
				response = `📊 No overtime yet. You have **${remaining.toFixed(1)} hours** until overtime kicks in at ${this.settings.overtimeMultiplier}x rate.`;
			}
		} else if (lowerMsg.includes('summary') || lowerMsg.includes('status')) {
			const isWorking = this.isWorking ? '🟢 Currently clocked in' : '🔴 Currently clocked out';
			const today = this.getTodayHours();
			const week = this.getWeeklyHours();
			response = `📋 **TimeVault Summary**\n\n${isWorking}\n\n**Today:** ${today.toFixed(1)}h • ${this.formatCurrency(this.getTodayEarnings())}\n**Week:** ${week.toFixed(1)}h • ${this.formatCurrency(this.getWeeklyEarnings())}\n**Month:** ${this.getMonthlyHours().toFixed(1)}h • ${this.formatCurrency(this.getMonthlyEarnings())}\n\nRate: ${this.formatCurrency(this.settings.hourlyRate)}/hr`;
		} else if (lowerMsg.includes('clock in') || lowerMsg.includes('start')) {
			if (!this.isWorking) {
				this.clockIn();
				response = `✅ I've clocked you in! Timer started.`;
			} else {
				response = `⚠️ You're already clocked in since ${this.formatTime(new Date(this.sessionStart))}.`;
			}
		} else if (lowerMsg.includes('clock out') || lowerMsg.includes('stop')) {
			if (this.isWorking) {
				this.clockOut();
				response = `✅ Clocked you out! Time entry saved.`;
			} else {
				response = `⚠️ You're not currently clocked in.`;
			}
		} else if (lowerMsg.includes('help')) {
			response = `🤖 **TimeVault AI Commands:**\n
• "How much have I earned today/this week/this month?"
• "How many hours have I worked?"
• "What's my hourly rate?"
• "Set my rate to $XX"
• "Show overtime details"
• "Give me a summary"
• "Clock me in/out"
• "Help" - Show this menu`;
		} else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
			const greetings = ['Hello!', 'Hey there!', 'Hi!', 'Greetings!'];
			response = `${greetings[Math.floor(Math.random() * greetings.length)]} 👋 How can I help you with your time tracking today?`;
		} else if (lowerMsg.includes('thank')) {
			response = `You're welcome! 😊 Happy to help with your time tracking.`;
		} else {
			response = `🤔 I'm not sure I understood that. Try asking:\n• "How much have I earned?"\n• "How many hours this week?"\n• "What's my rate?"\n• "Give me a summary"\n\nOr type "help" for all commands.`;
		}

		// Store AI response in memory
		this.aiMemory.conversationHistory.push({
			role: 'ai',
			content: response,
			timestamp: Date.now()
		});

		// Keep only last 50 messages
		if (this.aiMemory.conversationHistory.length > 50) {
			this.aiMemory.conversationHistory = this.aiMemory.conversationHistory.slice(-50);
		}

		this.saveToStorage();
		return response;
	},

	addAIMessage(role, content) {
		const chatContainer = document.getElementById('ai-chat');
		const messageDiv = document.createElement('div');
		messageDiv.className = `ai-message ${role === 'ai' ? 'ai-response' : 'user-message'}`;

		// Convert markdown-like formatting
		const formatted = content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');

		messageDiv.innerHTML = `<p>${formatted}</p>`;
		chatContainer.appendChild(messageDiv);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	},

	// ============================================
	// ENHANCED AI ENGINE - OLLAMA INTEGRATION
	// ============================================

	async initAIEngine() {
		// Initialize voice recognition
		this.initVoiceRecognition();

		// Test Ollama connection
		await this.testOllamaConnection();

		// Generate initial smart suggestions
		this.generateSmartSuggestions();

		// Update suggestions periodically
		setInterval(() => this.generateSmartSuggestions(), 5 * 60 * 1000); // Every 5 mins

		console.log('TimeVault: AI Engine initialized');
	},

	async testOllamaConnection() {
		this.updateConnectionStatus('testing');

		// Try local connection first
		if (this.aiConfig.ollamaEnabled) {
			try {
				const localResponse = await fetch(`${this.aiConfig.ollamaLocalUrl}/api/tags`, {
					method: 'GET',
					signal: AbortSignal.timeout(3000)
				});
				if (localResponse.ok) {
					this.aiConfig.connectionStatus = 'local';
					this.updateConnectionStatus('local');
					console.log('TimeVault: Connected to local Ollama');
					return true;
				}
			} catch (e) {
				console.log('TimeVault: Local Ollama not available');
			}

			// Try remote connection
			if (this.aiConfig.ollamaRemoteUrl) {
				try {
					const remoteResponse = await fetch(`${this.aiConfig.ollamaRemoteUrl}/api/tags`, {
						method: 'GET',
						signal: AbortSignal.timeout(5000)
					});
					if (remoteResponse.ok) {
						this.aiConfig.connectionStatus = 'remote';
						this.updateConnectionStatus('remote');
						console.log('TimeVault: Connected to remote Ollama');
						return true;
					}
				} catch (e) {
					console.log('TimeVault: Remote Ollama not available');
				}
			}
		}

		this.aiConfig.connectionStatus = 'disconnected';
		this.updateConnectionStatus('disconnected');
		return false;
	},

	updateConnectionStatus(status) {
		const indicator = document.getElementById('ai-connection-status');
		const statusText = document.getElementById('ai-connection-text');

		if (indicator) {
			indicator.className = 'ai-connection-indicator ' + status;
		}
		if (statusText) {
			const statusMap = {
				'local': '🟢 Local AI',
				'remote': '🔵 Remote AI',
				'disconnected': '🟡 Local Only',
				'testing': '⏳ Connecting...'
			};
			statusText.textContent = statusMap[status] || 'Unknown';
		}
	},

	async sendToOllama(message) {
		const baseUrl = this.aiConfig.connectionStatus === 'remote'
			? this.aiConfig.ollamaRemoteUrl
			: this.aiConfig.ollamaLocalUrl;

		// Build context from TimeVault data
		const context = this.buildAIContext();

		const systemPrompt = `You are TimeVault AI, a helpful assistant for time tracking and payroll. 
You have access to the user's time tracking data:
${context}

Be concise, friendly, and helpful. Use emojis occasionally. Format currency as USD. 
If asked about calculations, be precise. If you don't know something, say so.`;

		try {
			const response = await fetch(`${baseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.aiConfig.ollamaModel,
					prompt: message,
					system: systemPrompt,
					stream: false,
					options: {
						temperature: 0.7,
						num_predict: 256
					}
				}),
				signal: AbortSignal.timeout(30000)
			});

			if (response.ok) {
				const data = await response.json();
				return data.response || "I couldn't generate a response.";
			}
		} catch (e) {
			console.error('Ollama error:', e);
		}

		return null; // Return null to trigger fallback
	},

	buildAIContext() {
		const today = this.getTodayHours();
		const week = this.getWeeklyHours();
		const month = this.getMonthlyHours();
		const todayEarnings = this.getTodayEarnings();
		const weekEarnings = this.getWeeklyEarnings();
		const monthEarnings = this.getMonthlyEarnings();
		const overtime = Math.max(0, week - this.settings.overtimeThreshold);

		return `
- Currently clocked ${this.isWorking ? 'IN' : 'OUT'}
- Today: ${today.toFixed(1)} hours, ${this.formatCurrency(todayEarnings)}
- This week: ${week.toFixed(1)} hours, ${this.formatCurrency(weekEarnings)}
- This month: ${month.toFixed(1)} hours, ${this.formatCurrency(monthEarnings)}
- Overtime this week: ${overtime.toFixed(1)} hours
- Hourly rate: ${this.formatCurrency(this.settings.hourlyRate)} (OT: ${this.settings.overtimeMultiplier}x)
- Weekly target: ${this.settings.weeklyTarget} hours
- Total entries: ${this.timeEntries.length}`;
	},

	// Enhanced message processing with Ollama fallback
	async processAIMessageEnhanced(message) {
		// Store in memory
		this.aiMemory.conversationHistory.push({
			role: 'user',
			content: message,
			timestamp: Date.now()
		});
		this.aiMemory.lastInteraction = Date.now();

		let response = '';

		// Try Ollama if connected
		if (this.aiConfig.connectionStatus === 'local' || this.aiConfig.connectionStatus === 'remote') {
			this.showTypingIndicator();
			response = await this.sendToOllama(message);
			this.hideTypingIndicator();
		}

		// Fallback to local processing if Ollama fails or is disconnected
		if (!response) {
			response = this.processAIMessage(message);
		}

		// Store AI response
		this.aiMemory.conversationHistory.push({
			role: 'ai',
			content: response,
			timestamp: Date.now()
		});

		// Keep only last 50 messages
		if (this.aiMemory.conversationHistory.length > 50) {
			this.aiMemory.conversationHistory = this.aiMemory.conversationHistory.slice(-50);
		}

		this.saveToStorage();
		return response;
	},

	showTypingIndicator() {
		const chatContainer = document.getElementById('ai-chat');
		const typing = document.createElement('div');
		typing.id = 'ai-typing';
		typing.className = 'ai-message ai-response typing';
		typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
		chatContainer.appendChild(typing);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	},

	hideTypingIndicator() {
		document.getElementById('ai-typing')?.remove();
	},

	// ============================================
	// VOICE RECOGNITION
	// ============================================

	initVoiceRecognition() {
		if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
			console.log('TimeVault: Speech recognition not supported');
			this.aiConfig.voiceEnabled = false;
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.voiceRecognition = new SpeechRecognition();
		this.voiceRecognition.continuous = false;
		this.voiceRecognition.interimResults = true;
		this.voiceRecognition.lang = this.aiConfig.voiceLanguage;

		this.voiceRecognition.onstart = () => {
			this.aiConfig.isListening = true;
			this.updateVoiceButton(true);
			console.log('TimeVault: Voice recognition started');
		};

		this.voiceRecognition.onend = () => {
			this.aiConfig.isListening = false;
			this.updateVoiceButton(false);
			console.log('TimeVault: Voice recognition ended');
		};

		this.voiceRecognition.onresult = (event) => {
			let finalTranscript = '';
			let interimTranscript = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					finalTranscript += transcript;
				} else {
					interimTranscript += transcript;
				}
			}

			// Update input field with interim results
			const input = document.getElementById('ai-input');
			if (input) {
				input.value = finalTranscript || interimTranscript;
			}

			// Process final result
			if (finalTranscript) {
				this.handleVoiceCommand(finalTranscript);
			}
		};

		this.voiceRecognition.onerror = (event) => {
			console.error('Voice recognition error:', event.error);
			this.aiConfig.isListening = false;
			this.updateVoiceButton(false);

			if (event.error === 'not-allowed') {
				this.showNotification('Voice Denied', 'Please allow microphone access for voice input');
			}
		};
	},

	toggleVoiceRecognition() {
		if (!this.voiceRecognition) {
			this.showNotification('Not Supported', 'Voice recognition is not available in this browser');
			return;
		}

		if (this.aiConfig.isListening) {
			this.voiceRecognition.stop();
		} else {
			try {
				this.voiceRecognition.start();
			} catch (e) {
				console.error('Failed to start voice recognition:', e);
			}
		}
	},

	updateVoiceButton(isListening) {
		const btn = document.getElementById('voice-input-btn');
		if (btn) {
			btn.classList.toggle('listening', isListening);
			btn.setAttribute('title', isListening ? 'Listening...' : 'Voice Input');
		}
	},

	async handleVoiceCommand(transcript) {
		this.addAIMessage('user', `🎤 ${transcript}`);
		const response = await this.processAIMessageEnhanced(transcript);
		this.addAIMessage('ai', response);
	},

	// ============================================
	// SMART SUGGESTIONS
	// ============================================

	generateSmartSuggestions() {
		if (!this.aiConfig.suggestionsEnabled) return;

		const suggestions = [];
		const now = new Date();
		const hour = now.getHours();
		const dayOfWeek = now.getDay();
		const weekHours = this.getWeeklyHours();
		const todayHours = this.getTodayHours();

		// Time-based suggestions
		if (hour >= 7 && hour <= 9 && !this.isWorking) {
			suggestions.push({
				icon: '☀️',
				title: 'Good Morning!',
				text: 'Ready to start your day? Clock in to begin tracking.',
				action: 'clockIn'
			});
		}

		if (hour >= 12 && hour <= 13 && this.isWorking && todayHours >= 4) {
			suggestions.push({
				icon: '🍽️',
				title: 'Lunch Break?',
				text: "You've worked 4+ hours. Consider taking a break!",
				action: 'break'
			});
		}

		if (hour >= 17 && hour <= 18 && this.isWorking) {
			suggestions.push({
				icon: '🌅',
				title: 'End of Day',
				text: 'Wrapping up? Clock out when you\'re done.',
				action: 'clockOut'
			});
		}

		// Goal progress
		const weeklyProgress = (weekHours / this.settings.weeklyTarget) * 100;
		if (weeklyProgress < 50 && dayOfWeek >= 3) {
			suggestions.push({
				icon: '📊',
				title: 'Weekly Goal',
				text: `${weeklyProgress.toFixed(0)}% of ${this.settings.weeklyTarget}h target. You need ${(this.settings.weeklyTarget - weekHours).toFixed(1)}h more.`,
				action: 'viewPayroll'
			});
		}

		// Overtime alert
		const hoursUntilOT = this.settings.overtimeThreshold - weekHours;
		if (hoursUntilOT > 0 && hoursUntilOT <= 5) {
			suggestions.push({
				icon: '⚡',
				title: 'Overtime Soon!',
				text: `Only ${hoursUntilOT.toFixed(1)}h until overtime at ${this.settings.overtimeMultiplier}x rate.`,
				action: 'viewPayroll'
			});
		}

		if (hoursUntilOT <= 0) {
			const otHours = Math.abs(hoursUntilOT);
			suggestions.push({
				icon: '💰',
				title: 'Overtime Active!',
				text: `You have ${otHours.toFixed(1)}h overtime this week!`,
				action: 'viewPayroll'
			});
		}

		// Earnings projection
		if (this.timeEntries.length >= 5) {
			const avgDaily = this.getAverageDailyHours();
			const projectedWeek = avgDaily * 5;
			const projectedEarnings = projectedWeek * this.settings.hourlyRate;
			suggestions.push({
				icon: '📈',
				title: 'Weekly Projection',
				text: `At your pace, you'll earn ~${this.formatCurrency(projectedEarnings)} this week.`,
				action: 'viewReports'
			});
		}

		// Session reminder
		if (this.isWorking) {
			const sessionDuration = (Date.now() - this.sessionStart) / (1000 * 60 * 60);
			if (sessionDuration >= 4) {
				suggestions.push({
					icon: '⏰',
					title: 'Long Session',
					text: `You've been working ${sessionDuration.toFixed(1)} hours straight. Take a break!`,
					action: 'break'
				});
			}
		}

		// Render suggestions (max 3)
		this.renderSmartSuggestions(suggestions.slice(0, 3));
		this.aiConfig.lastSuggestionUpdate = Date.now();
	},

	getAverageDailyHours() {
		if (this.timeEntries.length === 0) return 0;

		const daysWorked = new Set(
			this.timeEntries.map(e => new Date(e.startTime).toDateString())
		).size;

		const totalHours = this.timeEntries.reduce((sum, e) => sum + e.duration, 0);
		return daysWorked > 0 ? totalHours / daysWorked : 0;
	},

	renderSmartSuggestions(suggestions) {
		const container = document.getElementById('smart-suggestions');
		if (!container) return;

		if (suggestions.length === 0) {
			container.innerHTML = '<p class="suggestions-empty">No suggestions right now. Keep tracking!</p>';
			return;
		}

		container.innerHTML = suggestions.map(s => `
			<div class="suggestion-card" data-action="${s.action}">
				<span class="suggestion-icon">${s.icon}</span>
				<div class="suggestion-content">
					<strong>${s.title}</strong>
					<p>${s.text}</p>
				</div>
			</div>
		`).join('');

		// Add click handlers
		container.querySelectorAll('.suggestion-card').forEach(card => {
			card.addEventListener('click', () => {
				const action = card.dataset.action;
				this.handleSuggestionAction(action);
			});
		});
	},

	handleSuggestionAction(action) {
		switch (action) {
			case 'clockIn':
				if (!this.isWorking) this.clockIn();
				break;
			case 'clockOut':
				if (this.isWorking) this.clockOut();
				break;
			case 'break':
				this.showNotification('Break Time', 'Remember to rest and recharge! 🧘');
				break;
			case 'viewPayroll':
				this.switchView('payroll');
				document.querySelector('[data-view="payroll"]')?.click();
				break;
			case 'viewReports':
				this.switchView('reports');
				document.querySelector('[data-view="reports"]')?.click();
				break;
		}
	},


	// ============================================
	// SYNC FUNCTIONALITY
	// ============================================

	async syncWithEmail(email) {
		if (!email || !this.validateEmail(email)) {
			this.showNotification('Invalid Email', 'Please enter a valid email address.');
			return;
		}

		this.syncData.email = email;
		this.syncData.lastSync = Date.now();
		this.saveToStorage();

		// Generate sync code from email
		const syncCode = this.generateSyncCode(email);

		this.updateSyncStatus(true);
		this.showNotification('Sync Enabled', `Your data is synced with code: ${syncCode}`);
		this.addAIMessage('ai', `📧 Sync enabled with ${email}. Your sync code is: **${syncCode}**. Use this on other devices to sync your data.`);
	},

	async syncWithPin(pin) {
		if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
			this.showNotification('Invalid PIN', 'PIN must be 4-8 digits.');
			return;
		}

		this.syncData.pin = pin;
		this.syncData.lastSync = Date.now();
		this.saveToStorage();

		this.updateSyncStatus(true);
		this.showNotification('Sync Enabled', `Your data is synced with PIN: ${pin}`);
		this.addAIMessage('ai', `🔐 PIN sync enabled! Use PIN **${pin}** on other devices to access your TimeVault data.`);
	},

	generateSyncCode(email) {
		// Simple hash for demo (in production, use proper server-side sync)
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = ((hash << 5) - hash) + email.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
	},

	updateSyncStatus(synced) {
		const statusEl = document.getElementById('sync-status');
		const indicator = statusEl.querySelector('.sync-indicator');
		const text = statusEl.querySelector('span:last-child');

		if (synced) {
			indicator.classList.remove('offline');
			indicator.classList.add('online');
			text.textContent = 'Synced';
		} else {
			indicator.classList.remove('online');
			indicator.classList.add('offline');
			text.textContent = 'Local Mode';
		}
	},

	exportData() {
		const data = {
			version: '1.0',
			exportDate: new Date().toISOString(),
			settings: this.settings,
			timeEntries: this.timeEntries,
			aiMemory: this.aiMemory
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `timevault-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);

		this.showNotification('Export Complete', 'Your TimeVault data has been downloaded.');
		this.addAIMessage('ai', '💾 Data exported successfully! Keep this backup file safe.');
	},

	importData(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target.result);

				if (data.settings) this.settings = { ...this.settings, ...data.settings };
				if (data.timeEntries) this.timeEntries = data.timeEntries;
				if (data.aiMemory) this.aiMemory = { ...this.aiMemory, ...data.aiMemory };

				this.saveToStorage();
				this.updateSettingsUI();
				this.updateDashboard();
				this.updateChart();

				this.showNotification('Import Complete', `Imported ${data.timeEntries?.length || 0} time entries.`);
				this.addAIMessage('ai', `📥 Data imported! ${data.timeEntries?.length || 0} entries restored.`);
			} catch (err) {
				this.showNotification('Import Failed', 'Invalid backup file format.');
			}
		};
		reader.readAsText(file);
	},

	// ============================================
	// UTILITY FUNCTIONS
	// ============================================

	formatTime(date) {
		if (this.settings.timeFormat === '24') {
			return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	},

	formatCurrency(amount) {
		return `${this.settings.currencySymbol}${amount.toFixed(2)}`;
	},

	formatDuration(hours) {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	},

	getDateLabel(dateStr) {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (dateStr === today.toISOString().split('T')[0]) return 'Today';
		if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	},

	validateEmail(email) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	},

	showNotification(title, message) {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification(title, { body: message, icon: 'icons/time-icons_favicon_96x96.png' });
		}
		console.log(`TimeVault: ${title} - ${message}`);
	},

	// ============================================
	// EVENT LISTENERS
	// ============================================

	initEventListeners() {
		// Clock In/Out
		document.getElementById('clock-in-btn')?.addEventListener('click', () => this.clockIn());
		document.getElementById('clock-out-btn')?.addEventListener('click', () => this.clockOut());

		// AI Chat
		document.getElementById('ai-send-btn')?.addEventListener('click', () => this.handleAISubmit());
		document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') this.handleAISubmit();
		});

		// Voice Input Button
		document.getElementById('voice-input-btn')?.addEventListener('click', () => this.toggleVoiceRecognition());

		// Test Ollama Connection Button
		document.getElementById('test-ollama-btn')?.addEventListener('click', async () => {
			const btn = document.getElementById('test-ollama-btn');
			btn.textContent = 'Testing...';
			const connected = await this.testOllamaConnection();
			btn.textContent = connected ? '✓ Connected' : 'Test Connection';
			setTimeout(() => { btn.textContent = 'Test Connection'; }, 2000);
		});

		// Save AI Settings
		document.getElementById('save-ai-settings-btn')?.addEventListener('click', () => {
			this.aiConfig.ollamaLocalUrl = document.getElementById('ollama-local-url')?.value || 'http://localhost:11434';
			this.aiConfig.ollamaRemoteUrl = document.getElementById('ollama-remote-url')?.value || '';
			this.aiConfig.ollamaModel = document.getElementById('ollama-model')?.value || 'llama3';
			this.aiConfig.ollamaEnabled = document.getElementById('ollama-enabled')?.checked ?? true;
			this.saveToStorage();
			this.showNotification('AI Settings Saved', 'Your AI configuration has been updated');
			this.testOllamaConnection();
		});


		// Settings
		document.getElementById('hourly-rate')?.addEventListener('change', (e) => {
			this.settings.hourlyRate = parseFloat(e.target.value) || 25;
			this.saveToStorage();
			this.updateDashboard();
		});

		document.getElementById('overtime-multiplier')?.addEventListener('change', (e) => {
			this.settings.overtimeMultiplier = parseFloat(e.target.value);
			this.saveToStorage();
		});

		document.getElementById('weekly-target')?.addEventListener('change', (e) => {
			this.settings.weeklyTarget = parseInt(e.target.value) || 40;
			this.saveToStorage();
			this.updateDashboard();
		});

		// Sync
		document.getElementById('sync-email-btn')?.addEventListener('click', () => {
			const email = document.getElementById('sync-email').value;
			this.syncWithEmail(email);
		});

		document.getElementById('sync-pin-btn')?.addEventListener('click', () => {
			const pin = document.getElementById('sync-pin').value;
			this.syncWithPin(pin);
		});

		// Export/Import
		document.getElementById('export-data-btn')?.addEventListener('click', () => this.exportData());
		document.getElementById('import-data-btn')?.addEventListener('click', () => {
			document.getElementById('import-file').click();
		});
		document.getElementById('import-file')?.addEventListener('change', (e) => {
			if (e.target.files[0]) this.importData(e.target.files[0]);
		});

		// Navigation - View Switching
		document.querySelectorAll('.nav-list-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.preventDefault();
				const viewName = item.getAttribute('data-view');

				// Update active nav item
				document.querySelectorAll('.nav-list-item').forEach(i => i.classList.remove('active'));
				item.classList.add('active');

				// Switch views
				this.switchView(viewName);

				// Close mobile menu if open
				document.querySelector('.app-left')?.classList.remove('show');
			});
		});


		// Mobile menu
		document.querySelector('.menu-button')?.addEventListener('click', () => {
			document.querySelector('.app-left').classList.add('show');
		});

		document.querySelector('.close-menu')?.addEventListener('click', () => {
			document.querySelector('.app-left').classList.remove('show');
		});

		document.querySelector('.open-right-area')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.add('show');
		});

		document.querySelector('.close-right')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.remove('show');
		});

		// AI Toggle
		document.getElementById('ai-toggle-btn')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.toggle('show');
		});

		// Sidebar collapse/expand toggle
		document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
			const sidebar = document.querySelector('.app-left');
			sidebar.classList.toggle('collapsed');
			// Save preference
			localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
		});

		// Restore sidebar state from localStorage
		const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
		if (sidebarCollapsed) {
			document.querySelector('.app-left')?.classList.add('collapsed');
		}


		// Settings modal
		document.querySelectorAll('[data-view="settings"]').forEach(el => {
			el.addEventListener('click', () => {
				document.getElementById('settings-modal')?.classList.remove('hidden');
			});
		});

		document.getElementById('close-settings')?.addEventListener('click', () => {
			document.getElementById('settings-modal')?.classList.add('hidden');
		});

		// Clear all data
		document.getElementById('clear-all-data')?.addEventListener('click', () => {
			if (confirm('Are you sure you want to delete ALL your TimeVault data? This cannot be undone.')) {
				localStorage.removeItem('timevault_data');
				location.reload();
			}
		});

		// Request notification permission
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}

		// Update dashboard periodically if working
		setInterval(() => {
			if (this.isWorking) {
				this.updateDashboard();
			}
		}, 60000); // Every minute
	},

	async handleAISubmit() {
		const input = document.getElementById('ai-input');
		const message = input.value.trim();

		if (!message) return;

		this.addAIMessage('user', message);
		input.value = '';

		// Use enhanced AI with Ollama integration
		const response = await this.processAIMessageEnhanced(message);
		this.addAIMessage('ai', response);
	},


	// ============================================
	// VIEW SWITCHING SYSTEM
	// ============================================

	switchView(viewName) {
		// Hide all views
		document.querySelectorAll('.view-content').forEach(view => {
			view.classList.remove('active');
		});

		// Show selected view
		const targetView = document.getElementById(`view-${viewName}`);
		if (targetView) {
			targetView.classList.add('active');

			// Render content for specific views
			switch (viewName) {
				case 'timecard':
					this.renderTimeCard();
					break;
				case 'payroll':
					this.renderPayroll();
					break;
				case 'reports':
					this.renderReports();
					break;
				case 'settings':
					this.renderSettings();
					break;
			}
		}
	},

	// ============================================
	// TIME CARD PAGE
	// ============================================

	renderTimeCard() {
		const tbody = document.getElementById('timecard-entries');
		const filter = document.getElementById('timecard-filter')?.value || 'week';

		if (!tbody) return;

		const filteredEntries = this.getFilteredEntries(filter);

		if (filteredEntries.length === 0) {
			tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No time entries yet. Clock in to start tracking!</td></tr>';
		} else {
			tbody.innerHTML = filteredEntries.map(entry => `
				<tr>
					<td>${this.formatEntryDate(entry.startTime)}</td>
					<td>${this.formatTime(new Date(entry.startTime))}</td>
					<td>${this.formatTime(new Date(entry.endTime))}</td>
					<td>${this.formatDuration(entry.duration)}</td>
					<td>${this.formatCurrency(entry.earnings)}</td>
					<td>
						<div class="entry-actions">
							<button class="btn-edit" onclick="TimeVault.editEntry(${entry.id})">Edit</button>
							<button class="btn-delete" onclick="TimeVault.deleteEntry(${entry.id})">Delete</button>
						</div>
					</td>
				</tr>
			`).join('');
		}

		// Update filter stats
		const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);
		const totalEarnings = filteredEntries.reduce((sum, e) => sum + e.earnings, 0);

		document.getElementById('filter-total-hours').textContent = totalHours.toFixed(1);
		document.getElementById('filter-total-earnings').textContent = this.formatCurrency(totalEarnings);

		// Add filter change listener
		document.getElementById('timecard-filter')?.addEventListener('change', () => this.renderTimeCard());
	},

	getFilteredEntries(filter) {
		const now = new Date();
		return this.timeEntries.filter(entry => {
			const entryDate = new Date(entry.startTime);
			switch (filter) {
				case 'today':
					return entryDate.toDateString() === now.toDateString();
				case 'week':
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					return entryDate >= weekAgo;
				case 'month':
					return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
				default:
					return true;
			}
		}).sort((a, b) => b.startTime - a.startTime);
	},

	formatEntryDate(timestamp) {
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

		if (date.toDateString() === today.toDateString()) return 'Today';
		if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	},

	deleteEntry(id) {
		if (confirm('Delete this time entry?')) {
			this.timeEntries = this.timeEntries.filter(e => e.id !== id);
			this.saveToStorage();
			this.renderTimeCard();
			this.updateDashboard();
			this.showNotification('Entry Deleted', 'Time entry has been removed');
		}
	},

	editEntry(id) {
		alert('Edit functionality coming soon!');
	},

	// ============================================
	// PAYROLL PAGE
	// ============================================

	renderPayroll() {
		const period = document.getElementById('payroll-period-select')?.value || 'current-month';
		const entries = this.getPayrollEntries(period);

		// Calculate totals
		let regularHours = 0;
		let overtimeHours = 0;
		let regularPay = 0;
		let overtimePay = 0;

		entries.forEach(entry => {
			const weekHours = this.getWeeklyHoursAt(entry.startTime);
			if (weekHours + entry.duration <= this.settings.overtimeThreshold) {
				regularHours += entry.duration;
				regularPay += entry.duration * this.settings.hourlyRate;
			} else {
				const regHours = Math.max(0, this.settings.overtimeThreshold - weekHours);
				const otHours = entry.duration - regHours;
				regularHours += regHours;
				overtimeHours += otHours;
				regularPay += regHours * this.settings.hourlyRate;
				overtimePay += otHours * this.settings.hourlyRate * this.settings.overtimeMultiplier;
			}
		});

		const grossPay = regularPay + overtimePay;

		// Update summary cards
		document.getElementById('gross-pay').textContent = this.formatCurrency(grossPay);
		document.getElementById('gross-hours').textContent = `${(regularHours + overtimeHours).toFixed(1)} total hours`;

		document.getElementById('regular-pay').textContent = this.formatCurrency(regularPay);
		document.getElementById('regular-hours-detail').textContent =
			`${regularHours.toFixed(1)} hours @ ${this.formatCurrency(this.settings.hourlyRate)}/hr`;

		document.getElementById('overtime-pay').textContent = this.formatCurrency(overtimePay);
		document.getElementById('overtime-hours-detail').textContent =
			`${overtimeHours.toFixed(1)} hours @ ${this.formatCurrency(this.settings.hourlyRate * this.settings.overtimeMultiplier)}/hr`;

		// Add period change listener
		document.getElementById('payroll-period-select')?.addEventListener('change', () => this.renderPayroll());
	},

	getPayrollEntries(period) {
		const now = new Date();
		return this.timeEntries.filter(entry => {
			const date = new Date(entry.startTime);
			switch (period) {
				case 'current-week':
					const weekStart = new Date(now);
					weekStart.setDate(now.getDate() - now.getDay());
					return date >= weekStart;
				case 'last-week':
					const lastWeekStart = new Date(now);
					lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
					const lastWeekEnd = new Date(lastWeekStart);
					lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
					return date >= lastWeekStart && date < lastWeekEnd;
				case 'current-month':
					return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
				case 'last-month':
					const lastMonth = new Date(now);
					lastMonth.setMonth(now.getMonth() - 1);
					return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
				case 'ytd':
					return date.getFullYear() === now.getFullYear();
				default:
					return true;
			}
		});
	},

	getWeeklyHoursAt(timestamp) {
		const date = new Date(timestamp);
		const weekStart = new Date(date);
		weekStart.setDate(date.getDate() - date.getDay());
		weekStart.setHours(0, 0, 0, 0);

		return this.timeEntries
			.filter(e => {
				const eDate = new Date(e.startTime);
				return eDate >= weekStart && eDate < date;
			})
			.reduce((sum, e) => sum + e.duration, 0);
	},

	// ============================================
	// REPORTS PAGE
	// ============================================

	renderReports() {
		// Calculate stats
		const allEntries = this.timeEntries;
		const totalHours = allEntries.reduce((sum, e) => sum + e.duration, 0);
		const totalEarnings = allEntries.reduce((sum, e) => sum + e.earnings, 0);

		// Last 30 days
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const last30Days = allEntries.filter(e => new Date(e.startTime) >= thirtyDaysAgo);
		const daysWorked = new Set(last30Days.map(e => new Date(e.startTime).toDateString())).size;
		const avgHours = daysWorked > 0 ? last30Days.reduce((sum, e) => sum + e.duration, 0) / daysWorked : 0;

		// Update stat cards
		document.getElementById('report-total-hours').textContent = totalHours.toFixed(1);
		document.getElementById('report-total-earnings').textContent = this.formatCurrency(totalEarnings);
		document.getElementById('report-avg-hours').textContent = avgHours.toFixed(1);
		document.getElementById('report-days-worked').textContent = daysWorked;

		// Render report chart if canvas exists
		const reportCanvas = document.getElementById('report-chart');
		if (reportCanvas) {
			this.initReportChart();
		}
	},

	initReportChart() {
		const canvas = document.getElementById('report-chart');
		if (!canvas) return;

		const ctx = canvas.getContext('2d');

		// Get last 12 months data
		const monthlyData = this.getMonthlyData();

		if (window.reportChart) {
			window.reportChart.destroy();
		}

		window.reportChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: monthlyData.labels,
				datasets: [
					{
						label: 'Hours',
						data: monthlyData.hours,
						borderColor: '#3d7eff',
						backgroundColor: 'rgba(61, 126, 255, 0.1)',
						tension: 0.4
					},
					{
						label: 'Earnings',
						data: monthlyData.earnings,
						borderColor: '#00cfde',
						backgroundColor: 'rgba(0, 207, 222, 0.1)',
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				interaction: {
					mode: 'index',
					intersect: false
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left'
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						grid: {
							drawOnChartArea: false
						}
					}
				}
			}
		});
	},

	getMonthlyData() {
		const now = new Date();
		const labels = [];
		const hours = [];
		const earnings = [];

		for (let i = 11; i >= 0; i--) {
			const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
			labels.push(month.toLocaleDateString('en-US', { month: 'short' }));

			const monthEntries = this.timeEntries.filter(e => {
				const eDate = new Date(e.startTime);
				return eDate.getMonth() === month.getMonth() && eDate.getFullYear() === month.getFullYear();
			});

			hours.push(monthEntries.reduce((sum, e) => sum + e.duration, 0));
			earnings.push(monthEntries.reduce((sum, e) => sum + e.earnings, 0));
		}

		return { labels, hours, earnings };
	},

	// ============================================
	// SETTINGS PAGE
	// ============================================

	renderSettings() {
		// Populate settings fields
		document.getElementById('settings-hourly-rate').value = this.settings.hourlyRate;
		document.getElementById('settings-overtime-multiplier').value = this.settings.overtimeMultiplier;
		document.getElementById('settings-overtime-threshold').value = this.settings.overtimeThreshold;
		document.getElementById('settings-weekly-target').value = this.settings.weeklyTarget;
		document.getElementById('settings-currency').value = this.settings.currencySymbol;
		document.getElementById('settings-time-format').value = this.settings.timeFormat;

		// Calculate storage used
		const dataSize = new Blob([localStorage.getItem('timevault_data') || '']).size;
		document.getElementById('storage-used').textContent = `${(dataSize / 1024).toFixed(2)} KB`;

		// Add save settings listener
		document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
		document.getElementById('settings-export-data')?.addEventListener('click', () => this.exportData());
		document.getElementById('settings-import-data')?.addEventListener('click', () => document.getElementById('import-file').click());
		document.getElementById('settings-clear-data')?.addEventListener('click', () => {
			if (confirm('Are you sure you want to delete ALL your TimeVault data? This cannot be undone.')) {
				localStorage.removeItem('timevault_data');
				location.reload();
			}
		});
	},

	saveSettings() {
		this.settings.hourlyRate = parseFloat(document.getElementById('settings-hourly-rate').value) || 25;
		this.settings.overtimeMultiplier = parseFloat(document.getElementById('settings-overtime-multiplier').value) || 1.5;
		this.settings.overtimeThreshold = parseInt(document.getElementById('settings-overtime-threshold').value) || 40;
		this.settings.weeklyTarget = parseInt(document.getElementById('settings-weekly-target').value) || 40;
		this.settings.currencySymbol = document.getElementById('settings-currency').value || '$';
		this.settings.timeFormat = document.getElementById('settings-time-format').value || '12';

		this.saveToStorage();
		this.updateDashboard();
		this.showNotification('Settings Saved', 'Your settings have been updated successfully');
	},

	// ============================================
	// VIEW RENDERING STUBS
	// ============================================

	renderTimecard() {
		// Timecard rendering logic
		console.log('TimeVault: Rendering timecard view');
	},

	renderPayroll() {
		// Payroll rendering logic
		console.log('TimeVault: Rendering payroll view');
	},

	renderReports() {
		// Reports rendering logic
		console.log('TimeVault: Rendering reports view');
	},

	filterTimecard() {
		console.log('TimeVault: Filtering timecard');
	},

	updatePayrollView() {
		console.log('TimeVault: Updating payroll view');
	},

	filterReport() {
		console.log('TimeVault: Filtering report');
	},

	showAddEntryModal() {
		console.log('TimeVault: Show add entry modal');
		alert('Add Entry feature coming soon!');
	},

	exportPayrollPDF() {
		console.log('TimeVault: Exporting payroll PDF');
		alert('PDF Export feature coming soon!');
	},

	exportReportCSV() {
		console.log('TimeVault: Exporting report CSV');
		alert('CSV Export feature coming soon!');
	},

	exportData() {
		const data = localStorage.getItem('timevault_data');
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `timevault-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		this.showNotification('Data Exported', 'Your TimeVault data has been downloaded');
	},

	importData() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';
		input.onchange = (e) => {
			const file = e.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (event) => {
					try {
						const data = JSON.parse(event.target.result);
						localStorage.setItem('timevault_data', JSON.stringify(data));
						location.reload();
					} catch (error) {
						alert('Error importing data. Please check the file format.');
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	},

	toggleVoiceInput() {
		if (!this.voiceRecognition) {
			alert('Voice recognition is not supported in your browser');
			return;
		}

		if (this.aiConfig.isListening) {
			this.voiceRecognition.stop();
		} else {
			this.voiceRecognition.start();
		}
	},

	updateVoiceButton(isListening) {
		const voiceBtn = document.getElementById('voice-input-btn');
		if (voiceBtn) {
			if (isListening) {
				voiceBtn.classList.add('listening');
			} else {
				voiceBtn.classList.remove('listening');
			}
		}
	}
};


// Initialize TimeVault when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	TimeVault.init();
});
