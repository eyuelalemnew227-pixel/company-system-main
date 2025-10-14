import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function MyResultsShow({ response }: { response: any }) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const handleAccept = () => {
    router.post(`/my-results/${response.id}/accept`, {}, {
      onSuccess: () => {
        // Refresh the page to show updated status
      },
    });
  };
  
  const handleReject = () => {
    router.post(`/my-results/${response.id}/reject`, 
      { rejection_reason: rejectionReason },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectionReason('');
        },
      }
    );
  };
  const avg = response.question_responses.length
    ? (
        response.question_responses.reduce((acc: number, r: any) => acc + (r.score || 0), 0) /
        response.question_responses.length
      ).toFixed(2)
    : null;

  const getStatusBadge = () => {
    if (response.status === 'accepted') {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    } else if (response.status === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
          <AlertCircle className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    }
  };

  return (
    <AppLayout>
      <Head title="Evaluation Result" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card className="max-w-3xl">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Summary</CardTitle>
            <CardAction>
              <Link href={'/my-results'}>
                <Button variant={'default'}>Go Back</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <hr />
          <CardContent>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <div>Evaluation Period: {response.evaluation_period || 'N/A'}</div>
              <div>
                Evaluation Type:{' '}
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  response.evaluation_type === 'Personal' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {response.evaluation_type}
                </span>
              </div>
              <div>Average Score: {avg ?? 'N/A'}</div>
              <div className="flex items-center gap-2">
                Status: {getStatusBadge()}
              </div>
              {response.status === 'accepted' && response.accepted_at && (
                <div className="text-xs text-muted-foreground">Accepted on: {new Date(response.accepted_at).toLocaleString()}</div>
              )}
              {response.status === 'rejected' && response.rejected_at && (
                <div className="text-xs text-muted-foreground">Rejected on: {new Date(response.rejected_at).toLocaleString()}</div>
              )}
              {response.rejection_reason && (
                <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm dark:border-red-800 dark:bg-red-900/20">
                  <strong>Rejection Reason:</strong> {response.rejection_reason}
                </div>
              )}
            </div>
            
            {/* Accept/Reject Buttons */}
            {response.period_is_active && response.status === 'pending' && (
              // For department evaluations, check permission
              (response.evaluation_type === 'Personal' || response.can_accept_reject_department) ? (
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button onClick={() => setShowRejectDialog(true)} variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-800 dark:bg-yellow-900/20">
                  <strong>Note:</strong> You do not have permission to accept or reject department evaluations. Please contact your administrator.
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card className="max-w-3xl">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Question Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {response.question_responses.map((qr: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between rounded border p-3">
                  <div className="pr-4">{qr.question_text}</div>
                  <div className="font-medium">{qr.score}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Evaluation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this evaluation (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection_reason">Rejection Reason</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter your reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


