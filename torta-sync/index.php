<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kaldis Torta Orders Sync</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; }
        .glass {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-6">
    <div class="max-w-xl w-full">
        <div class="glass rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <!-- Decorative Background Element -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-amber-100 rounded-full opacity-50 blur-3xl"></div>
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>

            <div class="relative">
                <div class="flex items-center gap-4 mb-8">
                    <div class="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-200">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight text-slate-800">Torta Sync</h1>
                        <p class="text-slate-500 text-sm font-medium uppercase tracking-wider">Database Synchronizer</p>
                    </div>
                </div>

                <div class="p-6 rounded-2xl bg-white/50 border border-white/80 mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-slate-600 font-medium">Sync Status</span>
                        <span id="statusBadge" class="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full uppercase tracking-widest">Idle</span>
                    </div>
                    <div id="results" class="hidden">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p class="text-xs text-emerald-600 font-bold uppercase mb-1">Synced</p>
                                <p id="syncedCount" class="text-2xl font-bold text-emerald-700">0</p>
                            </div>
                            <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p class="text-xs text-amber-600 font-bold uppercase mb-1">Skipped</p>
                                <p id="skippedCount" class="text-2xl font-bold text-amber-700">0</p>
                            </div>
                        </div>
                        <p id="mainMessage" class="mt-4 text-sm text-slate-600"></p>
                    </div>
                    <div id="idleMessage" class="text-center py-4">
                        <p class="text-slate-400 italic">Click refresh to pull new torta orders into the system.</p>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <button id="syncBtn" onclick="runSync()" class="group relative w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] overflow-hidden">
                        <span id="btnText" class="relative z-10 flex items-center justify-center gap-2">
                            <svg class="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Orders
                        </span>
                        <div class="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                    
                    <a href="/pre-orders" class="text-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest flex items-center justify-center gap-1 group">
                        Back to Orders
                        <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
        
        <p class="text-center mt-8 text-slate-400 text-xs font-semibold uppercase tracking-[0.2em]">&copy; 2025 Kaldis Coffee Sync System</p>
    </div>

    <script>
        async function runSync() {
            const btn = document.getElementById('syncBtn');
            const btnText = document.getElementById('btnText');
            const statusBadge = document.getElementById('statusBadge');
            const results = document.getElementById('results');
            const idleMessage = document.getElementById('idleMessage');

            btn.disabled = true;
            btnText.innerHTML = `
                <svg class="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Syncing...
            `;
            statusBadge.className = 'px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest';
            statusBadge.innerText = 'Busy';

            try {
                const response = await fetch('sync.php');
                const data = await response.json();

                idleMessage.classList.add('hidden');
                results.classList.remove('hidden');

                if (data.status === 'success') {
                    statusBadge.className = 'px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-bold rounded-full uppercase tracking-widest';
                    statusBadge.innerText = 'Success';
                    document.getElementById('syncedCount').innerText = data.details.synced;
                    document.getElementById('skippedCount').innerText = data.details.skipped;
                    document.getElementById('mainMessage').innerText = data.message;
                } else {
                    statusBadge.className = 'px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full uppercase tracking-widest';
                    statusBadge.innerText = 'Error';
                    document.getElementById('mainMessage').innerText = data.message;
                    document.getElementById('mainMessage').classList.add('text-rose-600');
                }
            } catch (error) {
                statusBadge.className = 'px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full uppercase tracking-widest';
                statusBadge.innerText = 'Failed';
                alert('Connection error: ' + error.message);
            } finally {
                btn.disabled = false;
                btnText.innerHTML = `
                    <svg class="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Orders
                `;
            }
        }
    </script>
</body>
</html>
