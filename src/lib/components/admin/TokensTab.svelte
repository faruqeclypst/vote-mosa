<script lang="ts">
	import { onMount } from 'svelte';
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
	let search = $state('');
	let page = $state(0);
	const limit = 50;

	const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));

	const exportUrl = $derived(() => {
		const p = new URLSearchParams();
		if (filterType) p.set('type', filterType);
		if (filterUsed) p.set('used', filterUsed);
		return `/api/admin/tokens/export?${p.toString()}`;
	});

	async function load() {
		loading = true;
		error = '';
		try {
			const p = new URLSearchParams({
				limit: String(limit),
				offset: String(page * limit)
			});
			if (filterType) p.set('type', filterType);
			if (filterUsed) p.set('used', filterUsed);
			if (search.trim()) p.set('q', search.trim());
			const res = await fetch(`/api/admin/tokens?${p.toString()}`);
			if (!res.ok) throw new Error();
			const body = await res.json();
			items = body.items;
			total = body.total;
		} catch {
			error = 'Gagal memuat token.';
		} finally {
			loading = false;
		}
	}

	function applyFilter() {
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
			await load();
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
			await load();
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

	onMount(load);
</script>

<div class="mb-6">
	<span class="lbl !mb-1">SURAT KUASA MEMILIH</span>
	<h1 class="section-head">Token</h1>
	<p class="text-sm text-muted mt-2 max-w-xl">
		Satu token berlaku untuk setiap pemilihan yang dibuka — satu suara ketua OSIS dan satu suara ketua MPK.
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
			<label for="t-label" class="field-label">Label (mis. X-1)</label>
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
	<div class="sm:col-span-2">
		<label for="f-q" class="field-label">Cari kode atau label</label>
		<div class="flex gap-2">
			<input id="f-q" type="text" bind:value={search} placeholder="Kode atau label" class="input min-h-[46px] text-sm flex-1" />
			<button type="submit" class="btn-flag btn-sm">Cari</button>
		</div>
	</div>
</form>

<div class="flex items-center justify-between mb-4">
	<p class="text-sm text-muted">{total} token</p>
	<a href={exportUrl()} class="btn-line btn-sm">
		<Download class="h-4 w-4" />
		Unduh CSV
	</a>
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
					<th scope="col">LABEL</th>
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
	<div class="flex items-center justify-between mt-4">
		<button type="button" onclick={() => { page = Math.max(0, page - 1); load(); }} disabled={page === 0} class="btn-line btn-sm">
			Sebelumnya
		</button>
		<p class="text-sm text-muted">Halaman {page + 1} dari {totalPages}</p>
		<button type="button" onclick={() => { page = Math.min(totalPages - 1, page + 1); load(); }} disabled={page >= totalPages - 1} class="btn-line btn-sm">
			Berikutnya
		</button>
	</div>
{/if}
