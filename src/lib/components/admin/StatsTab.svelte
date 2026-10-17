<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw } from '@lucide/svelte';

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
	let election = $state<'osis' | 'mpk'>('osis');

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/admin/stats?election=${election}`);
			if (!res.ok) throw new Error();
			stats = await res.json();
		} catch {
			error = 'Gagal memuat ringkasan.';
		} finally {
			loading = false;
		}
	}

	function selectElection(e: 'osis' | 'mpk') {
		if (election === e) return;
		election = e;
		stats = null;
		load();
	}

	onMount(load);
</script>

<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
	<div>
		<span class="lbl !mb-1">REKAPITULASI</span>
		<h1 class="section-head">Ringkasan</h1>
	</div>
	<div class="flex items-center gap-3">
		<div class="flex gap-1" role="tablist" aria-label="Pilih pemilihan">
			{#each [{ id: 'osis', label: 'OSIS' }, { id: 'mpk', label: 'MPK' }] as t}
				<button
					type="button"
					role="tab"
					aria-selected={election === t.id}
					onclick={() => selectElection(t.id as 'osis' | 'mpk')}
					class={election === t.id ? 'tab-active' : 'tab'}
				>
					{t.label}
				</button>
			{/each}
		</div>
		<button type="button" onclick={load} class="btn-line btn-sm">
			<RefreshCw class="h-4 w-4" />
			Muat ulang
		</button>
	</div>
</div>

{#if loading}
	<p class="text-muted">Memuat ringkasan...</p>
{:else if error}
	<p role="alert" class="alert-error">{error}</p>
{:else if stats}
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
		<div class="recap">
			<p class="recap-num">{stats.totalVotes}</p>
			<span class="recap-label">SUARA MASUK</span>
		</div>
		<div class="recap">
			<p class="recap-num">{stats.totalPoints}</p>
			<span class="recap-label">TOTAL POIN</span>
			<p class="text-xs text-faint mt-1">siswa 1 poin, guru 2 poin</p>
		</div>
		<div class="recap">
			<p class="recap-num">{stats.tokensUsed}<span class="text-xl text-faint">/{stats.tokensTotal}</span></p>
			<span class="recap-label">TOKEN TERPAKAI</span>
		</div>
		<div class="recap">
			<p class="recap-num">{stats.participationPct}<span class="text-xl text-faint">%</span></p>
			<span class="recap-label">PARTISIPASI</span>
		</div>
	</div>

	<span class="lbl">PEROLEHAN PER KANDIDAT</span>
	{#if stats.perCandidate.length === 0}
		<div class="recap text-muted">Belum ada kandidat. Tambahkan kandidat di tab Kandidat.</div>
	{:else}
		<div class="ledger-wrap">
			<table class="ledger">
				<thead>
					<tr>
						<th scope="col">NO</th>
						<th scope="col">KANDIDAT</th>
						<th scope="col" class="text-right">SUARA</th>
						<th scope="col" class="text-right">POIN</th>
					</tr>
				</thead>
				<tbody>
					{#each stats.perCandidate as c, i}
						<tr class={i === 0 ? 'bg-picked' : ''}>
							<td>
								<span class="num-circle !w-8 !h-8 !text-[13px] {i === 0 ? '!border-flag !text-flag' : ''}" aria-label="Peringkat {i + 1}">
									{i + 1}
								</span>
							</td>
							<td class="font-extrabold">{c.name}</td>
							<td class="text-right">{c.votes}</td>
							<td class="text-right font-extrabold text-lg">{c.points}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}
