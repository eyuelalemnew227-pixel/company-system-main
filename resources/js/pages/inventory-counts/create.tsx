import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/user-permissions';
import type { Branch, ChildCategory, Product, InventoryPeriod } from '@/types/inventory-count';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type FiscalYear = {
	id: number;
	name: string;
};

type PageProps = {
	branches: Branch[];
	userBranchId: number | null;
	canManageAllBranches: boolean;
	inventoryPeriods: InventoryPeriod[];
	childCategories: ChildCategory[];
	products: Product[];
};

export default function CreateInventoryCount({ 
	branches = [], 
	userBranchId,
	canManageAllBranches = false,
	inventoryPeriods = [], 
	childCategories = [],
	products = []
}: PageProps) {
	const { can } = usePermission();

	const [branchId, setBranchId] = useState<string>(userBranchId ? String(userBranchId) : '');
	const [inventoryPeriodId, setInventoryPeriodId] = useState<string>('');
	const [childCategoryId, setChildCategoryId] = useState<string>('');
	const [productCounts, setProductCounts] = useState<Record<number, string>>({});
	const [existingCounts, setExistingCounts] = useState<Record<number, { id: number; count: string; is_approved: boolean }>>({});
	const [isLoadingCounts, setIsLoadingCounts] = useState(false);
	const [savingProducts, setSavingProducts] = useState<Record<number, boolean>>({});
	const [savedProducts, setSavedProducts] = useState<Record<number, boolean>>({});
	const [errorProducts, setErrorProducts] = useState<Record<number, string>>({});
	const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

	const filteredProducts = useMemo(() => {
		if (!childCategoryId) return [];
		return products.filter((p) => String(p.child_category_id) === childCategoryId);
	}, [products, childCategoryId]);

	useEffect(() => {
		if (inventoryPeriodId && childCategoryId) {
			setIsLoadingCounts(true);
			axios.get(route('inventory-counts.existing'), {
				params: {
					inventory_period_id: inventoryPeriodId,
					child_category_id: childCategoryId,
				}
			})
			.then((response) => {
				const counts = response.data;
				setExistingCounts(counts);
				
				const prefilledCounts: Record<number, string> = {};
				Object.keys(counts).forEach((productId) => {
					prefilledCounts[Number(productId)] = counts[Number(productId)].count;
				});
				setProductCounts(prefilledCounts);
			})
			.catch((error) => {
				console.error('Failed to fetch existing counts:', error);
			})
			.finally(() => {
				setIsLoadingCounts(false);
			});
		} else {
			setExistingCounts({});
			setProductCounts({});
		}
	}, [inventoryPeriodId, childCategoryId]);

	const saveProductCount = useCallback(async (productId: number, count: string) => {
		if (!branchId || !inventoryPeriodId || !childCategoryId) {
			return;
		}

		if (!count || parseFloat(count) < 0) {
			return;
		}

		// Find product and check thresholds
		const product = products.find(p => p.id === productId);
		const countValue = parseFloat(count);

		if (product) {
			if (product.min_count_threshold !== null && product.min_count_threshold !== undefined) {
				const minThreshold = parseFloat(String(product.min_count_threshold));
				if (countValue < minThreshold) {
					setErrorProducts(prev => ({ 
						...prev, 
						[productId]: `Count must be at least ${minThreshold}`
					}));
					return;
				}
			}

			if (product.max_count_threshold !== null && product.max_count_threshold !== undefined) {
				const maxThreshold = parseFloat(String(product.max_count_threshold));
				if (countValue > maxThreshold) {
					setErrorProducts(prev => ({ 
						...prev, 
						[productId]: `Count cannot exceed ${maxThreshold}`
					}));
					return;
				}
			}
		}

		setSavingProducts(prev => ({ ...prev, [productId]: true }));
		setErrorProducts(prev => {
			const updated = { ...prev };
			delete updated[productId];
			return updated;
		});

		try {
			const response = await axios.post(route('inventory-counts.bulk'), {
				counts: [{
					branch_id: Number(branchId),
					inventory_period_id: Number(inventoryPeriodId),
					child_category_id: Number(childCategoryId),
					product_id: productId,
					count: parseFloat(count),
				}]
			});

			setSavedProducts(prev => ({ ...prev, [productId]: true }));
			
			// Show success message
			const productName = products.find(p => p.id === productId)?.product_name || 'Product';
			const isUpdate = existingCounts[productId] !== undefined;
			toast.success(`${productName}: Count ${isUpdate ? 'updated' : 'saved'} successfully (${count})`, {
				duration: 3000,
			});
			
			// Refresh existing counts
			const countsResponse = await axios.get(route('inventory-counts.existing'), {
				params: {
					inventory_period_id: inventoryPeriodId,
					child_category_id: childCategoryId,
				}
			});
			setExistingCounts(countsResponse.data);

			setTimeout(() => {
				setSavedProducts(prev => {
					const updated = { ...prev };
					delete updated[productId];
					return updated;
				});
			}, 2000);

		} catch (error: any) {
			// Extract validation error message from response
			let errorMessage = 'Unable to save count';
			
			if (error.response?.data?.errors?.count) {
				// Laravel validation error for count field
				errorMessage = error.response.data.errors.count[0];
			} else if (error.response?.data?.message) {
				// General error message
				errorMessage = error.response.data.message;
			}
			
			setErrorProducts(prev => ({ ...prev, [productId]: errorMessage }));
			
			// Show user-friendly toast notification
			const productName = products.find(p => p.id === productId)?.product_name || 'product';
			toast.error(`${productName}: ${errorMessage}`, {
				duration: 5000,
			});
		} finally {
			setSavingProducts(prev => {
				const updated = { ...prev };
				delete updated[productId];
				return updated;
			});
		}
	}, [branchId, inventoryPeriodId, childCategoryId, products]);

	const handleCountChange = (productId: number, value: string) => {
		setProductCounts((prev) => ({
			...prev,
			[productId]: value,
		}));

		// Clear existing timer
		if (debounceTimers.current[productId]) {
			clearTimeout(debounceTimers.current[productId]);
		}

		// Clear any previous errors/saved state
		setSavedProducts(prev => {
			const updated = { ...prev };
			delete updated[productId];
			return updated;
		});

		// Immediate validation for empty or invalid values
		if (!value || value.trim() === '') {
			setErrorProducts(prev => {
				const updated = { ...prev };
				delete updated[productId];
				return updated;
			});
			return;
		}

		const countValue = parseFloat(value);

		// Check for negative values
		if (countValue < 0) {
			setErrorProducts(prev => ({
				...prev,
				[productId]: 'Count cannot be negative'
			}));
			return;
		}

		// Find product and check thresholds immediately
		const product = products.find(p => p.id === productId);
		
		if (product) {
			// Check min threshold
			if (product.min_count_threshold !== null && product.min_count_threshold !== undefined) {
				const minThreshold = parseFloat(String(product.min_count_threshold));
				if (countValue < minThreshold) {
					setErrorProducts(prev => ({ 
						...prev, 
						[productId]: `Count must be at least ${minThreshold}`
					}));
					return;
				}
			}

			// Check max threshold
			if (product.max_count_threshold !== null && product.max_count_threshold !== undefined) {
				const maxThreshold = parseFloat(String(product.max_count_threshold));
				if (countValue > maxThreshold) {
					setErrorProducts(prev => ({ 
						...prev, 
						[productId]: `Count cannot exceed ${maxThreshold}`
					}));
					return;
				}
			}
		}

		// Clear errors if validation passed
		setErrorProducts(prev => {
			const updated = { ...prev };
			delete updated[productId];
			return updated;
		});

		// Set new timer for auto-save only if valid
		if (countValue >= 0) {
			debounceTimers.current[productId] = setTimeout(() => {
				saveProductCount(productId, value);
			}, 1500);
		}
	};



	return (
		<AppLayout
			breadcrumbs={[
				{ title: 'Inventory Counts', href: '/inventory-counts' },
				{ title: 'Create', href: '/inventory-counts/create' },
			]}
		>
			<Head title="Create Inventory Count" />
			<div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
				<Card className="w-full max-w-4xl mx-auto">
					<CardHeader>
						<CardTitle className="text-xl sm:text-2xl">Create Inventory Count</CardTitle>
					</CardHeader>
					<CardContent className="p-4 sm:p-6">
						<div className="space-y-4 sm:space-y-6">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2">
									<Label>Branch *</Label>
									<Select value={branchId} onValueChange={(value) => setBranchId(value)} disabled={!canManageAllBranches}>
										<SelectTrigger>
											<SelectValue placeholder="Select branch" />
										</SelectTrigger>
										<SelectContent>
											{branches.map((branch) => (
												<SelectItem key={branch.id} value={String(branch.id)}>
													{branch.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{!canManageAllBranches && userBranchId && (
										<p className="text-sm text-muted-foreground">Restricted to your branch</p>
									)}
								</div>
								<div className="space-y-2">
									<Label>Inventory Period *</Label>
									<Select value={inventoryPeriodId} onValueChange={(value) => setInventoryPeriodId(value)}>
										<SelectTrigger>
											<SelectValue placeholder="Select inventory period" />
										</SelectTrigger>
										<SelectContent>
											{inventoryPeriods.length === 0 ? (
												<div className="p-2 text-sm text-muted-foreground">No active inventory periods available</div>
											) : (
												inventoryPeriods.map((period) => (
													<SelectItem key={period.id} value={String(period.id)}>
														{period.inventory_period_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Child Category *</Label>
									<Select
										value={childCategoryId}
										onValueChange={(value) => {
											setChildCategoryId(value);
											setProductCounts({});
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											{childCategories.map((category) => (
												<SelectItem key={category.id} value={String(category.id)}>
													{category.child_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{childCategoryId && filteredProducts.length > 0 && (
								<div className="space-y-2 col-span-full">
									<div className="flex items-center justify-between">
										<Label className="text-sm sm:text-base">
											Products - Enter counts for each product:
											{isLoadingCounts && <span className="ml-2 text-sm text-muted-foreground">(Loading existing counts...)</span>}
										</Label>
										<div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800">
											<span className="font-medium">Auto-save enabled:</span> Changes save automatically after 1.5s
										</div>
									</div>
									<div className="rounded-md border overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="whitespace-nowrap">Product Name</TableHead>
													<TableHead className="whitespace-nowrap w-[150px] sm:w-[200px]">Count</TableHead>
													<TableHead className="whitespace-nowrap w-[100px]">Status</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredProducts.map((product) => {
													const hasExistingCount = existingCounts[product.id];
													const isApproved = hasExistingCount?.is_approved;
													const isSaving = savingProducts[product.id];
													const isSaved = savedProducts[product.id];
													const hasError = errorProducts[product.id];
													const hasThresholds = product.min_count_threshold || product.max_count_threshold;
													
													return (
														<TableRow key={product.id}>
															<TableCell className="font-medium">
																<div>
																	<div>{product.product_name}</div>
																	{hasThresholds && (
																		<div className="text-xs text-muted-foreground mt-0.5">
																			{product.min_count_threshold && product.max_count_threshold && (
																				<span>Range: {product.min_count_threshold} - {product.max_count_threshold}</span>
																			)}
																			{product.min_count_threshold && !product.max_count_threshold && (
																				<span>Min: {product.min_count_threshold}</span>
																			)}
																			{!product.min_count_threshold && product.max_count_threshold && (
																				<span>Max: {product.max_count_threshold}</span>
																			)}
																		</div>
																	)}
																</div>
															</TableCell>
															<TableCell>
																<div className="relative">
																	<Input
																		type="number"
																		step="0.01"
																		min="0"
																		value={productCounts[product.id] || ''}
																		onChange={(e) =>
																			handleCountChange(product.id, e.target.value)
																		}
																		placeholder="0.00"
																		className={`w-full ${hasError ? 'border-red-500' : ''} ${isSaved ? 'border-green-500' : ''}`}
																		disabled={isLoadingCounts || isSaving}
																	/>
																	{isSaving && (
																		<div className="absolute right-2 top-1/2 -translate-y-1/2">
																			<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
																		</div>
																	)}
																	{isSaved && !isSaving && (
																		<div className="absolute right-2 top-1/2 -translate-y-1/2">
																			<CheckCircle2 className="h-4 w-4 text-green-500" />
																		</div>
																	)}
																	{hasError && !isSaving && (
																		<div className="absolute right-2 top-1/2 -translate-y-1/2">
																			<AlertCircle className="h-4 w-4 text-red-500" />
																		</div>
																	)}
																</div>
																{hasError && (
																	<p className="text-xs text-red-500 mt-1">{hasError}</p>
																)}
															</TableCell>
															<TableCell>
																<div className="flex items-center gap-2">
																	{hasExistingCount && (
																		<Badge variant={isApproved ? "default" : "secondary"}>
																			{isApproved ? "Approved" : "Counted"}
																		</Badge>
																	)}
																	{isSaving && (
																		<span className="text-xs text-muted-foreground">Saving...</span>
																	)}
																	{isSaved && !isSaving && (
																		<span className="text-xs text-green-600">Saved</span>
																	)}
																</div>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								</div>
							)}

							{childCategoryId && filteredProducts.length === 0 && (
								<div className="col-span-full rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
									No products found for this category. Please add products first.
								</div>
							)}

							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 col-span-full pt-4 border-t">
								<div className="flex-1">
									<p className="text-sm text-muted-foreground">
										All changes are automatically saved. You can continue to the inventory list when done.
									</p>
								</div>
								<Link href="/inventory-counts" className="w-full sm:w-auto">
									<Button type="button" className="w-full">
										Go to Inventory List
									</Button>
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
