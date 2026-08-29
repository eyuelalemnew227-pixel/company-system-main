import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Plus, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'SOP Compliance', href: '/training/sop' },
];

export default function SopIndex({ sops = [], myAcknowledgements = [] }: any) {
  const [showModal, setShowModal] = useState(false);

  const { data, setData, post, processing, reset } = useForm({
    title: '',
    version: '1.0',
    category: 'General Operations',
    content: '',
    requires_acknowledgement: true,
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/training/sop', {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="SOP Compliance Hub" />
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <FileCheck className="mr-3 h-6 w-6 text-emerald-600" /> Standard Operating Procedures (SOPs)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Company operational compliance documents, safety guidelines, and digital sign-offs.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="mr-2 h-4 w-4" /> New SOP Document
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sops.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <FileCheck className="mx-auto h-12 w-12 opacity-30 text-emerald-500 mb-2" />
              <p className="font-medium text-base">No active SOP documents registered.</p>
            </div>
          ) : (
            sops.map((sop: any) => {
              const isSigned = myAcknowledgements.includes(sop.id);
              return (
                <Card key={sop.id} className="shadow-sm hover:shadow-md transition-all flex flex-col justify-between border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-mono">v{sop.version}</Badge>
                      {isSigned ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-amber-800 bg-amber-100">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold mt-2 text-foreground">{sop.title}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {sop.content}
                    </p>

                    <Link href={`/training/sop/${sop.id}`}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        View & Read SOP <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal: Create SOP */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">New Standard Operating Procedure</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Title *</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => setData('title', e.target.value)}
                      placeholder="e.g. Espresso Machine Hygiene & Daily Sanitization"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input
                        value={data.version}
                        onChange={(e) => setData('version', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={data.category}
                        onChange={(e) => setData('category', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SOP Instructions / Content *</Label>
                    <Textarea
                      rows={5}
                      value={data.content}
                      onChange={(e) => setData('content', e.target.value)}
                      placeholder="Detailed operational steps..."
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      Publish SOP Document
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
