import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/user-permissions';
import type { Branch, ChildCategory, Product, InventoryCount, InventoryPeriod } from '@/types/inventory-count';

type PageProps = {
	inventoryCount: InventoryCount;
	branches: Branch[];
	canManageAllBranches: boolean;
	inventoryPeriods: InventoryPeriod[];
	childCategories: ChildCategory[];
	products: Product[];
};

export default function EditInventoryCount({ 
	inventoryCount,
	branches = [], 
	canManageAllBranches = false,
	inventoryPeriods = [], 
	childCategories = [],
	products = []
}: PageProps) {
	const { can } = usePermission();

	const [branchId, setBranchId] = useState<string>(String(inventoryCount.branch_id || ''));
	const [inventoryPeriodId, setInventoryPeriodId] = useState<string>(String(inventoryCount.inventory_period_id || ''));
	const [childCategoryId, setChildCategoryId] = useState<string>(String(inventoryCount.child_category_id || ''));
	const [productId, setProductId] = useState<string>(String(inventoryCount.product_id || ''));
	const [count, setCount] = useState(String(inventoryCount.count || ''));

	const filteredProducts = useMemo(() => {
		if (!childCategoryId) return products;
		return products.filter((p) => String(p.child_category_id) === childCategoryId);
	}, [products, childCategoryId]);

	function save(e: React.FormEvent) {
		e.preventDefault();
		if (!branchId || !inventoryPeriodId || !childCategoryId || !productId) {
			toast.error('Please fill all required fields');
			return;
		}

		router.put(route('inventory-counts.update', inventoryCount.id), {
			branch_id: Number(branchId),
			inventory_period_id: Number(inventoryPeriodId),
			child_category_id: Number(childCategoryId),
			product_id: Number(productId),
			count: parseFloat(count),
		}, {
			onSuccess: () => {
				const productName = products.find(p => p.id === Number(productId))?.product_name || 'Product';
				toast.success(`${productName}: Count updated successfully to ${count}`, {
					duration: 3000,
				});
			},
			onError: (errors) => {
				// Extract specific error message
				let errorMessage = 'Unable to update count';
				
				if (errors.count) {
					errorMessage = errors.count;
				} else if (errors.message) {
					errorMessage = errors.message;
				}
				
				const productName = products.find(p => p.id === Number(productId))?.product_name || 'Product';
				toast.error(`${productName}: ${errorMessage}`, {
					duration: 5000,
				});
			}
		});
	}

	return (
		<AppLayout
			breadcrumbs={[
				{ title: 'Inventory Counts', href: '/inventory-counts' },
				{ title: 'Edit', href: `/inventory-counts/${inventoryCount.id}/edit` },
			]}
		>
			<Head title="Edit Inventory Count" />
			<div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
				<Card className="w-full max-w-2xl mx-auto">
					<CardHeader>
						<CardTitle className="text-xl sm:text-2xl">Edit Inventory Count</CardTitle>
					</CardHeader>
					<CardContent className="p-4 sm:p-6">
						<form className="space-y-4 sm:space-y-6" onSubmit={save}>
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
											if (!filteredProducts.find((p) => String(p.id) === productId)) {
												setProductId('');
											}
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
								<div className="space-y-2">
									<Label>Product *</Label>
									<Select
										value={productId}
										onValueChange={(value) => setProductId(value)}
										disabled={!childCategoryId}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={
													childCategoryId ? 'Select product' : 'Select category first'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{filteredProducts.map((product) => (
												<SelectItem key={product.id} value={String(product.id)}>
													{product.product_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="count">Count *</Label>
									{productId && (() => {
										const selectedProduct = products.find(p => p.id === Number(productId));
										const hasThresholds = selectedProduct?.min_count_threshold || selectedProduct?.max_count_threshold;
										
										return hasThresholds && (
											<div className="text-xs text-muted-foreground mb-1">
												{selectedProduct?.min_count_threshold && selectedProduct?.max_count_threshold && (
													<span>Valid range: {selectedProduct.min_count_threshold} - {selectedProduct.max_count_threshold}</span>
												)}
												{selectedProduct?.min_count_threshold && !selectedProduct?.max_count_threshold && (
													<span>Minimum: {selectedProduct.min_count_threshold}</span>
												)}
												{!selectedProduct?.min_count_threshold && selectedProduct?.max_count_threshold && (
													<span>Maximum: {selectedProduct.max_count_threshold}</span>
												)}
											</div>
										);
									})()}
									<Input
										id="count"
										type="number"
										step="0.01"
										min="0"
										value={count}
										onChange={(e) => setCount(e.target.value)}
										required
									/>
								</div>
								<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4">
									<Button
										type="submit"
										disabled={
											!can('update inventory counts') ||
											!branchId ||
											!inventoryPeriodId ||
											!childCategoryId ||
											!productId ||
											!count
										}
										className="w-full sm:w-auto"
									>
										Save
									</Button>
									<Link href="/inventory-counts" className="w-full sm:w-auto">
										<Button type="button" variant="outline" className="w-full">
											Back
										</Button>
									</Link>
								</div>
							</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
