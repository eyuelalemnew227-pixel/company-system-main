import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, MessageCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Forums & Q&A', href: '/training/forums' },
];

export default function ForumsIndex({ forums = [], coursesWithoutForum = [] }: any) {
  const [showModal, setShowModal] = useState(false);

  const { data, setData, post, processing, reset } = useForm({
    course_id: '',
    title: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/training/forums', {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Course Discussion Forums" />
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-amber-600" /> Community Discussion Forums
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask questions, discuss course topics, and share best practices with peer team members.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Create Forum
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {forums.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-30 text-amber-500 mb-2" />
              <p className="font-medium text-base">No active discussion forums.</p>
            </div>
          ) : (
            forums.map((forum: any) => (
              <Card key={forum.id} className="shadow-sm hover:shadow-md transition-all flex flex-col justify-between border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{forum.course?.title || 'General'}</Badge>
                    <span className="text-xs text-muted-foreground">{forum.threads?.length || 0} Threads</span>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2">{forum.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {forum.threads?.slice(0, 3).map((t: any) => (
                      <Link key={t.id} href={`/training/forums/thread/${t.id}`} className="block">
                        <div className="p-2.5 rounded-lg bg-muted/40 hover:bg-accent text-xs flex items-center justify-between font-medium">
                          <span className="truncate max-w-[200px]">{t.title}</span>
                          <span className="text-muted-foreground flex items-center">
                            <MessageCircle className="mr-1 h-3 w-3" /> {t.views} views
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal: Create Forum */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Create Forum for Course</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Course *</Label>
                    <select
                      value={data.course_id}
                      onChange={(e) => setData('course_id', e.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Course</option>
                      {coursesWithoutForum.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Forum Title *</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => setData('title', e.target.value)}
                      placeholder="e.g. Q&A and Troubleshooting Forum"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      Create Forum
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
