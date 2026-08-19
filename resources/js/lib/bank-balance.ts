export type BankBalanceLike = {
	amount?: string | number | null;
	exchange_rate?: string | number | null;
	bank?: { currency?: string | null } | null;
};

/**
 * Current Balance as computed on Budget → Bank Balances → View Detail:
 * sum of (amount × exchange_rate) excluding USD and EUR currencies.
 */
export function computeCurrentBalance(balances: BankBalanceLike[]): number {
	let currentBalance = 0;

	balances.forEach((balance) => {
		const amount = parseFloat(String(balance.amount ?? 0)) || 0;
		const rate = parseFloat(String(balance.exchange_rate ?? 1)) || 1;
		const currency = balance.bank?.currency || 'ETB';
		const subtotal = amount * rate;

		if (currency !== 'USD' && currency !== 'EUR') {
			currentBalance += subtotal;
		}
	});

	return currentBalance;
}
