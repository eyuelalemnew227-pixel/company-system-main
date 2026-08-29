import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Certificates', href: '/training/certificates' },
];

export default function CertificatesIndex({ certificates }: any) {
  const { post: revokePost } = useForm({ reason: 'Administrative update' });

  const handleRevoke = (id: number) => {
    if (confirm('Revoke this certificate?')) {
      revokePost(`/training/certificates/${id}/revoke`);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Digital Certificates Registry" />
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <Award className="mr-3 h-6 w-6 text-purple-600" /> Digital Certificates Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and verify all issued course completion credentials across the organization.
            </p>
          </div>
          <Link href="/training/certificates/verify">
            <Button variant="outline" className="font-semibold">
              <ExternalLink className="mr-2 h-4 w-4" /> Public Verification Portal
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            {certificates?.data?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Award className="mx-auto h-12 w-12 opacity-30 text-purple-500" />
                <p className="font-medium text-base">No certificates issued yet.</p>
              </div>
            ) : (
              certificates?.data?.map((cert: any) => (
                <div key={cert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 transition-all gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-[11px] bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200">
                        {cert.certificate_number}
                      </Badge>
                      {cert.is_revoked ? (
                        <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Valid & Active</Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-foreground mt-1">{cert.course?.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Recipient: {cert.employee?.first_name} {cert.employee?.last_name} ({cert.employee?.branch?.name || 'HQ'})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/training/certificates/verify?number=${cert.certificate_number}`}>
                      <Button size="sm" variant="secondary" className="font-semibold">
                        Verify Credential
                      </Button>
                    </Link>
                    {!cert.is_revoked && (
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleRevoke(cert.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
