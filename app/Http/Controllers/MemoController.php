<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Memo;
use App\Models\MemoSetting;
use App\Models\MemoTemplate;
use App\Models\User;
use App\Services\TelegramBotService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    protected TelegramBotService $telegramService;

    public function __construct(TelegramBotService $telegramService)
    {
        $this->telegramService = $telegramService;
    }

    /**
     * Display a listing of internal memorandums.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $canViewAll = $user->can('memo.view.all');
        $query = Memo::with('creator');

        // Unless granted memo.view.all, users only view their own saved memos
        if (!$canViewAll) {
            $query->where('created_by', $user->id);
        }

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('memo_id', 'like', "%{$search}%")
                  ->orWhere('sender_name', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%");
            });
        }

        // Department/Branch Filter
        if ($dept = $request->input('department')) {
            if ($dept !== 'all') {
                $query->where(function ($q) use ($dept) {
                    $q->whereJsonContains('departments', $dept)
                      ->orWhere('recipient_name', $dept);
                });
            }
        }

        // Tab Filtering
        $tab = $request->input('tab', 'all');
        if ($tab === 'my' && $isSuperAdmin) {
            $query->where('created_by', $user->id);
        }

        $memos = $query->orderBy('created_at', 'desc')->paginate(12)->withQueryString();

        // Format dates in paginated items to short date Y-m-d
        $memos->getCollection()->transform(function ($memo) {
            if ($memo->memo_date) {
                $memo->memo_date = $memo->memo_date->format('Y-m-d');
            }
            return $memo;
        });

        // Statistics
        if ($isSuperAdmin) {
            $totalMemos = Memo::count();
            $myMemosCount = Memo::where('created_by', $user->id)->count();
            $todayMemosCount = Memo::whereDate('created_at', now()->today())->count();
        } else {
            $totalMemos = Memo::where('created_by', $user->id)->count();
            $myMemosCount = $totalMemos;
            $todayMemosCount = Memo::where('created_by', $user->id)->whereDate('created_at', now()->today())->count();
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        $userSignature = [
            'signature_type' => $user->signature_type ?? 'typed',
            'signature_data' => $user->signature_data ?? $user->name,
        ];

        return Inertia::render('memos/index', [
            'memos' => $memos,
            'filters' => [
                'search' => $request->input('search', ''),
                'department' => $request->input('department', 'all'),
                'tab' => $tab,
            ],
            'stats' => [
                'total' => $totalMemos,
                'myCount' => $myMemosCount,
                'todayCount' => $todayMemosCount,
            ],
            'departments' => $departments,
            'branches' => $branches,
            'userSignature' => $userSignature,
            'isSuperAdmin' => $canViewAll,
        ]);
    }

    /**
     * Show form to create a new memorandum.
     */
    public function create(): Response
    {
        $user = Auth::user();
        $departments = Department::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $templates = MemoTemplate::where('user_id', $user->id)->latest()->get();
        $prefix = MemoSetting::getValue('MEMO_PREFIX', 'KCM');

        // User Branch
        $userBranch = $user->employee?->branch?->name;
        $senderNameWithBranch = $user->name . ($userBranch ? " ({$userBranch})" : '');

        // Generate draft ID
        $suggestedMemoId = $prefix . '-' . strtoupper(Str::random(6)) . '-' . date('Ymd');

        return Inertia::render('memos/create', [
            'departments' => $departments,
            'branches' => $branches,
            'userBranch' => $userBranch,
            'templates' => $templates,
            'suggestedMemoId' => $suggestedMemoId,
            'userDefaultSignature' => [
                'signature_type' => $user->signature_type ?? 'typed',
                'signature_data' => $user->signature_data ?? '',
                'sender_name' => $senderNameWithBranch,
                'sender_position' => $user->employee?->position?->name ?? 'Staff',
            ],
        ]);
    }

    /**
     * Store a newly created memorandum.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'memo_date' => 'required|date',
            'recipient_name' => 'required|string|max:255',
            'content' => 'required|string',
            'sender_name' => 'required|string|max:255',
            'sender_position' => 'nullable|string|max:255',
            'priority' => 'nullable|string',
            'departments' => 'nullable|array',
            'signature_type' => 'required|string',
            'signature_data' => 'nullable|string',
            'send_telegram' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        $prefix = MemoSetting::getValue('MEMO_PREFIX', 'KCM');
        $memoId = $request->input('memo_id') ?: ($prefix . '-' . strtoupper(Str::random(6)) . '-' . date('Ymd'));

        $sigType = $request->input('signature_type');
        $sigData = $request->input('signature_data');
        if (empty($sigData) || $sigType === 'default') {
            $sigType = $user->signature_type ?? 'typed';
            $sigData = $user->signature_data ?? $user->name;
        }

        // Auto-save captured signature to User Profile for future memos!
        if (!empty($sigData)) {
            $user->update([
                'signature_type' => $sigType,
                'signature_data' => $sigData,
            ]);
        }

        $memo = Memo::create([
            'memo_id' => $memoId,
            'title' => $request->input('title'),
            'memo_date' => $request->input('memo_date'),
            'sender_name' => $request->input('sender_name'),
            'sender_position' => $request->input('sender_position'),
            'recipient_name' => $request->input('recipient_name'),
            'content' => $request->input('content'),
            'priority' => $request->input('priority', 'normal'),
            'departments' => $request->input('departments', []),
            'cc_departments' => [],
            'signature_type' => $sigType,
            'signature_data' => $sigData,
            'status' => 'published',
            'telegram_status' => 'pending',
            'created_by' => $user->id,
            'created_by_username' => $user->name,
        ]);

        if ($request->boolean('send_telegram')) {
            $this->dispatchTelegramNotification($memo);
        }

        return redirect()->route('memos.show', $memo->id)->with('success', 'Internal Memorandum created successfully.');
    }

    /**
     * Display the specified memorandum.
     */
    public function show(Memo $memo): Response
    {
        $memo->load('creator');
        $user = Auth::user();
        
        if ($memo->created_by !== $user->id && !$user->can('memo.view.all')) {
            abort(403, 'Unauthorized action. You can only view your own memorandums.');
        }

        $companyName = MemoSetting::getValue('COMPANY_NAME', "KALDI'S COFFEE P.L.C.");
        $companyLogoUrl = MemoSetting::getValue('COMPANY_LOGO_URL') ?: '/images/logo.png';

        $canEdit = ($user->id === $memo->created_by) || $user->can('memo.edit');

        // Convert memo_date to clean short date string Y-m-d
        $memoArray = $memo->toArray();
        if ($memo->memo_date) {
            $memoArray['memo_date'] = $memo->memo_date->format('Y-m-d');
        }

        return Inertia::render('memos/show', [
            'memo' => $memoArray,
            'companyInfo' => [
                'name' => $companyName,
                'logo' => $companyLogoUrl,
            ],
            'userPermissions' => [
                'canEdit' => $canEdit,
            ],
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'signature_type' => $user->signature_type ?? 'typed',
                'signature_data' => $user->signature_data ?? $user->name,
            ]
        ]);
    }

    /**
     * Show form to edit the specified memorandum.
     */
    public function edit(Memo $memo): Response
    {
        $user = Auth::user();
        if ($memo->created_by !== $user->id && !$user->can('memo.edit')) {
            abort(403, 'Unauthorized action.');
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        $memoArray = $memo->toArray();
        if ($memo->memo_date) {
            $memoArray['memo_date'] = $memo->memo_date->format('Y-m-d');
        }

        return Inertia::render('memos/edit', [
            'memo' => $memoArray,
            'departments' => $departments,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified memorandum.
     */
    public function update(Request $request, Memo $memo)
    {
        $user = Auth::user();
        if ($memo->created_by !== $user->id && !$user->can('memo.edit')) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'memo_date' => 'required|date',
            'recipient_name' => 'required|string|max:255',
            'content' => 'required|string',
            'sender_name' => 'required|string|max:255',
            'sender_position' => 'nullable|string|max:255',
            'departments' => 'nullable|array',
            'signature_type' => 'required|string',
            'signature_data' => 'nullable|string',
        ]);

        $sigType = $request->input('signature_type');
        $sigData = $request->input('signature_data');
        if (!empty($sigData)) {
            $user->update([
                'signature_type' => $sigType,
                'signature_data' => $sigData,
            ]);
        }

        $memo->update($request->only([
            'title',
            'memo_date',
            'recipient_name',
            'content',
            'sender_name',
            'sender_position',
            'departments',
            'signature_type',
            'signature_data',
        ]));

        return redirect()->route('memos.show', $memo->id)->with('success', 'Memorandum updated successfully.');
    }

    /**
     * Delete the specified memorandum.
     */
    public function destroy(Memo $memo)
    {
        $user = Auth::user();
        if ($memo->created_by !== $user->id && !$user->can('memo.delete')) {
            abort(403, 'Unauthorized action.');
        }

        $memo->delete();

        return redirect()->route('memos.index')->with('success', 'Memorandum deleted successfully.');
    }

    /**
     * Dispatch Telegram Notification for memo.
     */
    public function sendTelegram(Memo $memo)
    {
        $sent = $this->dispatchTelegramNotification($memo);

        if ($sent) {
            return back()->with('success', 'Telegram notifications dispatched successfully.');
        }

        return back()->with('error', 'Failed to send Telegram notifications. Please ensure bot token and target chat IDs are configured.');
    }

    /**
     * Update current user default signature.
     */
    public function updateUserSignature(Request $request)
    {
        $request->validate([
            'signature_type' => 'required|string|in:typed,drawn',
            'signature_data' => 'required|string',
        ]);

        $user = Auth::user();
        $user->update([
            'signature_type' => $request->input('signature_type'),
            'signature_data' => $request->input('signature_data'),
        ]);

        return back()->with('success', 'Default signature updated successfully.');
    }

    /**
     * Internal helper to dispatch Telegram messages to relevant chats (Departments & Branches).
     */
    protected function dispatchTelegramNotification(Memo $memo): bool
    {
        try {
            $companyName = MemoSetting::getValue('COMPANY_NAME', "KALDI'S COFFEE P.L.C.");
            $memoDateStr = $memo->memo_date ? $memo->memo_date->format('M j, Y') : date('M j, Y');
            
            $text = "📄 <b>INTERNAL MEMORANDUM</b> 📄\n\n";
            $text .= "<b>Company:</b> " . e($companyName) . "\n";
            $text .= "<b>Memo ID:</b> <code>" . e($memo->memo_id) . "</code>\n";
            $text .= "<b>Subject:</b> " . e($memo->title) . "\n";
            $text .= "<b>Date:</b> " . e($memoDateStr) . "\n";
            $text .= "<b>From:</b> " . e($memo->sender_name) . "\n";
            $text .= "<b>To:</b> " . e($memo->recipient_name) . "\n\n";
            $text .= "🌐 <a href=\"" . route('memos.show', $memo->id) . "\">Click here to view full memorandum</a>";

            $sentAny = false;
            $sentChatIds = [];

            // Extract and clean raw target strings (remove prefix emojis/labels)
            $rawTargets = $memo->departments ?? [];
            $cleanTargets = array_map(function ($t) {
                return trim(preg_replace('/^(🏢 Dept: |📍 Branch: |👤 User: )/u', '', (string)$t));
            }, is_array($rawTargets) ? $rawTargets : []);

            if (!empty($memo->recipient_name)) {
                $cleanTargets[] = trim(preg_replace('/^(🏢 Dept: |📍 Branch: |👤 User: )/u', '', (string)$memo->recipient_name));
            }

            $cleanTargets = array_unique(array_filter($cleanTargets));

            if (!empty($cleanTargets)) {
                // 1. Check Departments with telegram_chat_id
                $depts = Department::whereIn('name', $cleanTargets)->orWhereIn('id', $cleanTargets)->get();
                foreach ($depts as $dept) {
                    if (!empty($dept->telegram_chat_id) && !in_array($dept->telegram_chat_id, $sentChatIds)) {
                        $res = $this->telegramService->sendMemoBotMessage($dept->telegram_chat_id, $text);
                        if ($res) {
                            $sentAny = true;
                            $sentChatIds[] = $dept->telegram_chat_id;
                        }
                    }
                }

                // 2. Check Branches with telegram_chat_id
                $branches = Branch::whereIn('name', $cleanTargets)->orWhereIn('id', $cleanTargets)->get();
                foreach ($branches as $branch) {
                    if (!empty($branch->telegram_chat_id) && !in_array($branch->telegram_chat_id, $sentChatIds)) {
                        $res = $this->telegramService->sendMemoBotMessage($branch->telegram_chat_id, $text);
                        if ($res) {
                            $sentAny = true;
                            $sentChatIds[] = $branch->telegram_chat_id;
                        }
                    }
                }

                // 3. Check Individual Users with telegram_chat_id
                $users = User::whereIn('name', $cleanTargets)->orWhereIn('id', $cleanTargets)->get();
                foreach ($users as $u) {
                    if (!empty($u->telegram_chat_id) && !in_array($u->telegram_chat_id, $sentChatIds)) {
                        $res = $this->telegramService->sendMemoBotMessage($u->telegram_chat_id, $text);
                        if ($res) {
                            $sentAny = true;
                            $sentChatIds[] = $u->telegram_chat_id;
                        }
                    }
                }
            }

            // Fallback: If no specific group/user was matched, attempt sending to all linked branch channels
            if (!$sentAny) {
                $allLinkedBranches = Branch::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->get();
                foreach ($allLinkedBranches as $b) {
                    if (!in_array($b->telegram_chat_id, $sentChatIds)) {
                        $res = $this->telegramService->sendMemoBotMessage($b->telegram_chat_id, $text);
                        if ($res) {
                            $sentAny = true;
                            $sentChatIds[] = $b->telegram_chat_id;
                        }
                    }
                }
            }

            if ($sentAny) {
                $memo->update(['telegram_status' => 'sent']);
            }

            return $sentAny;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Memo Telegram Error: " . $e->getMessage());
            return false;
        }
    }
}
