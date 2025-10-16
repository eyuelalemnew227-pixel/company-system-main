export default function Heading({ 
    title, 
    description, 
    className = "mb-8 space-y-0.5",
    titleClassName = "text-xl font-semibold tracking-tight"
}: { 
    title: string; 
    description?: string;
    className?: string;
    titleClassName?: string;
}) {
    return (
        <div className={className}>
            <h2 className={titleClassName}>{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
    );
}
