import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle2, Send, User } from 'lucide-react';

export default function ForumThreadShow({ thread }: any) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Training Management', href: '/training/dashboard' },
    { title: 'Forums', href: '/training/forums' },
    { title: thread.title, href: `/training/forums/thread/${thread.id}` },
  ];

  const { data, setData, post, processing, reset } = useForm({
    body: '',
  });

  const { post: solutionPost } = useForm({});

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/training/forums/thread/${thread.id}/reply`, {
      onSuccess: () => reset(),
    });
  };

  const handleMarkSolution = (postId: number) => {
    solutionPost(`/training/forums/thread/${thread.id}/posts/${postId}/solution`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={thread.title} />
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        
        {/* Thread Title */}
        <div className="border-b pb-4">
          <Badge variant="outline" className="text-xs mb-1">{thread.forum?.course?.title}</Badge>
          <h1 className="text-2xl font-extrabold text-foreground">{thread.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Started by {thread.author?.name} • {new Date(thread.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Posts Stream */}
        <div className="space-y-4">
          {thread.posts?.map((postItem: any, idx: number) => (
            <Card
              key={postItem.id}
              className={`border transition-all ${
                postItem.is_solution
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-500'
                  : 'bg-card border-border'
              }`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-foreground">{postItem.author?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {postItem.is_solution && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Marked Solution
                      </Badge>
                    )}
                    <span>{new Date(postItem.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {postItem.body}
                </div>

                {idx > 0 && !postItem.is_solution && (
                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="ghost" className="text-xs text-emerald-600 font-semibold" onClick={() => handleMarkSolution(postItem.id)}>
                      Mark as Solution
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Form */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Post a Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <Textarea
                rows={3}
                placeholder="Write your response or answer here..."
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  <Send className="mr-2 h-4 w-4" /> Post Reply
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
