<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

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

	const PALETTE = ['#b3261e', '#1f5c3d', '#b97c1a', '#2c5f8a', '#6b3fa0', '#8a5a2b', '#3d6b6b', '#a03a5c'];

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
	<h1 class="font-display text-3xl tracking-tight">Hasil</h1>
	<div class="flex items-center gap-3">
		{#if lastUpdated}
			<p class="text-xs text-ink-soft hidden sm:block">
				Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} (otomatis tiap 5 detik)
			</p>
		{/if}
		<button type="button" onclick={() => load()} class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-paper-deep">
			Muat ulang
		</button>
	</div>
</div>

{#if loading && !data}
	<p class="text-ink-soft">Memuat hasil...</p>
{:else if error && !data}
	<p role="alert" class="text-brand-deep font-semibold">{error}</p>
{:else if data}
	{#if data.perCandidate.length === 0}
		<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">
			Belum ada kandidat atau suara masuk.
		</div>
	{:else}
		<div class="grid gap-8 lg:grid-cols-2 mb-10">
			<section aria-label="Grafik batang perolehan poin" class="rounded-2xl border-2 border-ink bg-white p-6">
				<h2 class="font-display text-xl mb-5">Perolehan poin</h2>
				<div class="space-y-4">
					{#each data.perCandidate as c, i}
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span class="font-semibold truncate pr-2">{c.name}</span>
								<span class="text-ink-soft shrink-0">{c.points} poin</span>
							</div>
							<div class="h-4 rounded bg-paper-deep overflow-hidden" role="img" aria-label="{c.name}: {c.points} poin">
								<div class="h-full rounded" style="width: {(c.points / maxPoints) * 100}%; background-color: {PALETTE[i % PALETTE.length]};"></div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section aria-label="Diagram lingkaran perolehan poin" class="rounded-2xl border-2 border-ink bg-white p-6">
				<h2 class="font-display text-xl mb-5">Porsi suara</h2>
				{#if data.totalPoints === 0}
					<p class="text-ink-soft">Belum ada suara masuk.</p>
				{:else}
					<div class="flex flex-col sm:flex-row items-center gap-6">
						<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Diagram lingkaran porsi poin per kandidat">
							<circle cx="70" cy="70" r="54" fill="none" stroke="#f1e9d8" stroke-width="24" />
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
						<ul class="space-y-2 text-sm w-full">
							{#each data.perCandidate as c, i}
								<li class="flex items-center gap-2">
									<span class="w-4 h-4 rounded-sm shrink-0" style="background-color: {PALETTE[i % PALETTE.length]};" aria-hidden="true"></span>
									<span class="flex-1 truncate">{c.name}</span>
									<span class="text-ink-soft font-semibold">{c.sharePct}%</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		</div>

		<section aria-label="Peringkat kandidat" class="mb-10">
			<h2 class="font-display text-2xl tracking-tight mb-4">Peringkat</h2>
			<div class="overflow-x-auto rounded-xl border border-line">
				<table class="w-full text-sm bg-white">
					<thead>
						<tr class="border-b border-line text-left">
							<th scope="col" class="px-4 py-3 font-semibold">Peringkat</th>
							<th scope="col" class="px-4 py-3 font-semibold">Kandidat</th>
							<th scope="col" class="px-4 py-3 font-semibold text-right">Suara</th>
							<th scope="col" class="px-4 py-3 font-semibold text-right">Poin</th>
							<th scope="col" class="px-4 py-3 font-semibold text-right">Porsi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.perCandidate as c, i}
							<tr class="border-b border-line last:border-0 {i === 0 ? 'bg-paper-deep/50' : ''}">
								<td class="px-4 py-3 font-display text-lg">{i + 1}</td>
								<td class="px-4 py-3 font-semibold">{c.name}</td>
								<td class="px-4 py-3 text-right">{c.votes}</td>
								<td class="px-4 py-3 text-right font-semibold">{c.points}</td>
								<td class="px-4 py-3 text-right text-ink-soft">{c.sharePct}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex gap-6 mt-4 text-sm text-ink-soft">
				{#each data.byType as b}
					<span>{b.type === 'teacher' ? 'Suara guru' : 'Suara siswa'}: <strong class="text-ink">{b.votes}</strong> ({b.points} poin)</span>
				{/each}
			</div>
		</section>

		<section aria-label="Suara masuk terbaru">
			<h2 class="font-display text-2xl tracking-tight mb-4">Suara terbaru</h2>
			{#if data.recentVotes.length === 0}
				<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">Belum ada suara masuk.</div>
			{:else}
				<div class="overflow-x-auto rounded-xl border border-line">
					<table class="w-full text-sm bg-white">
						<thead>
							<tr class="border-b border-line text-left">
								<th scope="col" class="px-4 py-3 font-semibold">Waktu</th>
								<th scope="col" class="px-4 py-3 font-semibold">Kandidat</th>
								<th scope="col" class="px-4 py-3 font-semibold">Tipe pemilih</th>
								<th scope="col" class="px-4 py-3 font-semibold text-right">Poin</th>
							</tr>
						</thead>
						<tbody>
							{#each data.recentVotes as v}
								<tr class="border-b border-line last:border-0">
									<td class="px-4 py-3 text-ink-soft whitespace-nowrap">{fmtTime(v.created_at)}</td>
									<td class="px-4 py-3 font-semibold">{v.candidate_name}</td>
									<td class="px-4 py-3">{v.voter_type === 'teacher' ? 'Guru' : 'Siswa'}</td>
									<td class="px-4 py-3 text-right">{v.points}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-ink-soft mt-3">Kode token tidak ditampilkan di sini demi kerahasiaan pilihan pemilih.</p>
			{/if}
		</section>
	{/if}
{/if}
