import { Pagination } from '@/types/pagination';
import { Link } from '@inertiajs/react';
import { Button } from './ui/button';

export default function TablePagination({ links = [], total, to, from }: Partial<Pagination>) {
	return (
		<div className="flex flex-col items-center justify-between gap-4 border-t bg-white px-8 pt-5 sm:flex-row dark:bg-gray-800">
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">
					Showing {from} to {to} of {total} results
				</span>
			</div>
			<div className="flex items-center space-x-2">
				{links.map((link, index) =>
					link.url !== null ? (
						<Link href={link.url || '#'} key={index}>
							<Button
								variant={'outline'}
								className={link.active ? 'bg-blue-500 text-white' : ''}
								size={'sm'}
								disabled={!link.url}
								dangerouslySetInnerHTML={{ __html: link.label }}
							/>
						</Link>
					) : (
						<Button key={index} variant={'outline'} size={'sm'} disabled dangerouslySetInnerHTML={{ __html: link.label }} />
					),
				)}
			</div>
		</div>
	);
}
