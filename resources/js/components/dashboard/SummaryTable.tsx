import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Search, X, Download } from 'lucide-react';
import { useMemo, useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';

interface SummaryTableProps {
	data: Array<{
		collectionBranch: string;
		collectionDay: string;
		product: string;
		totalQuantity: number;
		totalAmount: number;
		totalOrders: number;
	}>;
}

interface GroupedData {
	branch: string;
	totalQuantity: number;
	totalAmount: number;
	totalOrders: number;
	items: SummaryTableProps['data'];
}

export default function SummaryTable({
	data,
}: SummaryTableProps) {
	const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-ET', {
			style: 'currency',
			currency: 'ETB',
		}).format(amount);
	};

	// Group data by branch
	const groupedData = useMemo(() => {
		const groups = new Map<string, GroupedData>();

		data?.forEach((item) => {
			const branchName = item.collectionBranch;
			if (!groups.has(branchName)) {
				groups.set(branchName, {
					branch: branchName,
					totalQuantity: 0,
					totalAmount: 0,
					totalOrders: 0,
					items: [],
				});
			}

			const group = groups.get(branchName)!;
			group.totalQuantity += item.totalQuantity;
			group.totalAmount += item.totalAmount;
			group.totalOrders += item.totalOrders;
			group.items.push(item);
		});

		return Array.from(groups.values());
	}, [data]);

	// Set default expanded state when data changes
	useEffect(() => {
		if (groupedData.length > 0) {
			setExpandedBranches(new Set(groupedData.map(g => g.branch)));
		}
	}, [data]); // Depend on data length or reference, not groupedData object creation if possible, but groupedData is useMemo so it's fine.

	const toggleBranch = (branch: string) => {
		const newExpanded = new Set(expandedBranches);
		if (newExpanded.has(branch)) {
			newExpanded.delete(branch);
		} else {
			newExpanded.add(branch);
		}
		setExpandedBranches(newExpanded);
	};

	const toggleAllBranches = () => {
		if (expandedBranches.size === groupedData.length) {
			setExpandedBranches(new Set());
		} else {
			const allBranches = new Set(groupedData.map(g => g.branch));
			setExpandedBranches(allBranches);
		}
	};

	const isAllExpanded = groupedData.length > 0 && expandedBranches.size === groupedData.length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Orders by Collection Branch</CardTitle>
				<CardDescription>Grouped by branch. Click arrows to expand details.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[300px]">
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0 hover:bg-transparent"
											onClick={toggleAllBranches}
											title={isAllExpanded ? "Collapse All" : "Expand All"}
										>
											{isAllExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
										</Button>
										Collection Branch
									</div>
								</TableHead>
								<TableHead>Collection Day</TableHead>
								<TableHead>Product</TableHead>
								<TableHead className="text-right">Quantity</TableHead>
								<TableHead className="text-right">Total Amount</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{groupedData.map((group) => {
								const isExpanded = expandedBranches.has(group.branch);
								return (
									<Fragment key={group.branch}>
										{/* Branch Summary Row */}
										<TableRow
											className="cursor-pointer hover:bg-gray-50 font-semibold"
											onClick={() => toggleBranch(group.branch)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent">
														{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
													</Button>
													<span className="text-base">{group.branch}</span>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground italic text-sm">-</TableCell>
											<TableCell className="text-muted-foreground italic text-sm">-</TableCell>
											<TableCell className="text-right font-bold">{group.totalQuantity.toLocaleString()}</TableCell>
											<TableCell className="text-right text-green-600 font-bold">{formatCurrency(group.totalAmount)}</TableCell>
										</TableRow>

										{/* Expanded Details */}
										{isExpanded && group.items.map((item, index) => (
											<TableRow key={`${group.branch}-${index}`} className="bg-gray-50/50 hover:bg-gray-100/50">
												<TableCell className="pl-12"></TableCell>
												<TableCell>
													<Badge variant="outline" className="border-green-200 bg-green-50 text-green-800 font-normal">
														{item.collectionDay}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-800 font-normal">
														{item.product}
													</Badge>
												</TableCell>
												<TableCell className="text-right font-medium">{item.totalQuantity.toLocaleString()}</TableCell>
												<TableCell className="text-right font-medium text-green-600">{formatCurrency(item.totalAmount)}</TableCell>
											</TableRow>
										))}
									</Fragment>
								);
							})}

							{/* Grand Total Row */}
							<TableRow className="bg-gray-100 font-bold border-t-2 border-gray-200">
								<TableCell className="text-lg pl-10">Grand Total</TableCell>
								<TableCell></TableCell>
								<TableCell></TableCell>
								<TableCell className="text-right text-base">
									{groupedData.reduce((sum, group) => sum + group.totalQuantity, 0).toLocaleString()}
								</TableCell>
								<TableCell className="text-right text-lg text-green-700">
									{formatCurrency(groupedData.reduce((sum, group) => sum + group.totalAmount, 0))}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
