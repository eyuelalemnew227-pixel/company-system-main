import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SopShow({ sop, isAcknowledged = false }: any) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Training Management', href: '/training/dashboard' },
    { title: 'SOP Compliance', href: '/training/sop' },
    { title: sop.title, href: `/training/sop/${sop.id}` },
  ];

  const { post, processing } = useForm({});

  const handleAcknowledge = () => {
    post(`/training/sop/${sop.id}/acknowledge`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={sop.title} />
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">v{sop.version}</Badge>
              <Badge className="bg-emerald-100 text-emerald-900 border-none text-xs">
                {sop.category}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">{sop.title}</h1>
          </div>

          {isAcknowledged ? (
            <Badge className="bg-emerald-600 text-white font-bold py-2 px-4 text-xs">
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Digital Sign-Off Confirmed
            </Badge>
          ) : (
            <Button
              onClick={handleAcknowledge}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Acknowledge & Sign SOP
            </Button>
          )}
        </div>

        {/* SOP Body */}
        <Card className="shadow-md border">
          <CardContent className="p-6 md:p-8 space-y-4 text-sm leading-relaxed text-foreground">
            <div className="whitespace-pre-wrap">{sop.content}</div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
