<script lang="ts">
	import { onMount } from 'svelte';
	import Pager from '$lib/components/admin/Pager.svelte';
	import { Copy, Download, Trash2 } from '@lucide/svelte';

	interface TokenItem {
		id: string;
		code: string;
		type: 'student' | 'teacher';
		label: string | null;
		is_used: boolean;
		used_at: string | null;
		created_at: string;
	}

	interface TokenGroup {
		type: 'student' | 'teacher';
		label: string;
		total: number;
		used: number;
		unused: number;
	}

	let items = $state<TokenItem[]>([]);
	let total = $state(0);
	let error = $state('');
	let loading = $state(true);

	let genCount = $state(30);
	let genType = $state<'student' | 'teacher'>('student');
	let genLabel = $state('');
	let generating = $state(false);
	let genError = $state('');
	let newCodes = $state<string[]>([]);

	let filterType = $state('');
	let filterUsed = $state('');
	let filterLabel = $state('');
	let search = $state('');
	let page = $state(0);
	let pageSize = $state(10);

	let groups = $state<TokenGroup[]>([]);
	let groupPage = $state(0);
	const GROUP_PAGE_SIZE = 10;
	const groupTotalPages = $derived(Math.max(1, Math.ceil(groups.length / GROUP_PAGE_SIZE)));
	const pagedGroups = $derived(groups.slice(groupPage * GROUP_PAGE_SIZE, (groupPage + 1) * GROUP_PAGE_SIZE));
	$effect(() => {
		if (groupPage > groupTotalPages - 1) groupPage = groupTotalPages - 1;
	});
	const classGroups = $derived(groups.filter((g) => g.type === 'student'));
	const teacherGroups = $derived(groups.filter((g) => g.type === 'teacher'));
	const teacherTotal = $derived(teacherGroups.reduce((s, g) => s + g.total, 0));

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const rangeStart = $derived(total === 0 ? 0 : page * pageSize + 1);
	const rangeEnd = $derived(Math.min(total, (page + 1) * pageSize));

	// Nomor halaman yang ditampilkan: awal, akhir, dan sekitar halaman aktif, sisanya elipsis.
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

	const exportUrl = $derived(() => {
		const p = new URLSearchParams();
		if (filterType) p.set('type', filterType);
		if (filterUsed) p.set('used', filterUsed);
		if (filterLabel) p.set('label', filterLabel);
		const qs = p.toString();
		return qs ? `/api/admin/tokens/export?${qs}` : '/api/admin/tokens/export';
	});

	function groupExportUrl(g: TokenGroup): string {
		const p = new URLSearchParams({ type: g.type });
		if (g.label) p.set('label', g.label);
		return `/api/admin/tokens/export?${p.toString()}`;
	}

	async function load() {
		loading = true;
		error = '';
		try {
			const p = new URLSearchParams({
				limit: String(pageSize),
				offset: String(page * pageSize)
			});
			if (filterType) p.set('type', filterType);
			if (filterUsed) p.set('used', filterUsed);
			if (filterLabel) p.set('label', filterLabel);
			if (search.trim()) p.set('q', search.trim());
			const res = await fetch(`/api/admin/tokens?${p.toString()}`);
			if (!res.ok) throw new Error();
			const body = await res.json();
			items = body.items;
			total = body.total;
			if (page > 0 && items.length === 0 && total > 0) {
				page = Math.max(0, Math.ceil(total / pageSize) - 1);
				return load();
			}
		} catch {
			error = 'Gagal memuat token.';
		} finally {
			loading = false;
		}
	}

	async function loadGroups() {
		try {
			const res = await fetch('/api/admin/tokens/groups');
			if (!res.ok) return;
			const body = await res.json();
			groups = body.groups ?? [];
		} catch {
			groups = [];
		}
	}

	function applyFilter() {
		page = 0;
		load();
	}

	function goToPage(p: number) {
		page = Math.min(Math.max(0, p), totalPages - 1);
		load();
	}

	function changePageSize() {
		page = 0;
		load();
	}

	async function generate(e: SubmitEvent) {
		e.preventDefault();
		if (generating) return;
		generating = true;
		genError = '';
		newCodes = [];
		try {
			const res = await fetch('/api/admin/tokens/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ count: Number(genCount), type: genType, label: genLabel.trim() || null })
			});
			const body = await res.json();
			if (!res.ok) {
				genError = body.error ?? 'Gagal membuat token.';
				generating = false;
				return;
			}
			newCodes = body.codes;
			await Promise.all([load(), loadGroups()]);
		} catch {
			genError = 'Tidak bisa terhubung ke server.';
		} finally {
			generating = false;
		}
	}

	async function remove(id: string) {
		try {
			const res = await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json();
				error = body.error ?? 'Gagal menghapus token.';
				return;
			}
			await Promise.all([load(), loadGroups()]);
		} catch {
			error = 'Tidak bisa terhubung ke server.';
		}
	}

	async function copyCodes() {
		try {
			await navigator.clipboard.writeText(newCodes.join('\n'));
		} catch {
			/* clipboard tidak tersedia */
		}
	}

	onMount(() => {
		load();
		loadGroups();
	});
