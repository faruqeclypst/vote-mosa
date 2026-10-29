<script lang="ts">
	let {
		page,
		totalPages,
		label,
		onPage
	}: {
		page: number;
		totalPages: number;
		label: string;
		onPage: (p: number) => void;
	} = $props();

	const pageList = $derived.by<(number | '…')[]>(() => {
		const n = totalPages;
		const cur = page + 1;
		if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
		const keep = new Set([1, 2, n - 1, n, cur - 1, cur, cur + 1]);
		const out: (number | '…')[] = [];
		let prev = 0;
		for (let p = 1; p <= n; p++) {
			if (!keep.has(p)) continue;
			if (prev && p - prev > 1) out.push('…');
			out.push(p);
			prev = p;
		}
		return out;
	});
</script>

{#if totalPages > 1}
	<nav class="flex flex-wrap items-center justify-between gap-3 mt-4" aria-label={label}>
		<button type="button" onclick={() => onPage(page - 1)} disabled={page === 0} class="btn-line btn-sm">
			Sebelumnya
		</button>
		<div class="flex flex-wrap items-center gap-1">
			{#each pageList as p}
				{#if p === '…'}
					<span class="px-2 text-muted" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						onclick={() => onPage(p - 1)}
						aria-current={p === page + 1 ? 'page' : undefined}
						class={p === page + 1 ? 'btn-flag btn-sm !w-auto px-3' : 'btn-line btn-sm !w-auto px-3'}
					>
						{p}
					</button>
				{/if}
			{/each}
		</div>
		<button type="button" onclick={() => onPage(page + 1)} disabled={page >= totalPages - 1} class="btn-line btn-sm">
			Berikutnya
		</button>
	</nav>
{/if}
