import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, ArrowLeft, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Course Catalog', href: '/training/courses' },
  { title: 'Create Course', href: '/training/courses/create' },
];

export default function CreateCourse({ categories = [], certificateTemplates = [] }: any) {
  const { data, setData, post, processing, errors } = useForm({
    title: '',
    category_id: '',
    description: '',
    duration_hours: '2.5',
    difficulty: 'beginner',
    passing_score: '70',
    is_featured: false as boolean,
    is_mandatory: false as boolean,
    certificate_template_id: '',
    enrollment_type: 'open',
    max_attempts: '3',
    deadline_days: '30',
    status: 'published',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/training/courses');
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create New Course" />
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center">
              <BookOpen className="mr-3 h-6 w-6 text-amber-600" /> Create New Course
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add a new training course to the corporate learning portal.
            </p>
          </div>
          <Link href="/training/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Catalog
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>Configure course title, duration, difficulty, and certification settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Standard Operating Procedures & Food Safety Standards"
                  value={data.title}
                  onChange={(e) => setData('title', e.target.value)}
                  required
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <select
                    id="category_id"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <select
                    id="difficulty"
                    value={data.difficulty}
                    onChange={(e) => setData('difficulty', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Overview & Description *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Outline the learning objectives, target audience, and key topics covered in this training program..."
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  required
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Duration (Hours)</Label>
                  <Input
                    id="duration_hours"
                    type="number"
                    step="0.5"
                    value={data.duration_hours}
                    onChange={(e) => setData('duration_hours', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passing_score">Passing Score (%)</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    min="0"
                    max="100"
                    value={data.passing_score}
                    onChange={(e) => setData('passing_score', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline_days">Completion Deadline (Days)</Label>
                  <Input
                    id="deadline_days"
                    type="number"
                    min="1"
                    value={data.deadline_days}
                    onChange={(e) => setData('deadline_days', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="certificate_template_id">Certificate Template</Label>
                  <select
                    id="certificate_template_id"
                    value={data.certificate_template_id}
                    onChange={(e) => setData('certificate_template_id', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Default Certificate</option>
                    {certificateTemplates.map((tmpl: any) => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Publishing Status</Label>
                  <select
                    id="status"
                    value={data.status}
                    onChange={(e) => setData('status', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={data.is_mandatory}
                    onCheckedChange={(checked) => setData('is_mandatory', Boolean(checked))}
                  />
                  <span className="text-sm font-medium">Mark as Mandatory Training for Staff</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={data.is_featured}
                    onCheckedChange={(checked) => setData('is_featured', Boolean(checked))}
                  />
                  <span className="text-sm font-medium">Feature on LMS Overview Dashboard</span>
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <Link href="/training/courses">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  <Save className="mr-2 h-4 w-4" /> Save & Build Curriculum
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
