import { SuccessModal } from '@/components/tickets/success-modal';
import { StatusBadge } from '@/components/tickets/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  User,
  Tag,
  AlertCircle,
  Calendar,
  CheckCircle2,
  MessageSquare,
  History,
  Star,
  ArrowLeft,
  ChevronRight,
  UserPlus,
  Trash2,
  Check,
  ChevronsUpDown,
  ShoppingBag,
  Download,
  Wrench,
  Users,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopupNotification } from '@/components/shared/popup-notification';

type Activity = {
  id: number;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  created_at: string;
  user?: { name: string };
  meta?: Record<string, unknown>;
};

type StatusHistory = {
  id: number;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
  user?: { name: string };
};

type Ticket = {
  id: number;
  title: string;
  description: string;
  image_path?: string | null;
  image_url?: string | null;
  status: string;
  severity: string;
  ticket_main_category_id: number;
  priority: string;
  department_id: number;
  department?: { name: string };
  mainCategory?: { name: string };
  subCategory?: { name: string };
  main_category?: { name: string };
  sub_category?: { name: string };
  asset?: { id?: number; name: string; bar_code?: string | null; article_code?: string | null } | null;
  created_at: string;
  assigned_at?: string | null;
  in_progress_at?: string | null;
  done_at?: string | null;
  closed_at?: string | null;
  requestor_full_name?: string;
  requestor_phone?: string | null;
  requestor_department_id?: number | null;
  requestor_branch_id?: number | null;
  requestor_branch?: { name: string };
  requestor_department?: { name: string };
  requestorBranch?: { name: string };
  requestorDepartment?: { name: string };
  beneficiary_branch?: { name: string } | null;
  beneficiaryBranch?: { name: string } | null;
  beneficiary_department?: { name: string } | null;
  beneficiaryDepartment?: { name: string } | null;
  fiscal_year?: { name: string } | null;
  fiscalYear?: { name: string } | null;
  fiscal_month?: { name: string } | null;
  fiscalMonth?: { name: string } | null;
  activity_logs: Activity[];
  status_history: StatusHistory[];
  preferred_deadline?: string | null;
  deadline?: string | null;
  ratings: { stars: number; comment?: string | null }[];
  product_requests?: {
    id: number;
    product?: {
      product_name: string;
      product_code?: string | null;
      child_category?: { child_name: string } | null;
    } | null;
    spare_part?: {
      name: string;
      article_code?: string | null;
      category?: { name: string } | null;
    } | null;
    quantity: string;
    uom?: string | null;
  }[];
};

type AssetOption = {
  id: number;
  name: string;
  bar_code?: string | null;
  article_code?: string | null;
};

type PageProps = {
  ticket: Ticket;
  statuses: string[];
  currentAssignment?: { assignee?: { id: number; name: string; email?: string } } | null;
  staffOptions: { id: number; name: string; email: string }[];
  priorityOptions: string[];
  assetOptions: AssetOption[];
  abilities: { canAssign: boolean; canUpdateStatus: boolean; canRate: boolean; hasRated: boolean; isRequestor: boolean; canApproveReject: boolean; canDelete: boolean; canUpdateAsset: boolean; canUpdateDeadline: boolean; canUpdatePriority: boolean; hasManagerPower: boolean; canRequestSparePart: boolean };
  flash: { message: string | null; just_created?: boolean | null };
};

