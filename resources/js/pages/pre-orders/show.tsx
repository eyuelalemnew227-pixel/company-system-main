import { type BreadcrumbItem } from '@/types';
import { type PreOrder } from '@/types/pre-order';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, CopyIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Pre-Orders', href: '/pre-orders' },
	{ title: 'View Order', href: '#' },
];

type Props = {
	preOrder: PreOrder;
	userPermissions: string[];
};

const statusColors = {
	Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
	Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	Collected: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Show({ preOrder, userPermissions }: Props) {
	const { auth, flash, errors } = usePage<{
		auth: { user: { id: number } };
		flash: {
			success?: string;
			telegram_message?: string;
		};
		errors: Record<string, string[]>;
	}>().props;
	const currentUserId = auth.user.id;

	// Permission checks - require explicit permissions for this specific order type and ownership
	const isWalkin = preOrder.order_type?.name === 'Walkin Customer';
	const isOwn = preOrder.created_by === currentUserId;

	const hasGlobalEdit = userPermissions?.includes('update all pre-orders') || 
						 userPermissions?.includes('edit other users pre-orders') || 
						 userPermissions?.includes('update pre-orders');

	const hasTypePermission = isWalkin 
		? userPermissions?.includes('update walkin pre-orders')
		: userPermissions?.includes('update regular pre-orders');

	const canUpdateOrders = hasGlobalEdit || (isOwn && userPermissions?.includes('edit own pre-orders')) || hasTypePermission;
	
	const canDeleteOrders = userPermissions?.includes('delete pre-orders');
	const canCopyTelegram = userPermissions?.includes('copy pre-order telegram message');

	const [telegramMessage, setTelegramMessage] = useState<string>('');

	useEffect(() => {
		if (flash.success) {
			toast.success(flash.success);
		}
		if (errors.status) {
			toast.error(errors.status[0]);
		}
		if (flash.telegram_message) {
			setTelegramMessage(flash.telegram_message);
			toast.success('Telegram message generated! Click the copy button to copy it.');
		}
		// Generate telegram message if status is Paid but no message in flash
		else if (preOrder.status === 'Paid' && !telegramMessage) {
			const message = generateTelegramMessageForView(preOrder);
			setTelegramMessage(message);
		}
	}, [flash.success, errors.status, flash.telegram_message, preOrder.status, preOrder]);

	const generateTelegramMessageForView = (preOrder: PreOrder): string => {
		let message = '📦 *ORDER CONFIRMATION - PAID*\n\n';
		message += '*Order Details:*\n';
		message += `Order #: *${preOrder.order_number}*\n`;
		message += `Client: ${preOrder.client_name}\n`;
		message += `Phone: ${preOrder.phone_number}\n`;
		message += 'Status: ✅ PAID\n\n';

		message += '*Collection Information:*\n';
		message += `Day: ${preOrder.collection_day?.name || 'N/A'}\n`;
		message += `Collection Branch: ${preOrder.collection_branch?.name || 'N/A'}\n`;

		if (preOrder.registering_branch) {
			message += `Registering Branch: ${preOrder.registering_branch.name}\n`;
		}

		message += '*Order Items:*\n';
		if (preOrder.items && preOrder.items.length > 0) {
			preOrder.items.forEach((item) => {
				const productName = item.product ? item.product.product_name : 'Product';
				message += `• ${productName} (${item.quantity}x) - ETB ${item.subtotal}\n`;
			});
		}

		message += `\n*Total Amount: ETB ${preOrder.total_amount}*\n`;
		message += '\n*Payment Status: PAID*\n';
		message += '_Thank you for your order! Please keep this message for your records._\n';
		message += '\n---';
		message += '\nGenerated on: ' + new Date().toLocaleString();

		return message;
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Message copied to clipboard!');
		} catch (err) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				document.execCommand('copy');
				toast.success('Message copied to clipboard!');
			} catch (fallbackErr) {
				toast.error('Failed to copy message');
			}

			document.body.removeChild(textArea);
		}
	};

	const handleDelete = () => {
		if (confirm(`Are you sure you want to delete order ${preOrder.order_number}?`)) {
			router.delete(route('pre-orders.destroy', preOrder.id), {
				onSuccess: () => {
					router.visit('/pre-orders');
				},
			});
		}
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title={`Order ${preOrder.order_number}`} />

			<div className="container mx-auto space-y-6 p-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link href="/pre-orders">
							<Button variant="outline" size="sm">
								<ArrowLeftIcon className="mr-2 size-4" />
								Back
							</Button>
						</Link>
						<Heading
							title={`Order ${preOrder.order_number}`}
							description={`Created on ${new Date(preOrder.created_at).toLocaleDateString()}`}
						/>
					</div>
					<div className="flex gap-2">
						{canUpdateOrders && (
							<Link href={`/pre-orders/${preOrder.id}/edit`}>
								<Button variant="outline">
									<PencilIcon className="mr-2 size-4" />
									Edit
								</Button>
							</Link>
						)}
						{canDeleteOrders && (
							<Button variant="outline" onClick={handleDelete}>
								<Trash2Icon className="mr-2 size-4" />
								Delete
							</Button>
						)}
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{/* Customer Information */}
					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="text-lg font-semibold">Customer Information</h3>
						<div className="space-y-3">
							<div>
								<p className="text-sm text-muted-foreground">Client Name</p>
								<p className="font-medium">{preOrder.client_name}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Phone Number</p>
								<p className="font-medium">{preOrder.phone_number}</p>
							</div>
						</div>
					</div>

					{/* Order Details */}
					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="text-lg font-semibold">Order Details</h3>
						<div className="space-y-3">
							<div>
								<p className="text-sm text-muted-foreground">Order Type</p>
								<p className="font-medium">{preOrder.order_type?.name}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Collection Day</p>
								<p className="font-medium">{preOrder.collection_day?.name}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Collection Branch</p>
								<p className="font-medium">{preOrder.collection_branch?.name}</p>
							</div>
							{preOrder.registering_branch && (
								<div>
									<p className="text-sm text-muted-foreground">Registering Branch</p>
									<p className="font-medium">{preOrder.registering_branch.name}</p>
								</div>
							)}
							{preOrder.voucher_code && (
								<div>
									<p className="text-sm text-muted-foreground">Voucher Code</p>
									<p className="font-medium">{preOrder.voucher_code}</p>
								</div>
							)}
							{preOrder.transaction_reference && (
								<div>
									<p className="text-sm text-muted-foreground">Transaction Reference</p>
									<p className="font-medium">{preOrder.transaction_reference}</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Status Display */}
				<div className="space-y-4 rounded-lg border p-6">
					<h3 className="text-lg font-semibold">Order Status</h3>
					<div className="flex items-center gap-4">
						<span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusColors[preOrder.status]}`}>
							{preOrder.status}
						</span>
					</div>
				</div>

				{/* Telegram Message for Paid Orders */}
				{preOrder.status === 'Paid' && canCopyTelegram && (
					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="text-lg font-semibold">Telegram Message for Customer</h3>
						<p className="text-sm text-muted-foreground">Copy this message and send it to the customer via Telegram</p>

						<div className="space-y-3">
							<div className="rounded-lg border bg-muted/50 p-4">
								<pre className="font-mono text-sm whitespace-pre-wrap">{telegramMessage}</pre>
							</div>
							<div className="flex gap-2">
								<Button onClick={() => copyToClipboard(telegramMessage)} className="flex items-center gap-2">
									<CopyIcon className="size-4" />
									Copy Message
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Order Items */}
				<div className="space-y-4 rounded-lg border p-6">
					<h3 className="text-lg font-semibold">Order Items</h3>
					<div className="rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Product Name</TableHead>
									<TableHead>Unit Price</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead className="text-right">Subtotal</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{preOrder.items && preOrder.items.length > 0 ? (
									<>
										{preOrder.items.map((item) => (
											<TableRow key={item.id}>
												<TableCell className="font-medium">{item.product?.product_name}</TableCell>
												<TableCell>ETB {item.unit_price}</TableCell>
												<TableCell>{item.quantity}</TableCell>
												<TableCell className="text-right font-medium">ETB {item.subtotal}</TableCell>
											</TableRow>
										))}
										<TableRow className="bg-muted/50">
											<TableCell colSpan={3} className="text-right font-bold">
												Total Amount:
											</TableCell>
											<TableCell className="text-right text-lg font-bold">ETB {preOrder.total_amount}</TableCell>
										</TableRow>
									</>
								) : (
									<TableRow>
										<TableCell colSpan={4} className="text-center text-muted-foreground">
											No items in this order
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>

				{/* Metadata */}
				<div className="space-y-4 rounded-lg border p-6">
					<h3 className="text-lg font-semibold">Additional Information</h3>
					<div className="grid gap-3 md:grid-cols-2">
						<div>
							<p className="text-sm text-muted-foreground">Created By</p>
							<p className="font-medium">{preOrder.creator?.name}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Created At</p>
							<p className="font-medium">{new Date(preOrder.created_at).toLocaleString()}</p>
						</div>
						{preOrder.updater && (
							<>
								<div>
									<p className="text-sm text-muted-foreground">Last Updated By</p>
									<p className="font-medium">{preOrder.updater.name}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Last Updated At</p>
									<p className="font-medium">{new Date(preOrder.updated_at).toLocaleString()}</p>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
