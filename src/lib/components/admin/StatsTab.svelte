<script lang="ts">
	import { onMount } from 'svelte';

	interface PerCandidate {
		id: string;
		name: string;
		photo_url: string | null;
		votes: number;
		points: number;
	}
	interface Stats {
		totalVotes: number;
		totalPoints: number;
		tokensUsed: number;
		tokensTotal: number;
		participationPct: number;
		perCandidate: PerCandidate[];
	}

	let stats = $state<Stats | null>(null);
	let error = $state('');
	let loading = $state(true);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/admin/stats');
			if (!res.ok) throw new Error();
			stats = await res.json();
		} catch {
			error = 'Gagal memuat ringkasan.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="font-display text-3xl tracking-tight">Ringkasan</h1>
	<button
		type="button"
		onclick={load}
		class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-paper-deep"
	>
		Muat ulang
	</button>
</div>

{#if loading}
	<p class="text-ink-soft">Memuat ringkasan...</p>
{:else if error}
	<p role="alert" class="text-brand-deep font-semibold">{error}</p>
{:else if stats}
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
		<div class="rounded-xl border-2 border-ink bg-white p-5">
			<p class="text-sm text-ink-soft mb-1">Total suara masuk</p>
			<p class="font-display text-4xl">{stats.totalVotes}</p>
		</div>
		<div class="rounded-xl border-2 border-ink bg-white p-5">
			<p class="text-sm text-ink-soft mb-1">Total poin</p>
			<p class="font-display text-4xl">{stats.totalPoints}</p>
			<p class="text-xs text-ink-soft mt-1">siswa 1 poin, guru 2 poin</p>
		</div>
		<div class="rounded-xl border-2 border-ink bg-white p-5">
			<p class="text-sm text-ink-soft mb-1">Token terpakai</p>
			<p class="font-display text-4xl">{stats.tokensUsed}<span class="text-xl text-ink-soft">/{stats.tokensTotal}</span></p>
		</div>
		<div class="rounded-xl border-2 border-ink bg-white p-5">
			<p class="text-sm text-ink-soft mb-1">Partisipasi</p>
			<p class="font-display text-4xl">{stats.participationPct}<span class="text-xl text-ink-soft">%</span></p>
		</div>
	</div>

	<h2 class="font-display text-2xl tracking-tight mb-4">Perolehan per kandidat</h2>
	{#if stats.perCandidate.length === 0}
		<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">
			Belum ada kandidat. Tambahkan kandidat di tab Kandidat.
		</div>
	{:else}
		<div class="space-y-3">
			{#each stats.perCandidate as c, i}
				<div class="rounded-xl border border-line bg-white p-4 flex items-center gap-4">
					<span
						class="font-display text-lg w-9 h-9 shrink-0 rounded-full {i === 0 ? 'bg-brand text-white' : 'bg-paper-deep text-ink'} flex items-center justify-center"
						aria-label="Peringkat {i + 1}"
					>
						{i + 1}
					</span>
					<div class="flex-1 min-w-0">
						<p class="font-semibold truncate">{c.name}</p>
						<p class="text-sm text-ink-soft">{c.votes} suara, {c.points} poin</p>
					</div>
					<p class="font-display text-2xl shrink-0">{c.points}</p>
				</div>
			{/each}
		</div>
	{/if}
{/if}
