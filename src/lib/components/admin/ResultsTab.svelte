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

	// Palet merah-tinta-kertas: merah bendera, tinta, abu hangat
	const PALETTE = ['#c8102e', '#1b1b1b', '#8a8478', '#7a1f2b', '#b9b2a4', '#6b675e'];

	let data = $state<Results | null>(null);
	let error = $state('');
	let loading = $state(true);
	let lastUpdated = $state<Date | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;
	let election = $state<'osis' | 'mpk'>('osis');

	async function load(silent = false) {
		if (!silent) loading = true;
		try {
			const res = await fetch(`/api/admin/results?election=${election}`);
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

	function selectElection(e: 'osis' | 'mpk') {
		if (election === e) return;
		election = e;
		data = null;
		load();
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

<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
	<div>
		<span class="lbl !mb-1">PENGHITUNGAN SUARA</span>
		<h1 class="section-head">Hasil</h1>
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
		{#if lastUpdated}
			<p class="text-xs text-faint hidden sm:block">
				Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} (otomatis tiap 5 detik)
			</p>
		{/if}
		<button type="button" onclick={() => load()} class="btn-line btn-sm">
			<RefreshCw class="h-4 w-4" />
			Muat ulang
		</button>
	</div>
</div>

{#if loading && !data}
	<p class="text-muted">Memuat hasil...</p>
{:else if error && !data}
	<p role="alert" class="alert-error">{error}</p>
{:else if data}
	{#if data.perCandidate.length === 0}
		<div class="recap text-muted">Belum ada kandidat atau suara masuk.</div>
	{:else}
		<div class="grid gap-4 lg:grid-cols-2 mb-10">
			<section aria-label="Grafik batang perolehan poin" class="recap !p-6">
				<span class="lbl">PEROLEHAN POIN</span>
				<div class="space-y-4 mt-4">
					{#each data.perCandidate as c, i}
						<div>
							<div class="flex justify-between text-sm mb-1.5">
								<span class="font-extrabold truncate pr-2">{c.name}</span>
								<span class="text-muted shrink-0">{c.points} poin</span>
							</div>
							<div class="h-3.5 bg-desk overflow-hidden rounded-sm" role="img" aria-label="{c.name}: {c.points} poin">
								<div class="h-full transition-all" style="width: {(c.points / maxPoints) * 100}%; background-color: {PALETTE[i % PALETTE.length]};"></div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section aria-label="Diagram lingkaran perolehan poin" class="recap !p-6">
				<span class="lbl">PORSI SUARA</span>
				{#if data.totalPoints === 0}
					<p class="text-muted mt-4">Belum ada suara masuk.</p>
				{:else}
					<div class="flex flex-col sm:flex-row items-center gap-6 mt-4">
						<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Diagram lingkaran porsi poin per kandidat" class="shrink-0">
							<circle cx="70" cy="70" r="54" fill="none" stroke="#e7e2d6" stroke-width="24" />
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
									<span class="w-4 h-4 rounded-sm shrink-0" style="background-color: {PALETTE[i % PALETTE.length]};" aria-hidden="true"></span>
									<span class="flex-1 truncate text-muted">{c.name}</span>
									<span class="font-extrabold">{c.sharePct}%</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		</div>

		<section aria-label="Peringkat kandidat" class="mb-10">
			<span class="lbl">PERINGKAT</span>
			<div class="ledger-wrap mt-4">
				<table class="ledger">
					<thead>
						<tr>
							<th scope="col">NO</th>
							<th scope="col">KANDIDAT</th>
							<th scope="col" class="text-right">SUARA</th>
							<th scope="col" class="text-right">POIN</th>
							<th scope="col" class="text-right">PORSI</th>
						</tr>
					</thead>
					<tbody>
						{#each data.perCandidate as c, i}
							<tr class={i === 0 ? 'bg-picked' : ''}>
								<td>
									<span class="num-circle !w-8 !h-8 !text-[13px] {i === 0 ? '!border-flag !text-flag' : ''}">
										{i + 1}
									</span>
								</td>
								<td class="font-extrabold">{c.name}</td>
								<td class="text-right">{c.votes}</td>
								<td class="text-right font-extrabold">{c.points}</td>
								<td class="text-right text-muted">{c.sharePct}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-muted">
				{#each data.byType as b}
					<span>{b.type === 'teacher' ? 'Suara guru' : 'Suara siswa'}: <strong class="text-ink">{b.votes}</strong> ({b.points} poin)</span>
				{/each}
			</div>
		</section>

		<section aria-label="Suara masuk terbaru">
			<span class="lbl">SUARA TERBARU</span>
			{#if data.recentVotes.length === 0}
				<div class="recap text-muted mt-4">Belum ada suara masuk.</div>
			{:else}
				<div class="ledger-wrap mt-4">
					<table class="ledger">
						<thead>
							<tr>
								<th scope="col">WAKTU</th>
								<th scope="col">KANDIDAT</th>
								<th scope="col">TIPE PEMILIH</th>
								<th scope="col" class="text-right">POIN</th>
							</tr>
						</thead>
						<tbody>
							{#each data.recentVotes as v}
								<tr>
									<td class="text-muted whitespace-nowrap">{fmtTime(v.created_at)}</td>
									<td class="font-extrabold">{v.candidate_name}</td>
									<td>
										<span class="text-xs font-extrabold tracking-widest {v.voter_type === 'teacher' ? 'text-flag' : 'text-muted'}">
											{v.voter_type === 'teacher' ? 'GURU' : 'SISWA'}
										</span>
									</td>
									<td class="text-right">{v.points}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-faint mt-3">Kode token tidak ditampilkan di sini demi kerahasiaan pilihan pemilih.</p>
			{/if}
		</section>
	{/if}
{/if}
