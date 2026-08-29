import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Play, Eye } from 'lucide-react';
import type { Evaluation } from '@/types/evaluation';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Props = PageProps & {
    evaluations: Evaluation[];
};

export default function MyEvaluations({ evaluations }: Props) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    const getStatusBadge = (evaluation: Evaluation) => {
        const hasResponse = evaluation.evaluation_responses && evaluation.evaluation_responses.length > 0;
        
        if (hasResponse) {
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Completed
                </Badge>
            );
        }
        
        return (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Clock className="mr-1 h-3 w-3" />
                Pending
            </Badge>
        );
    };

    const getStatusColor = (evaluation: Evaluation) => {
        const hasResponse = evaluation.evaluation_responses && evaluation.evaluation_responses.length > 0;
        return hasResponse ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50';
    };

    return (
        <AppLayout>
            <Head title="My Evaluations" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">My Evaluations</h1>
                    <p className="text-gray-600">
                        Complete your assigned evaluations below
                    </p>
                </div>

                {evaluations.length === 0 ? (
                    <Card className="p-8 text-center">
                        <div className="text-gray-500">
                            <Clock className="mx-auto h-12 w-12 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Evaluations Assigned</h3>
                            <p>You don't have any evaluations assigned to you at the moment.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {evaluations.map((evaluation) => {
                            const hasResponse = Boolean(evaluation.evaluation_responses && evaluation.evaluation_responses.length > 0);
                            const response = evaluation.evaluation_responses?.[0] ?? null;
                            
                            return (
                                <Card key={evaluation.id} className={`p-6 ${getStatusColor(evaluation)}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-semibold">{evaluation.name}</h3>
                                                {getStatusBadge(evaluation)}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-sm text-gray-600 mb-1">Evaluator Group</p>
                                                    <p className="font-medium">{evaluation.evaluator_group?.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 mb-1">Evaluates Group</p>
                                                    <p className="font-medium">{evaluation.evaluates_group?.name}</p>
                                                </div>
                                            </div>

                                            {response && (
                                                <div className="mb-4 p-3 bg-white rounded-lg border">
                                                    <p className="text-sm text-gray-600 mb-1">Your Response</p>
                                                    <p className="font-medium">
                                                        Evaluated: {response.evaluate?.name}
                                                    </p>
                                                    {response.comment && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Comment: {response.comment}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            {hasResponse ? (
                                                <>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('evaluator.evaluation.show', evaluation.id)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Response
                                                        </Link>
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('evaluator.evaluation.show', evaluation.id)}>
                                                            <Play className="mr-2 h-4 w-4" />
                                                            Edit Response
                                                        </Link>
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button size="sm" asChild>
                                                    <Link href={route('evaluator.evaluation.show', evaluation.id)}>
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Start Evaluation
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
