import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Award,
  Users,
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Course Catalog', href: '/training/courses' },
];

export default function CourseCatalog({ courses, categories = [], filters = {} }: any) {
  const [search, setSearch] = useState(filters.search || '');
  const [difficulty, setDifficulty] = useState(filters.difficulty || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/training/courses', { search, difficulty }, { preserveState: true });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Course Catalog" />
      <div className="space-y-6 p-4 md:p-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center">
              <BookOpen className="mr-3 h-7 w-7 text-amber-600" /> Course Catalog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse available corporate training courses, skills development, and compliance modules.
            </p>
          </div>
          <Link href="/training/courses/create">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow">
              <Plus className="mr-2 h-4 w-4" /> Create Course
            </Button>
          </Link>
        </div>

        {/* Filter Bar */}
        <Card className="p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses by title or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <Button type="submit" variant="secondary" className="font-semibold">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </form>
        </Card>

        {/* Courses Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.data?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground space-y-3">
              <BookOpen className="mx-auto h-12 w-12 opacity-30" />
              <p className="text-base font-medium">No courses found matching your criteria.</p>
              <Link href="/training/courses/create">
                <Button variant="outline" size="sm" className="mt-2">
                  Create First Course
                </Button>
              </Link>
            </div>
          ) : (
            courses?.data?.map((course: any) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col border border-border">
                {/* Header Banner */}
                <div className="h-44 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 p-5 text-white flex flex-col justify-between relative">
                  <div className="flex items-center justify-between z-10">
                    <Badge className="bg-black/40 text-white font-medium text-xs border-none">
                      {course.category?.name || 'General'}
                    </Badge>
                    <Badge variant="outline" className="border-white/40 text-white text-xs capitalize">
                      {course.difficulty}
                    </Badge>
                  </div>
                  <div className="z-10 space-y-1">
                    {course.is_mandatory && (
                      <Badge className="bg-red-500/90 text-white text-[10px] uppercase font-bold mb-1">
                        Mandatory
                      </Badge>
                    )}
                    <h3 className="font-extrabold text-xl line-clamp-2 leading-snug">{course.title}</h3>
                  </div>
                </div>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="space-y-3 pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> {course.duration_hours} Hours
                      </span>
                      <span className="flex items-center">
                        <Award className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Pass Mark: {course.passing_score}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-muted-foreground">
                        <BookOpen className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> {course.lessons?.length || 0} Lessons
                      </span>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {course.status}
                      </Badge>
                    </div>
                  </div>

                  <Link href={`/training/courses/${course.id}`} className="w-full pt-2">
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      View Details & Curriculum
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </AppLayout>
  );
}
