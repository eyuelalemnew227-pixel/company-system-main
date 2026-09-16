export function calculateSinceRequested(submissionDate: string | null | undefined): number {
    if (!submissionDate) return 0;
    
    const submission = new Date(submissionDate);
    const now = new Date();
    
    // Ensure we don't get negative weeks if submission is somehow in the future
    const diffTime = Math.max(0, now.getTime() - submission.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.floor(diffDays / 7);
}
