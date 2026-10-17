<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { RefreshCw } from '@lucide/svelte';

	interface PerCandidate {
		id: string;
		name: string;
		photo_url: string | null;
		votes: number;
		points: number;
		sharePct: number;
	}
	interface RecentVote {
		created_at: string;
		points: number;
		voter_type: 'student' | 'teacher';
		candidate_name: string;
	}
	interface Results {
		perCandidate: PerCandidate[];
		byType: { type: 'student' | 'teacher'; votes: number; points: number }[];
		recentVotes: RecentVote[];
		totalPoints: number;
	}

	const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#0ea5e9', '#34d399', '#fbbf24', '#1d4ed8', '#047857'];

	let data = $state<Results | null>(null);
	let error = $state('');
	let loading = $state(true);
	let lastUpdated = $state<Date | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;

	async function load(silent = false) {
		if (!silent) loading = true;
		try {
			const res = await fetch('/api/admin/results');
			if (!res.ok) throw new Error();
			data = await res.json();
			lastUpdated = new Date();
			error = '';
		} catch {
			if (!data) error = 'Gagal memuat hasil.';
		} finally {
			loading = false;
		}
	}

	const maxPoints = $derived(Math.max(1, ...(data?.perCandidate.map((c) => c.points) ?? [1])));

	function donutSegments(): { color: string; dash: string; offset: number; label: string }[] {
		if (!data || data.totalPoints === 0) return [];
		const R = 54;
		const C = 2 * Math.PI * R;
		let acc = 0;
		return data.perCandidate.map((c, i) => {
			const frac = c.points / data!.totalPoints;
			const seg = {
				color: PALETTE[i % PALETTE.length],
				dash: `${frac * C} ${C}`,
				offset: -(acc * C),
				label: `${c.name}: ${c.sharePct}%`
			};
			acc += frac;
			return seg;
		});
	}

	function fmtTime(iso: string): string {
		return new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
	}

	onMount(() => {
		load();
		timer = setInterval(() => load(true), 5000);
	});
	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="page-title">Hasil</h1>
	<div class="flex items-center gap-3">
		{#if lastUpdated}
			<p class="text-xs text-slate-500 hidden sm:block">
				Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} (otomatis tiap 5 detik)
			</p>
		{/if}
		<button type="button" onclick={() => load()} class="btn-secondary btn-sm">
			<RefreshCw class="h-4 w-4" />
			Muat ulang
		</button>
	</div>
</div>

{#if loading && !data}
	<p class="text-slate-500">Memuat hasil...</p>
{:else if error && !data}
	<p role="alert" class="alert-error">{error}</p>
{:else if data}
	{#if data.perCandidate.length === 0}
		<div class="card-pad text-slate-500">
			Belum ada kandidat atau suara masuk.
		</div>
	{:else}
		<div class="grid gap-5 lg:grid-cols-2 mb-10">
			<section aria-label="Grafik batang perolehan poin" class="card-pad">
				<h2 class="text-xl font-bold text-slate-900 mb-5">Perolehan poin</h2>
				<div class="space-y-4">
					{#each data.perCandidate as c, i}
						<div>
							<div class="flex justify-between text-sm mb-1.5">
								<span class="font-semibold text-slate-900 truncate pr-2">{c.name}</span>
								<span class="text-slate-500 shrink-0">{c.points} poin</span>
							</div>
							<div class="h-3.5 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label="{c.name}: {c.points} poin">
								<div class="h-full rounded-full transition-all" style="width: {(c.points / maxPoints) * 100}%; background-color: {PALETTE[i % PALETTE.length]};"></div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section aria-label="Diagram lingkaran perolehan poin" class="card-pad">
				<h2 class="text-xl font-bold text-slate-900 mb-5">Porsi suara</h2>
				{#if data.totalPoints === 0}
					<p class="text-slate-500">Belum ada suara masuk.</p>
				{:else}
					<div class="flex flex-col sm:flex-row items-center gap-6">
						<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Diagram lingkaran porsi poin per kandidat" class="shrink-0">
							<circle cx="70" cy="70" r="54" fill="none" stroke="#f1f5f9" stroke-width="24" />
							{#each donutSegments() as s}
								<circle
									cx="70"
									cy="70"
									r="54"
									fill="none"
									stroke={s.color}
									stroke-width="24"
									stroke-dasharray={s.dash}
									stroke-dashoffset={s.offset}
									transform="rotate(-90 70 70)"
								>
									<title>{s.label}</title>
								</circle>
							{/each}
						</svg>
						<ul class="space-y-2.5 text-sm w-full">
							{#each data.perCandidate as c, i}
								<li class="flex items-center gap-2.5">
									<span class="w-4 h-4 rounded shrink-0" style="background-color: {PALETTE[i % PALETTE.length]};" aria-hidden="true"></span>
									<span class="flex-1 truncate text-slate-700">{c.name}</span>
									<span class="text-slate-500 font-bold">{c.sharePct}%</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		</div>

		<section aria-label="Peringkat kandidat" class="mb-10">
			<h2 class="section-title mb-4">Peringkat</h2>
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th scope="col">Peringkat</th>
							<th scope="col">Kandidat</th>
							<th scope="col" class="text-right">Suara</th>
							<th scope="col" class="text-right">Poin</th>
							<th scope="col" class="text-right">Porsi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.perCandidate as c, i}
							<tr class={i === 0 ? 'bg-blue-50/60' : ''}>
								<td>
									<span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold {i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}">
										{i + 1}
									</span>
								</td>
								<td class="font-semibold text-slate-900">{c.name}</td>
								<td class="text-right">{c.votes}</td>
								<td class="text-right font-bold text-slate-900">{c.points}</td>
								<td class="text-right text-slate-500">{c.sharePct}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-slate-500">
				{#each data.byType as b}
					<span>{b.type === 'teacher' ? 'Suara guru' : 'Suara siswa'}: <strong class="text-slate-900">{b.votes}</strong> ({b.points} poin)</span>
				{/each}
			</div>
		</section>

		<section aria-label="Suara masuk terbaru">
			<h2 class="section-title mb-4">Suara terbaru</h2>
			{#if data.recentVotes.length === 0}
				<div class="card-pad text-slate-500">Belum ada suara masuk.</div>
			{:else}
				<div class="table-wrap">
					<table class="table">
						<thead>
							<tr>
								<th scope="col">Waktu</th>
								<th scope="col">Kandidat</th>
								<th scope="col">Tipe pemilih</th>
								<th scope="col" class="text-right">Poin</th>
							</tr>
						</thead>
						<tbody>
							{#each data.recentVotes as v}
								<tr>
									<td class="text-slate-500 whitespace-nowrap">{fmtTime(v.created_at)}</td>
									<td class="font-semibold text-slate-900">{v.candidate_name}</td>
									<td>
										<span class={v.voter_type === 'teacher' ? 'badge-amber' : 'badge-blue'}>
											{v.voter_type === 'teacher' ? 'Guru' : 'Siswa'}
										</span>
									</td>
									<td class="text-right">{v.points}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-slate-500 mt-3">Kode token tidak ditampilkan di sini demi kerahasiaan pilihan pemilih.</p>
			{/if}
		</section>
	{/if}
{/if}