</script>

<div class="mb-6">
	<span class="lbl !mb-1">SURAT KUASA MEMILIH</span>
	<h1 class="section-head">Token</h1>
	<p class="text-sm text-muted mt-2 max-w-xl">
		Satu token berlaku untuk setiap pemilihan yang dibuka, satu suara ketua OSIS dan satu suara ketua MPK.
		Status "terpakai" berarti token sudah dipakai di minimal satu pemilihan.
	</p>
</div>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label="Buat token baru" class="recap !p-6 mb-10">
	<h2 class="text-lg font-extrabold mb-4">Buat token baru</h2>
	<form onsubmit={generate} class="grid gap-4 sm:grid-cols-4 items-end">
		<div>
			<label for="t-count" class="field-label">Jumlah</label>
			<input id="t-count" type="number" bind:value={genCount} min="1" max="1000" required class="input" />
		</div>
		<div>
			<label for="t-type" class="field-label">Tipe</label>
			<select id="t-type" bind:value={genType} class="input">
				<option value="student">Siswa (1 poin)</option>
				<option value="teacher">Guru (2 poin)</option>
			</select>
		</div>
		<div class="sm:col-span-2">
			<label for="t-label" class="field-label">Label kelas (mis. X-1, atau Guru)</label>
			<input id="t-label" type="text" bind:value={genLabel} maxlength="80" placeholder="Opsional" class="input" />
		</div>
		<div class="sm:col-span-4">
			<button type="submit" disabled={generating} class="btn-flag !w-auto px-8">
				{generating ? 'Membuat...' : 'Buat token'}
			</button>
		</div>
	</form>
	{#if genError}
		<p role="alert" class="alert-error mt-4">{genError}</p>
	{/if}
	{#if newCodes.length > 0}
		<div class="mt-6 rounded-md border-2 border-ink bg-paper p-5">
			<div class="flex flex-wrap items-center justify-between gap-3 mb-3">
				<p class="font-extrabold">{newCodes.length} token baru dibuat</p>
				<button type="button" onclick={copyCodes} class="btn-line btn-sm">
					<Copy class="h-4 w-4" />
					Salin semua
				</button>
			</div>
			<p class="font-mono text-sm leading-relaxed break-words">{newCodes.join('  ')}</p>
			<p class="text-[13px] text-muted mt-3">Simpan daftar ini, kode tidak ditampilkan lagi setelah halaman dimuat ulang.</p>
		</div>
	{/if}
</section>

<section aria-label="Export token per kelompok" class="mb-10">
	<span class="lbl">EXPORT PER KELAS DAN GURU</span>
	<p class="text-sm text-muted mt-2 mb-4 max-w-xl">
		Unduh CSV berisi kode token per kelas untuk dibagikan ke wali kelas, dan satu berkas khusus guru.
		Kolom label menjadi nama kelas pada berkas siswa.
	</p>
	<div class="flex flex-wrap gap-2 mb-4">
		<a href="/api/admin/tokens/export?type=teacher" class="btn-flag !w-auto px-5 btn-sm">
			<Download class="h-4 w-4" />
			Export semua guru ({teacherTotal} token)
		</a>
		<a href="/api/admin/tokens/export" class="btn-line btn-sm">
			<Download class="h-4 w-4" />
			Export semua token
		</a>
	</div>
	{#if groups.length === 0}
		<div class="recap text-muted">Belum ada token. Buat token dulu, kelompok kelas akan muncul di sini.</div>
	{:else}
		<div class="ledger-wrap">
			<table class="ledger">
				<thead>
					<tr>
						<th scope="col">KELOMPOK</th>
						<th scope="col">TIPE</th>
						<th scope="col" class="text-right">TOTAL</th>
						<th scope="col" class="text-right">BELUM DIPAKAI</th>
						<th scope="col" class="text-right">SUDAH DIPAKAI</th>
						<th scope="col"><span class="sr-only">Aksi</span></th>
					</tr>
				</thead>
				<tbody>
					{#each pagedGroups as g (g.type + '|' + g.label)}
						<tr>
							<td class="font-extrabold">{g.type === 'teacher' ? (g.label || 'Guru') : (g.label || '(tanpa kelas)')}</td>
							<td>{g.type === 'teacher' ? 'Guru' : 'Siswa'}</td>
							<td class="text-right">{g.total}</td>
							<td class="text-right">{g.unused}</td>
							<td class="text-right">{g.used}</td>
							<td class="text-right">
								<a href={groupExportUrl(g)} class="btn-line btn-sm">
									<Download class="h-4 w-4" />
									Unduh CSV
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pager page={groupPage} totalPages={groupTotalPages} label="Paginasi kelompok token" onPage={(p) => (groupPage = p)} />
	{/if}
</section>

<span class="lbl">DAFTAR TOKEN</span>

<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }} class="recap !p-4 grid gap-3 sm:grid-cols-4 mb-4">
	<div>
		<label for="f-type" class="field-label">Tipe</label>
		<select id="f-type" bind:value={filterType} onchange={applyFilter} class="input min-h-[46px] text-sm">
			<option value="">Semua</option>
			<option value="student">Siswa</option>
			<option value="teacher">Guru</option>
		</select>
	</div>
	<div>
		<label for="f-used" class="field-label">Status</label>
		<select id="f-used" bind:value={filterUsed} onchange={applyFilter} class="input min-h-[46px] text-sm">
			<option value="">Semua</option>
			<option value="false">Belum dipakai</option>
			<option value="true">Sudah dipakai</option>
		</select>
	</div>
	<div>
		<label for="f-label" class="field-label">Kelas / kelompok</label>
		<select id="f-label" bind:value={filterLabel} onchange={applyFilter} class="input min-h-[46px] text-sm">
			<option value="">Semua kelas</option>
			{#each classGroups as g}
				{#if g.label}<option value={g.label}>{g.label}</option>{/if}
			{/each}
			{#each teacherGroups as g}
				{#if g.label}<option value={g.label}>Guru: {g.label}</option>{/if}
			{/each}
		</select>
	</div>
	<div>
		<label for="f-q" class="field-label">Cari kode atau label</label>
		<div class="flex gap-2">
			<input id="f-q" type="text" bind:value={search} placeholder="Kode atau label" class="input min-h-[46px] text-sm flex-1" />
			<button type="submit" class="btn-flag btn-sm">Cari</button>
		</div>
	</div>
</form>

<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
	<p class="text-sm text-muted" role="status">
		{#if total === 0}
			0 token
		{:else}
			Menampilkan {rangeStart} sampai {rangeEnd} dari {total} token
		{/if}
	</p>
	<div class="flex items-center gap-3">
		<label for="f-size" class="text-sm text-muted">Per halaman</label>
		<select id="f-size" bind:value={pageSize} onchange={changePageSize} class="input !w-auto min-h-[38px] text-sm">
			<option value={10}>10</option>
			<option value={25}>25</option>
			<option value={50}>50</option>
			<option value={100}>100</option>
		</select>
		<a href={exportUrl()} class="btn-line btn-sm">
			<Download class="h-4 w-4" />
			Unduh CSV (sesuai filter)
		</a>
	</div>
</div>

{#if loading}
	<p class="text-muted">Memuat token...</p>
{:else if items.length === 0}
	<div class="recap text-muted">Tidak ada token yang cocok.</div>
{:else}
	<div class="ledger-wrap">
		<table class="ledger">
			<thead>
				<tr>
					<th scope="col">KODE</th>
					<th scope="col">TIPE</th>
					<th scope="col">LABEL / KELAS</th>
					<th scope="col">STATUS</th>
					<th scope="col"><span class="sr-only">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each items as t (t.id)}
					<tr>
						<td class="font-mono font-extrabold tracking-[0.2em]">{t.code}</td>
						<td>{t.type === 'teacher' ? 'Guru' : 'Siswa'}</td>
						<td class="text-muted">{t.label ?? '-'}</td>
						<td>
							{#if t.is_used}
								<span class="text-faint font-bold text-xs tracking-widest">DIPAKAI</span>
							{:else}
								<span class="text-flag font-extrabold text-xs tracking-widest">AKTIF</span>
							{/if}
						</td>
						<td class="text-right">
							{#if !t.is_used}
								<button type="button" onclick={() => remove(t.id)} class="btn-line btn-sm !border-flag !text-flag" aria-label="Hapus token {t.code}">
									<Trash2 class="h-4 w-4" />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<nav class="flex flex-wrap items-center justify-between gap-3 mt-4" aria-label="Paginasi token">
		<button type="button" onclick={() => goToPage(page - 1)} disabled={page === 0} class="btn-line btn-sm">
			Sebelumnya
		</button>
		<div class="flex flex-wrap items-center gap-1">
			{#each pageList as p}
				{#if p === '…'}
					<span class="px-2 text-muted" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						onclick={() => goToPage(p - 1)}
						aria-current={p === page + 1 ? 'page' : undefined}
						class={p === page + 1 ? 'btn-flag btn-sm !w-auto px-3' : 'btn-line btn-sm !w-auto px-3'}
					>
						{p}
					</button>
				{/if}
			{/each}
		</div>
		<button type="button" onclick={() => goToPage(page + 1)} disabled={page >= totalPages - 1} class="btn-line btn-sm">
			Berikutnya
		</button>
	</nav>
	<p class="text-sm text-muted mt-2">Halaman {page + 1} dari {totalPages}</p>
{/if}
