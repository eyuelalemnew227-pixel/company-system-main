import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ShoppingBag, Coffee, Calendar, MapPin, CreditCard, Upload, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type Product = { id: number; product_name: string; unit_price: number; description?: string };
type Branch = { id: number; name: string; location?: string; contact_phone?: string };
type CollectionDay = { id: number; name: string };
type PaymentMethod = { id: number; bank_name?: string; payment_method?: string; account_name?: string; account_number?: string; instructions?: string };

export default function PreOrderMiniApp() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [collectionDays, setCollectionDays] = useState<CollectionDay[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    const [selectedCart, setSelectedCart] = useState<{ [productId: number]: number }>({});
    const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
    const [selectedCollectionDayId, setSelectedCollectionDayId] = useState<number | ''>('');

    const [firstName, setFirstName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [transactionRef, setTransactionRef] = useState('');
    const [paymentSlipBase64, setPaymentSlipBase64] = useState<string | null>(null);

    const [completedOrderNumber, setCompletedOrderNumber] = useState('');
    const [completedTotal, setCompletedTotal] = useState(0);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                const tg = (window as any).Telegram.WebApp;
                tg.ready();
                tg.expand();
                if (tg.initDataUnsafe?.user) {
                    const user = tg.initDataUnsafe.user;
                    if (user.first_name) {
                        setFirstName(user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
                    }
                }
            }
        } catch (e) {
            console.error('Telegram WebApp init error:', e);
        }

        fetch('/api/pre-orders/miniapp/data', {
            headers: {
                'bypass-tunnel-reminder': 'true',
                'Accept': 'application/json',
            }
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setProducts(data.products || []);
                    setBranches(data.branches || []);
                    setCollectionDays(data.collection_days || []);
                    setPaymentMethods(data.payment_methods || []);
                } else {
                    toast.error(data.message || 'Error loading catalog');
                }
            })
            .catch((err) => {
                console.error(err);
                toast.error('Network error loading catalog.');
            })
            .finally(() => setLoading(false));
    }, []);

    const updateQuantity = (productId: number, delta: number) => {
        setSelectedCart((prev) => {
            const current = prev[productId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const copy = { ...prev };
                delete copy[productId];
                return copy;
            }
            return { ...prev, [productId]: next };
        });
    };

    const calculateTotal = () => {
        let sum = 0;
        Object.entries(selectedCart).forEach(([prodId, qty]) => {
            const prod = products.find((p) => p.id === Number(prodId));
            if (prod) sum += prod.unit_price * qty;
        });
        return sum;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setPaymentSlipBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !phoneNumber || !selectedBranchId || !selectedCollectionDayId || !paymentMethod) {
            toast.error('Please complete all required fields.');
            return;
        }

        const items = Object.entries(selectedCart).map(([prodId, qty]) => ({
            product_id: Number(prodId),
            quantity: qty,
        }));

        if (items.length === 0) {
            toast.error('Please select at least one product.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/pre-orders/miniapp/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName,
                    phone_number: phoneNumber,
                    collection_branch_id: selectedBranchId,
                    collection_day_id: selectedCollectionDayId,
                    payment_method: paymentMethod,
                    transaction_reference: transactionRef,
                    payment_slip: paymentSlipBase64,
                    items: items,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setCompletedOrderNumber(data.order_number);
                setCompletedTotal(data.total_amount);
                setStep(4);
            } else {
                toast.error(data.message || 'Failed to submit order.');
            }
        } catch (err) {
            toast.error('An error occurred while submitting your order.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
                <div className="text-center space-y-3">
                    <Coffee className="h-10 w-10 animate-bounce text-amber-500 mx-auto" />
                    <p className="text-sm text-slate-400">Loading Kaldi's Pre-Order...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
            <Head title="Kaldi's Coffee Pre-Order" />

            {/* Top Bar */}
            <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-full bg-amber-500/20 p-2 text-amber-400">
                        <Coffee className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-base text-amber-400">Kaldi's Coffee</h1>
                        <p className="text-xs text-slate-400">Tortas & Pastries Pre-Order</p>
                    </div>
                </div>

                {step > 1 && step < 4 && (
                    <button onClick={() => setStep((s) => (s - 1) as any)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                )}
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">

                {/* STEP 1: Select Products */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-amber-400" /> Select Products
                            </h2>
                            <span className="text-xs text-slate-400">Step 1 of 3</span>
                        </div>

                        <div className="space-y-3">
                            {products.map((prod) => {
                                const qty = selectedCart[prod.id] || 0;
                                return (
                                    <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-white">{prod.product_name}</h3>
                                            <p className="text-xs text-amber-400 font-semibold mt-0.5">ETB {prod.unit_price.toFixed(2)}</p>
                                            {prod.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{prod.description}</p>}
                                        </div>

                                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                                            <button onClick={() => updateQuantity(prod.id, -1)} className="w-7 h-7 rounded bg-slate-700 font-bold text-sm text-slate-300 flex items-center justify-center">-</button>
                                            <span className="w-6 text-center font-semibold text-sm">{qty}</span>
                                            <button onClick={() => updateQuantity(prod.id, 1)} className="w-7 h-7 rounded bg-amber-500 font-bold text-sm text-slate-950 flex items-center justify-center">+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {calculateTotal() > 0 && (
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md">
                                <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Total Price</p>
                                        <p className="text-lg font-bold text-amber-400">ETB {calculateTotal().toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => setStep(2)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 text-sm">
                                        Continue <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Select Branch & Date */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-amber-400" /> Pickup Details
                            </h2>
                            <span className="text-xs text-slate-400">Step 2 of 3</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Pickup Branch</label>
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                >
                                    <option value="">-- Choose Branch --</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Collection Day / Date</label>
                                <select
                                    value={selectedCollectionDayId}
                                    onChange={(e) => setSelectedCollectionDayId(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                >
                                    <option value="">-- Choose Date --</option>
                                    {collectionDays.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    if (!selectedBranchId || !selectedCollectionDayId) {
                                        toast.error('Please select branch and pickup date.');
                                        return;
                                    }
                                    setStep(3);
                                }}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm mt-6"
                            >
                                Proceed to Payment <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Customer Info & Payment */}
                {step === 3 && (
                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-amber-400" /> Customer & Payment
                            </h2>
                            <span className="text-xs text-slate-400">Step 3 of 3</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Your Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Abebe Bikila"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="0911223344"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Select Payment Method</label>
                                <select
                                    required
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                >
                                    <option value="">-- Select Payment Method --</option>
                                    {paymentMethods.map((pm: any) => {
                                        const name = pm.name || pm.payment_method;
                                        return (
                                            <option key={pm.id} value={name}>
                                                {name} {pm.account_number ? `(${pm.account_number})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>

                                {(() => {
                                    const selected = paymentMethods.find((pm: any) => (pm.name || pm.payment_method) === paymentMethod);
                                    if (!selected) return null;
                                    return (
                                        <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 text-slate-300">
                                            {selected.account_name && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Account Name:</span>
                                                    <span className="font-semibold text-white">{selected.account_name}</span>
                                                </div>
                                            )}
                                            {selected.account_number && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Account Number:</span>
                                                    <span className="font-mono font-bold text-amber-400">{selected.account_number}</span>
                                                </div>
                                            )}
                                            {selected.instructions && (
                                                <p className="text-[11px] text-slate-400 pt-1 border-t border-amber-500/10">{selected.instructions}</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Ref / Reference No.</label>
                                <input
                                    type="text"
                                    placeholder="e.g. FT2608123456"
                                    value={transactionRef}
                                    onChange={(e) => setTransactionRef(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Attach Payment Slip Image (Optional)</label>
                                <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center cursor-pointer hover:border-amber-500/50 bg-slate-900">
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="slip-upload" />
                                    <label htmlFor="slip-upload" className="cursor-pointer flex flex-col items-center gap-1 text-slate-400">
                                        <Upload className="h-6 w-6 text-amber-500" />
                                        <span className="text-xs">{paymentSlipBase64 ? 'Slip attached ✅' : 'Tap to upload screenshot'}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base mt-6"
                        >
                            {submitting ? 'Submitting Order...' : `Confirm Order (ETB ${calculateTotal().toFixed(2)})`}
                        </button>
                    </form>
                )}

                {/* STEP 4: Order Confirmation */}
                {step === 4 && (
                    <div className="text-center space-y-6 py-8">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Order Received!</h2>
                            <p className="text-sm text-slate-400">Thank you for your pre-order with Kaldi's Coffee.</p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left space-y-3">
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs text-slate-400">Order Number</span>
                                <span className="text-sm font-bold text-amber-400">{completedOrderNumber}</span>
                            </div>

                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs text-slate-400">Total Amount</span>
                                <span className="text-sm font-bold text-white">ETB {completedTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-xs text-slate-400">Status</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Pending Verification</span>
                            </div>
                        </div>

                        <button onClick={() => { setSelectedCart({}); setStep(1); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl text-sm">
                            Place Another Order
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}
