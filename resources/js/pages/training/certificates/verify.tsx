import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck, ShieldAlert, Search, Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Smart Certificate Verification', href: '/training/certificates/verify' },
];

export default function VerifyCertificate({ certificate, searched = false, queryNumber = '' }: any) {
  const [number, setNumber] = useState(queryNumber);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/training/certificates/verify', { number }, { preserveState: true });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Smart Digital Certificate Verification" />
      <div className="space-y-8 p-4 md:p-6 max-w-4xl mx-auto">
        
        {/* Verification Form Header */}
        <div className="text-center space-y-2 print:hidden">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 mb-2 shadow-inner">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Smart Certificate Verification Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify & print official corporate training credentials issued by Kaldi's Coffee Training Academy.
          </p>
        </div>

        {/* Lookup Card */}
        <Card className="shadow-md print:hidden">
          <CardContent className="p-6">
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter Certificate Number (e.g. CERT-A8F291...)"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="flex-1 font-mono text-base"
                required
              />
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6">
                <Search className="mr-2 h-4 w-4" /> Verify Credential
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && (
          certificate ? (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center print:hidden">
                <Badge className="bg-emerald-600 text-white font-bold py-1.5 px-3">
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Verified Authentic Certificate
                </Badge>

                <Button onClick={handlePrint} variant="outline" className="font-semibold">
                  <Printer className="mr-2 h-4 w-4 text-amber-600" /> Print / Save PDF
                </Button>
              </div>

              {/* Smart Certificate Paper Card (Gold Ornate Border) */}
              <div className="relative overflow-hidden rounded-2xl border-8 border-amber-600/40 bg-amber-50/30 dark:bg-stone-950 p-8 md:p-14 text-center shadow-2xl space-y-8 font-serif border-double">
                
                {/* Gold Foil Accent Corners */}
                <div className="absolute top-3 left-3 h-10 w-10 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
                <div className="absolute top-3 right-3 h-10 w-10 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
                <div className="absolute bottom-3 left-3 h-10 w-10 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
                <div className="absolute bottom-3 right-3 h-10 w-10 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

                {/* Header Logo Branding */}
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-600 text-white font-sans font-black text-2xl shadow-md">
                    K
                  </div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-amber-900 dark:text-amber-300 font-sans">
                    Kaldi's Coffee Training Academy
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-mono">
                    Corporate Professional Qualification
                  </p>
                </div>

                {/* Main Certificate Title */}
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-5xl font-black text-amber-950 dark:text-amber-100 italic">
                    Certificate of Excellence
                  </h1>
                  <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
                    This official certificate is proudly awarded to
                  </p>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-amber-900 dark:text-amber-200 underline decoration-amber-500 decoration-2 underline-offset-8 font-sans">
                    {certificate.employee?.first_name} {certificate.employee?.last_name}
                  </h2>
                  <p className="text-sm font-sans text-stone-600 dark:text-stone-400 pt-1">
                    {certificate.employee?.position?.name || 'Valued Team Member'} — {certificate.employee?.branch?.name || 'HQ'}
                  </p>
                </div>

                {/* Course Completion Statement */}
                <div className="max-w-xl mx-auto space-y-2 border-t border-b border-amber-200 dark:border-amber-900/60 py-6">
                  <p className="text-xs text-stone-500 uppercase tracking-widest font-sans">
                    For successfully mastering the curriculum and passing the assessment for
                  </p>
                  <h3 className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 font-sans">
                    {certificate.course?.title}
                  </h3>
                </div>

                {/* Footer Signatures & QR Code */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 text-xs font-sans text-stone-600 dark:text-stone-400 border-t border-amber-200/50">
                  <div className="text-left space-y-1">
                    <p className="font-bold text-foreground">Issue Date:</p>
                    <p className="font-mono">{new Date(certificate.issue_date).toLocaleDateString()}</p>
                    <p className="font-bold text-foreground mt-2">Credential ID:</p>
                    <p className="font-mono text-amber-700 font-bold">{certificate.certificate_number}</p>
                  </div>

                  {/* Stamp & Verification QR */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="h-16 w-16 border-2 border-amber-600 rounded-full flex flex-col items-center justify-center p-1 text-center bg-amber-100/50 dark:bg-amber-950/50">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span className="text-[8px] font-black uppercase text-amber-900 dark:text-amber-200">Verified</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Official Seal</span>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="h-8 border-b border-stone-400 w-36 mb-1 text-center italic font-serif text-amber-900 dark:text-amber-200">
                      Kaldi's Academy Director
                    </div>
                    <p className="font-bold text-foreground">Authorized Signature</p>
                    <p className="text-[10px] text-muted-foreground">Kaldi's Coffee Enterprise</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <Card className="border-2 border-red-400 bg-red-50/50 dark:bg-red-950/20 p-6 text-center space-y-3">
              <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200">Invalid or Unverified Certificate</h3>
              <p className="text-xs text-red-700 dark:text-red-300">
                No active certificate matching number "{queryNumber}" was found in our database.
              </p>
            </Card>
          )
        )}

      </div>
    </AppLayout>
  );
}