export default function TicketShow() {
  const { ticket, statuses, currentAssignment, abilities, staffOptions, assetOptions, priorityOptions, flash } = usePage<PageProps>().props;

  const remainingStatuses = React.useMemo(() => {
    return (statuses ?? []).filter((s) => s !== 'in_progress' && s !== ticket.status);
  }, [statuses, ticket.status]);

  const { data: updateData, setData: setUpdateData, post: postQuickUpdate, processing: updatingQuick, errors: updateErrors } = useForm({
    status: (statuses ?? []).filter((s) => s !== 'in_progress' && s !== ticket.status)[0] ?? '',
    assigned_to: currentAssignment?.assignee?.id?.toString() ?? '',
    comment: '',
  });

  const [isUpdateModalOpen, setIsUpdateModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (isUpdateModalOpen) {
      const defaultStatus = remainingStatuses[0] ?? '';
      setUpdateData((prev) => ({
        ...prev,
        status: remainingStatuses.includes(prev.status) ? prev.status : defaultStatus,
      }));
    }
  }, [isUpdateModalOpen, remainingStatuses]);
  const [successModal, setSuccessModal] = React.useState<{
    open: boolean;
    title?: string;
    description?: string;
    status?: string | null;
    assigneeName?: string | null;
  }>({ open: false });

  const handleQuickUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postQuickUpdate(route('tickets.quick-update', ticket.id), {
      onSuccess: () => {
        setIsUpdateModalOpen(false);
        if (updateData.status === 'ticket_approved') {
          setIsRatingModalOpen(true);
          setSuccessModal({ open: false });
        } else {
          const assignedStaff = staffOptions.find((s) => String(s.id) === updateData.assigned_to)?.name;
          const isAssigning = !!updateData.assigned_to && updateData.assigned_to !== (currentAssignment?.assignee?.id?.toString() ?? '');
          const isStatusChanging = !!updateData.status && updateData.status !== ticket.status;

          setSuccessModal({
            open: true,
            title: isAssigning ? 'Technician Assigned Successfully' : isStatusChanging ? 'Status Updated Successfully' : 'Case Updated Successfully',
            description: isAssigning
              ? 'The ticket technician assignment has been updated to:'
              : isStatusChanging
              ? 'The ticket status has been changed to:'
              : 'Your case update has been recorded successfully.',
            status: updateData.status || ticket.status,
            assigneeName: assignedStaff ?? currentAssignment?.assignee?.name ?? null,
          });
        }
      },
    });
  };

  const { data: assignData, setData: setAssignData, post: postAssign, processing: assigning } = useForm({
    assigned_to: currentAssignment?.assignee?.id?.toString() ?? '',
  });

  const { data: ratingData, setData: setRatingData, post: postRating, processing: ratingProcessing } = useForm({
    stars: 0,
    comment: '',
  });

  const { data: assetData, setData: setAssetData, post: postAsset, processing: assetProcessing } = useForm({
    ticket_asset_id: ticket.asset?.id?.toString() ?? '',
  });

  const { data: deadlineData, setData: setDeadlineData, post: postDeadline, processing: deadlineProcessing } = useForm({
    deadline: ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '',
  });

  const { data: priorityData, setData: setPriorityData, post: postPriority, processing: updatingPriority } = useForm({
    priority: ticket.priority ?? 'medium',
  });

  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [isRatingModalOpen, setIsRatingModalOpen] = React.useState(false);
  const [assetOpen, setAssetOpen] = React.useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = React.useState(false);

  const groupedProducts = React.useMemo(() => {
    if (!ticket.product_requests) return {};
    return ticket.product_requests.reduce((acc, req) => {
      const catName = req.spare_part
        ? (req.spare_part.category?.name || 'Uncategorized Spare Parts')
        : (req.product?.child_category?.child_name || 'Uncategorized Products');
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(req);
      return acc;
    }, {} as Record<string, typeof ticket.product_requests>);
  }, [ticket.product_requests]);

  React.useEffect(() => {
    if (abilities.canRate && ticket.status === 'ticket_approved') {
      setIsRatingModalOpen(true);
      setSuccessModal({ open: false });
      return;
    }

    if (flash?.just_created) {
      setSuccessModal({
        open: true,
        title: 'Ticket Submitted Successfully',
        description: 'Your ticket has been created and is now:',
        status: ticket.status,
      });
    } else if (flash?.message && ticket.status !== 'ticket_approved') {
      const msg = flash.message.toLowerCase();
      const isAssign = msg.includes('assign');
      const isStatus = msg.includes('status') || msg.includes('case');
      setSuccessModal({
        open: true,
        title: isAssign ? 'Technician Assigned Successfully' : isStatus ? 'Status Updated Successfully' : 'Action Completed Successfully',
        description: isAssign
          ? 'The ticket technician assignment is now:'
          : isStatus
          ? 'The ticket status has been changed to:'
          : flash.message,
        status: ticket.status,
        assigneeName: currentAssignment?.assignee?.name ?? null,
      });
    }
  }, [flash?.just_created, flash?.message, ticket.status, currentAssignment, abilities.canRate]);

  const submitAsset = () => {
    postAsset(route('tickets.update-asset', ticket.id));
  };

  const submitDeadline = () => {
    postDeadline(route('tickets.update-deadline', ticket.id));
  };

  const submitPriority = () => {
    postPriority(route('tickets.update-priority', ticket.id));
  };

  const submitRating = (e: React.FormEvent) => {
    e.preventDefault();
    postRating(route('tickets.rate', ticket.id), {
      onSuccess: () => {
        setIsRatingModalOpen(false);
        setSuccessModal({
          open: true,
          title: 'Rating Submitted Successfully',
          description: 'Thank you for your feedback! The department manager will be notified to officially close the ticket.',
          status: 'ticket_approved',
        });
      },
    });
  };

  const approveCompletion = () => {
    let nextStatus = 'approved';
    if (ticket.status === 'done') {
      nextStatus = abilities.hasManagerPower ? 'closed' : 'ticket_approved';
    } else if (ticket.status === 'ticket_approved') {
      nextStatus = 'closed';
    }
    router.post(route('tickets.approve-completion', ticket.id), {}, {
      onSuccess: () => {
        if (!abilities.hasManagerPower) {
          setIsRatingModalOpen(true);
          setSuccessModal({ open: false });
        } else {
          setSuccessModal({
            open: true,
            title: 'Status Updated Successfully',
            description: 'The ticket status has been changed to:',
            status: nextStatus,
          });
        }
      }
    });
  };

  const rejectCompletion = () => {
    setIsRejectModalOpen(true);
  };

  const confirmRejection = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    const nextStatus = ticket.status === 'pending_approval' ? 'rejected' : 'in_progress';
    router.post(route('tickets.reject-completion', ticket.id), { reason: rejectReason }, {
      onSuccess: () => {
        setIsRejectModalOpen(false);
        setRejectReason('');
        setSuccessModal({
          open: true,
          title: 'Status Updated Successfully',
          description: 'The ticket status has been changed to:',
          status: nextStatus,
        });
      }
    });
  };

  const deleteTicket = () => {
    if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      router.delete(route('tickets.destroy', ticket.id));
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Tickets', href: '/tickets' },
    { title: `#${ticket.id}`, href: `/tickets/${ticket.id}` },
  ];

  const avgRating =
    ticket.ratings && ticket.ratings.length
      ? ticket.ratings.reduce((acc, r) => acc + r.stars, 0) / ticket.ratings.length
      : null;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Ticket #${ticket.id} - ${ticket.main_category?.name ?? ticket.mainCategory?.name ?? ticket.title}`} />

      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="font-mono font-medium">#{ticket.id}</span>
              <ChevronRight className="h-4 w-4" />
              <span>{ticket.department?.name}</span>
              {ticket.priority && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors tracking-wider border shadow-sm ${ticket.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200 ring-red-500/10' :
                    ticket.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/10' :
                      ticket.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10' :
                        'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10'
                    }`}>
                    {ticket.priority} Priority
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {ticket.main_category?.name ?? ticket.mainCategory?.name ?? ticket.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href={route('tickets.index')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Workflow Progress Stepper */}
        <Card className="mb-6 border-slate-200 shadow-sm bg-slate-50/50">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Case Workflow Lifecycle Progress</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { key: 'created', label: '1. Ticket Created', done: true },
                { key: 'assigned', label: '2. Assigned Technical', done: ['in_progress', 'hold', 'escalated', 'done', 'ticket_approved', 'closed'].includes(ticket.status) },
                { key: 'done', label: '3. Technical Done', done: ['done', 'ticket_approved', 'closed'].includes(ticket.status) },
                { key: 'approved', label: '4. Branch Approved', done: ['ticket_approved', 'closed'].includes(ticket.status) },
                { key: 'closed', label: '5. Manager Closed', done: ticket.status === 'closed' },
              ].map((step, idx) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    step.done
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 opacity-70'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0 ${
                      step.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span className="truncate">{step.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Primary Management Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      ticket.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 border-t pt-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Category:</span>
                  <span className="text-sm">{ticket.main_category?.name ?? ticket.mainCategory?.name ?? '—'}</span>
                </div>
                {(ticket.main_category?.name ?? ticket.mainCategory?.name) !== 'Purchase Request' && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sub Category:</span>
                    <span className="text-sm">{ticket.sub_category?.name ?? ticket.subCategory?.name ?? '—'}</span>
                  </div>
                )}

                {(ticket.fiscal_year?.name ?? ticket.fiscalYear?.name) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Fiscal Period:</span>
                    <span className="text-sm">
                      {ticket.fiscal_year?.name ?? ticket.fiscalYear?.name}
                      {(ticket.fiscal_month?.name ?? ticket.fiscalMonth?.name) && ` — ${ticket.fiscal_month?.name ?? ticket.fiscalMonth?.name}`}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Requested For Branch
                    </span>
                    <span className="text-sm font-semibold text-primary">{ticket.beneficiary_branch?.name ?? ticket.beneficiaryBranch?.name ?? '—'}</span>
                  </div>
                  {(ticket.beneficiary_department?.name ?? ticket.beneficiaryDepartment?.name) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Requested For Dept
                      </span>
                      <span className="text-sm font-semibold">{ticket.beneficiary_department?.name ?? ticket.beneficiaryDepartment?.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t pt-3">
                  {ticket.preferred_deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Preferred Deadline
                      </span>
                      <span className="text-sm font-medium text-blue-600">
                        {new Date(ticket.preferred_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Deadline
                      </span>
                      {!abilities.canUpdateDeadline && (
                        <span className="text-sm font-medium text-indigo-600">
                          {ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'Not Set'}
                        </span>
                      )}
                    </div>
                    {abilities.canUpdateDeadline && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          className="h-8 text-xs flex-1"
                          value={deadlineData.deadline}
                          onChange={(e) => setDeadlineData('deadline', e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                          onClick={submitDeadline}
                          disabled={deadlineProcessing}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Severity
                  </span>
                  <span className={`text-sm font-semibold ${getSeverityClass(ticket.severity)}`}>
                    {ticket.severity}
                  </span>
                </div>
                {['127', '13706'].includes(String(ticket.department_id)) && (ticket.asset || abilities.canUpdateAsset) && (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Asset
                    </span>
                    {ticket.asset && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{ticket.asset.name}</span>
                        {ticket.asset.bar_code && (
                          <span className="text-[11px] text-muted-foreground">Bar Code: {ticket.asset.bar_code}</span>
                        )}
                        {ticket.asset.article_code && (
                          <span className="text-[11px] text-muted-foreground">Article Code: {ticket.asset.article_code}</span>
                        )}
                      </div>
                    )}
                    {abilities.canUpdateAsset && (
                      <div className="mt-1 flex flex-col gap-2">
                        <Popover open={assetOpen} onOpenChange={setAssetOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={assetOpen}
                              className="w-full justify-between font-normal h-9 text-sm"
                            >
                              <span className="truncate">
                                {assetData.ticket_asset_id
                                  ? assetOptions.find((a) => String(a.id) === assetData.ticket_asset_id)?.name
                                  : "— No asset —"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command filter={(value, search) => {
                              if (value.toLowerCase().includes(search.toLowerCase())) return 1
                              return 0
                            }}>
                              <CommandInput placeholder="Search assets..." />
                              <CommandList className="max-h-[200px]">
                                <CommandEmpty>No asset found.</CommandEmpty>
                                <CommandGroup>
                                  <div className="flex items-center px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                                    <div className="mr-6 w-4"></div>
                                    <div className="grid grid-cols-6 gap-2 w-full">
                                      <span className="col-span-3">Name</span>
                                      <span className="col-span-1.5">Article</span>
                                      <span className="col-span-1.5 text-right">Barcode</span>
                                    </div>
                                  </div>
                                  <CommandItem
                                    value="none"
                                    onSelect={() => {
                                      setAssetData('ticket_asset_id', "");
                                      setAssetOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 shrink-0 ${!assetData.ticket_asset_id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    <div className="grid grid-cols-6 gap-2 w-full text-xs">
                                      <span className="col-span-full italic text-muted-foreground">— No asset —</span>
                                    </div>
                                  </CommandItem>
                                  {assetOptions.map((a) => (
                                    <CommandItem
                                      key={a.id}
                                      value={`${a.name} ${a.bar_code || ''} ${a.article_code || ''}`}
                                      onSelect={() => {
                                        setAssetData('ticket_asset_id', String(a.id));
                                        setAssetOpen(false);
                                      }}
                                      className="flex items-center"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 shrink-0 ${assetData.ticket_asset_id === String(a.id) ? "opacity-100" : "opacity-0"}`}
                                      />
                                      <div className="grid grid-cols-6 gap-2 w-full text-xs">
                                        <span className="col-span-3 font-medium truncate">{a.name}</span>
                                        <span className="col-span-1.5 text-muted-foreground tabular-nums truncate">
                                          {a.article_code || "—"}
                                        </span>
                                        <span className="col-span-1.5 text-muted-foreground tabular-nums truncate text-right">
                                          {a.bar_code || "—"}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={submitAsset}
                          disabled={assetProcessing}
                        >
                          Save Asset
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="pb-3 border-b bg-primary/5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Stakeholders
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Requestor</p>
                  <p className="text-sm font-bold text-foreground">{ticket.requestor_full_name ?? 'Unknown User'}</p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {ticket.requestor_department?.name ?? 'No Department'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {ticket.requestor_branch?.name ?? 'No Branch'}
                    </p>
                    <p className="text-xs text-muted-foreground">{ticket.requestor_phone ?? 'No contact info'}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Assignee</p>
                  {currentAssignment?.assignee ? (
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      {currentAssignment.assignee.name}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-orange-600 italic">Unassigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Section */}
            {(abilities.canUpdateStatus || abilities.canAssign || abilities.canRate || abilities.canApproveReject || abilities.canDelete) && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Actions</h3>

                {(abilities.canUpdateStatus || abilities.canAssign || abilities.canApproveReject || (statuses && statuses.length > 0)) && (
                  <Button
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="w-full h-11 text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors rounded-lg shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="size-4" />
                    Update Case
                  </Button>
                )}



                {abilities.canUpdatePriority && (
                  <Card className="border-orange-200 shadow-sm overflow-hidden bg-orange-50/20">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700">
                        <AlertCircle className="h-4 w-4" />
                        Manage Priority
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="flex-1 w-full space-y-1">
                          <Label htmlFor="priority" className="text-[10px] text-muted-foreground uppercase font-bold px-1">Priority Level</Label>
                          <Select value={priorityData.priority} onValueChange={(v) => setPriorityData('priority', v)}>
                            <SelectTrigger id="priority" className="h-9 text-sm bg-background/50">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold h-9"
                          onClick={submitPriority}
                          disabled={updatingPriority}
                        >
                          Update
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {abilities.canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center justify-center gap-2 mt-4"
                    onClick={deleteTicket}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Ticket
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Secondary Details & History */}
          <div className="space-y-6">
            {ticket.description && (
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Description</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="whitespace-pre-wrap text-base font-bold leading-relaxed text-emerald-700 dark:text-emerald-400">
                    {ticket.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {(ticket.image_url || ticket.image_path) && (
              <Card className="overflow-hidden border-none shadow-md">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Attached Photo</CardTitle>
                    </div>
                    <a
                      href={ticket.image_url || `/storage/${ticket.image_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      View Full Image ↗
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex justify-center bg-slate-900/5 p-4 rounded-b-lg">
                  <img
                    src={ticket.image_url || `/storage/${ticket.image_path}`}
                    alt="Ticket Attachment"
                    className="max-h-96 w-auto rounded-lg object-contain border border-slate-200 shadow-sm"
                  />
                </CardContent>
              </Card>
            )}

            {ticket.product_requests && ticket.product_requests.length > 0 && (
              <>
                <Card className="border-none shadow-md overflow-hidden bg-primary/5 border border-primary/10">
                  <CardHeader className="pb-3 border-b border-primary/10 bg-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-bold">
                          {ticket.product_requests.some(r => r.spare_part) ? 'Requested Spare Parts' : 'Requested Products'}
                        </CardTitle>
                      </div>
                      <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {ticket.product_requests.length} Items
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="default"
                      className="flex-1 h-11 font-bold shadow-sm"
                      onClick={() => setIsProductsModalOpen(true)}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      View Detailed List
                    </Button>

                    <Button asChild variant="outline" className="flex-1 h-11 border-primary/20 bg-background hover:bg-muted text-primary font-bold shadow-sm">
                      <a href={route('tickets.download-products', ticket.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Dialog open={isProductsModalOpen} onOpenChange={setIsProductsModalOpen}>
                  <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 border-b bg-muted/30">
                      <DialogTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                        {ticket.product_requests?.some(r => r.spare_part) ? 'Requested Spare Parts' : 'Requested Products'}
                      </DialogTitle>
                      <DialogDescription>
                        Items requested for Ticket #{ticket.id}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-muted/50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left font-semibold border-r w-1/4">Category</th>
                            <th className="px-6 py-3 text-left font-semibold">Product</th>
                            <th className="px-6 py-3 text-right font-semibold">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[13px]">
                          {Object.entries(groupedProducts).map(([category, products]) => (
                            <React.Fragment key={category}>
                              {products.map((req, idx) => (
                                <tr key={req.id} className="hover:bg-muted/5 transition-colors group">
                                  {idx === 0 && (
                                    <td
                                      rowSpan={products.length}
                                      className="px-6 py-4 align-top border-r bg-muted/20"
                                    >
                                      <div className="flex flex-col gap-1 mt-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground leading-tight">
                                          {category}
                                        </span>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-foreground">
                                        {req.spare_part ? req.spare_part.name : (req.product?.product_name || 'Unknown Item')}
                                      </span>
                                      {(req.spare_part?.article_code || req.product?.product_code) && (
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                          Code: {req.spare_part?.article_code || req.product?.product_code}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-sm font-black text-primary">
                                        {req.quantity}
                                      </span>
                                      {req.uom && (
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                          {req.uom}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {abilities.hasManagerPower && (
                      <DialogFooter className="p-4 border-t bg-muted/30">
                        <Button asChild variant="default" className="w-full sm:w-auto">
                          <a href={route('tickets.download-products', ticket.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF Version
                          </a>
                        </Button>
                      </DialogFooter>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}

            <Card className="border-none shadow-md">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Activity History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[17px] before:w-0.5 before:bg-muted">
                  {ticket.activity_logs.length > 0 ? (
                    ticket.activity_logs.map((log) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-background border shadow-sm">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex flex-col rounded-lg border bg-card p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm capitalize">{log.action.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.user?.name ? (
                              <span className="font-medium text-foreground">{log.user.name}</span>
                            ) : (
                              <span className="italic">System</span>
                            )}
                            {log.reason && (
                              <div className="mt-2 text-xs italic bg-muted/50 p-2 rounded border-l-2 border-primary/50">
                                "{log.reason}"
                              </div>
                            )}
                            {log.old_status && log.new_status && (
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="px-1.5 py-0.5 rounded bg-muted">{log.old_status}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{log.new_status}</span>
                              </div>
                            )}
                            {log.action === 'priority_updated' && log.meta && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Priority changed from</span>
                                <span className="font-bold uppercase">{(log.meta as any).old_priority}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="font-bold uppercase text-foreground">{(log.meta as any).new_priority}</span>
                              </div>
                            )}
                            {log.action === 'created' && (log.meta as any)?.priority && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Set with <span className="font-bold uppercase">{(log.meta as any).priority}</span> priority
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground italic text-sm">No activity recorded yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rating Result Card - visible to everyone when rated */}
            {ticket.ratings && ticket.ratings.length > 0 && (
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b bg-yellow-50/50 dark:bg-yellow-900/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <CardTitle className="text-lg">Service Rating</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-8 w-8 ${(ticket.ratings[0].stars / 3) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {Math.round(ticket.ratings[0].stars / 3)} <span className="text-base font-normal text-muted-foreground">/ 5</span>
                    </span>
                    {ticket.ratings[0].comment && (
                      <div className="w-full mt-2 bg-muted/40 rounded-lg p-4 border border-yellow-100">
                        <p className="text-sm text-muted-foreground italic text-center">
                          "{ticket.ratings[0].comment}"
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for Rejection</DialogTitle>
            <DialogDescription>
              Please provide a clear reason why this request or completion is being rejected. This will be visible in the activity history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason" className="sr-only">Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter rejection reason here..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[120px]"
              autoFocus
            />
          </div>
          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 font-bold"
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Success Modal ("System Toaster") */}
      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false })}
        title={successModal.title}
        description={successModal.description}
        status={successModal.status}
        assigneeName={successModal.assigneeName}
      />

      {/* Rating Modal */}
      <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex flex-col items-center gap-2 pt-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-2">
              <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
            </div>
            <DialogTitle className="text-xl text-center">Rate Service Quality</DialogTitle>
            <DialogDescription className="text-center">
              Please take a moment to rate the quality of service provided for this ticket.
              Your feedback helps us improve our support.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">How would you rate the resolution?</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingData('stars', star * 3)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-10 w-10 ${(ratingData.stars / 3) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200 fill-gray-200'
                        }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold text-yellow-700">
                {ratingData.stars === 0 ? 'Select a rating' : `${ratingData.stars / 3} / 5 Stars`}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Any additional comments? (Optional)</span>
              <Textarea
                placeholder="Share your experience..."
                className="min-h-[100px] resize-none"
                value={ratingData.comment || ''}
                onChange={(e) => setRatingData('comment', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              onClick={submitRating}
              disabled={ratingProcessing || ratingData.stars === 0}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Case Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-background rounded-xl border shadow-xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Update Case
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickUpdateSubmit} className="space-y-4 pt-3">
            {/* Progress / Status dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Progress / Status</label>
              <select
                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={updateData.status}
                onChange={(e) => setUpdateData('status', e.target.value)}
              >
                {remainingStatuses.length === 0 ? (
                  <option value="">No other status transitions available</option>
                ) : (
                  remainingStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))
                )}
              </select>
              {updateErrors.status && <p className="text-xs text-red-500">{updateErrors.status}</p>}
            </div>

            {/* Assignee selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80">Assignee</label>
                {!abilities.canAssign && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="size-3" /> Manager Only
                  </span>
                )}
              </div>

              {!abilities.canAssign ? (
                <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200 flex items-center gap-2.5">
                  <Lock className="size-4 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {currentAssignment?.assignee?.name
                      ? `${currentAssignment.assignee.name} ${currentAssignment.assignee.email ? `(${currentAssignment.assignee.email})` : ''}`
                      : 'Unassigned (Manager assignment required)'}
                  </span>
                </div>
              ) : (
                <select
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={updateData.assigned_to}
                  onChange={(e) => setUpdateData('assigned_to', e.target.value)}
                >
                  <option value="">Select staff member...</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              )}
              {updateErrors.assigned_to && <p className="text-xs text-red-500">{updateErrors.assigned_to}</p>}
            </div>

            {/* Comment / Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Comment / Reason</label>
              <Textarea
                placeholder="Add update note or reason..."
                value={updateData.comment}
                onChange={(e) => setUpdateData('comment', e.target.value)}
                className="min-h-[90px] border-input rounded-lg text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              {(updateErrors.comment || (updateErrors as any).reason) && (
                <p className="text-xs font-semibold text-red-500">{updateErrors.comment || (updateErrors as any).reason}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateModalOpen(false)}
                className="flex-1 h-10 font-semibold border-input hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingQuick}
                className="flex-1 h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg shadow-sm"
              >
                {updatingQuick ? 'Saving...' : 'Update Case'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case 'created': return <MessageSquare className="h-4 w-4 text-primary" />;
    case 'status_changed': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'assigned': return <UserPlus className="h-4 w-4 text-purple-500" />;
    case 'rated': return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected': return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    case 'closed': return <CheckCircle2 className="h-4 w-4 text-indigo-500" />;
    case 'asset_updated': return <Tag className="h-4 w-4 text-teal-500" />;
    case 'deadline_updated': return <Calendar className="h-4 w-4 text-orange-500" />;
    case 'priority_updated': return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getSeverityClass(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical': return 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase text-[10px]';
    case 'high': return 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase text-[10px]';
    case 'medium': return 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase text-[10px]';
    default: return 'text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase text-[10px]';
  }
}
