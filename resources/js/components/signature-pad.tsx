import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, PenTool, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
    valueType?: 'typed' | 'drawn';
    valueData?: string;
    onChange: (type: 'typed' | 'drawn', data: string) => void;
    defaultName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
    valueType = 'typed',
    valueData = '',
    onChange,
    defaultName = '',
}) => {
    const [mode, setMode] = useState<'typed' | 'drawn'>(valueType === 'drawn' ? 'drawn' : 'typed');
    const [typedText, setTypedText] = useState(valueType === 'typed' ? valueData || defaultName : defaultName);
    const [hasDrawn, setHasDrawn] = useState(valueType === 'drawn' && !!valueData);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);

    // Sync typed text changes
    useEffect(() => {
        if (mode === 'typed') {
            onChange('typed', typedText);
        }
    }, [typedText, mode]);

    // Load existing drawn signature if present
    useEffect(() => {
        if (mode === 'drawn' && valueType === 'drawn' && valueData && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHasDrawn(true);
            };
            img.src = valueData;
        }
    }, [mode]);

    const handleTypedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTypedText(e.target.value);
        onChange('typed', e.target.value);
    };

    // Get scaled canvas coordinates accurately regardless of CSS size / scaling
    const getCanvasPos = (
        canvas: HTMLCanvasElement,
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if ('touches' in e) {
            // Prevent scrolling on touch devices while drawing
            e.stopPropagation();
        }
        isDrawingRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getCanvasPos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getCanvasPos(canvas, e);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // slate-900
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        setHasDrawn(true);
    };

    const stopDrawing = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        saveCanvas();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
        onChange('drawn', '');
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        onChange('drawn', dataUrl);
    };

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Digital Signature Method
                </Label>
                {mode === 'drawn' && hasDrawn && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Signature Captured
                    </span>
                )}
            </div>

            <Tabs value={mode} onValueChange={(val) => setMode(val as 'typed' | 'drawn')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="typed" className="flex items-center gap-2 font-medium">
                        <Type className="h-4 w-4 text-amber-700" />
                        Typed Name Signature
                    </TabsTrigger>
                    <TabsTrigger value="drawn" className="flex items-center gap-2 font-medium">
                        <PenTool className="h-4 w-4 text-amber-700" />
                        Drawn Signature Pad
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="typed" className="space-y-3 pt-3">
                    <Input
                        type="text"
                        placeholder="Type full signature name..."
                        value={typedText}
                        onChange={handleTypedChange}
                        className="bg-white dark:bg-slate-950 font-medium"
                    />

                    {typedText && (
                        <div className="mt-2 rounded-lg border bg-white p-4 text-center dark:bg-slate-950 shadow-inner">
                            <span className="font-serif italic text-2xl tracking-wide text-amber-950 dark:text-amber-200">
                                {typedText}
                            </span>
                            <div className="mx-auto mt-1 w-48 border-b-2 border-slate-800 dark:border-slate-200" />
                            <p className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Official Typed Signature
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="drawn" className="space-y-3 pt-3">
                    <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 shadow-inner">
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={180}
                            className="w-full touch-none cursor-crosshair rounded-lg"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!hasDrawn && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-400">
                                Draw your signature here using mouse or touchscreen
                            </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearCanvas}
                                className="bg-white/90 backdrop-blur"
                            >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Clear Pad
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
