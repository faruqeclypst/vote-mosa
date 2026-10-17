<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, Vote, Star, KeyRound, Users } from '@lucide/svelte';

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
	<h1 class="page-title">Ringkasan</h1>
	<button type="button" onclick={load} class="btn-secondary btn-sm">
		<RefreshCw class="h-4 w-4" />
		Muat ulang
	</button>
</div>

{#if loading}
	<p class="text-slate-500">Memuat ringkasan...</p>
{:else if error}
	<p role="alert" class="alert-error">{error}</p>
{:else if stats}
	{@const cards = [
		{ icon: Vote, tile: 'bg-blue-100 text-blue-700', label: 'Total suara masuk', value: String(stats.totalVotes), sub: null },
		{ icon: Star, tile: 'bg-amber-100 text-amber-700', label: 'Total poin', value: String(stats.totalPoints), sub: 'siswa 1 poin, guru 2 poin' },
		{ icon: KeyRound, tile: 'bg-emerald-100 text-emerald-700', label: 'Token terpakai', value: `${stats.tokensUsed}/${stats.tokensTotal}`, sub: null },
		{ icon: Users, tile: 'bg-slate-100 text-slate-600', label: 'Partisipasi', value: `${stats.participationPct}%`, sub: null }
	]}
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
		{#each cards as c}
			<div class="card-pad p-5">
				<div class="rounded-xl w-10 h-10 flex items-center justify-center mb-3 {c.tile}" aria-hidden="true">
					<c.icon class="h-5 w-5" />
				</div>
				<p class="text-sm text-slate-500 mb-1">{c.label}</p>
				<p class="text-3xl font-extrabold tracking-tight text-slate-900">{c.value}</p>
				{#if c.sub}
					<p class="text-xs text-slate-500 mt-1">{c.sub}</p>
				{/if}
			</div>
		{/each}
	</div>

	<h2 class="section-title mb-4">Perolehan per kandidat</h2>
	{#if stats.perCandidate.length === 0}
		<div class="card-pad text-slate-500">
			Belum ada kandidat. Tambahkan kandidat di tab Kandidat.
		</div>
	{:else}
		<div class="card divide-y divide-slate-100">
			{#each stats.perCandidate as c, i}
				<div class="p-4 flex items-center gap-4">
					<span
						class="text-sm font-bold w-9 h-9 shrink-0 rounded-full {i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center"
						aria-label="Peringkat {i + 1}"
					>
						{i + 1}
					</span>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-slate-900 truncate">{c.name}</p>
						<p class="text-sm text-slate-500">{c.votes} suara, {c.points} poin</p>
					</div>
					<p class="text-2xl font-extrabold text-slate-900 shrink-0">{c.points}</p>
				</div>
			{/each}
		</div>
	{/if}
{/if}
