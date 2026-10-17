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

<h1 class="page-title mb-6">Token</h1>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label="Buat token baru" class="card-pad mb-10">
	<h2 class="text-xl font-bold text-slate-900 mb-4">Buat token baru</h2>
	<form onsubmit={generate} class="grid gap-4 sm:grid-cols-4 items-end">
		<div>
			<label for="t-count" class="field-label">Jumlah</label>
			<input id="t-count" type="number" bind:value={genCount} min="1" max="1000" required class="input-field" />
		</div>
		<div>
			<label for="t-type" class="field-label">Tipe</label>
			<select id="t-type" bind:value={genType} class="input-field">
				<option value="student">Siswa (1 poin)</option>
				<option value="teacher">Guru (2 poin)</option>
			</select>
		</div>
		<div class="sm:col-span-2">
			<label for="t-label" class="field-label">Label (mis. X-1)</label>
			<input id="t-label" type="text" bind:value={genLabel} maxlength="80" placeholder="Opsional" class="input-field" />
		</div>
		<div class="sm:col-span-4">
			<button type="submit" disabled={generating} class="btn-primary">
				{generating ? 'Membuat...' : 'Buat token'}
			</button>
		</div>
	</form>
	{#if genError}
		<p role="alert" class="alert-error mt-4">{genError}</p>
	{/if}
	{#if newCodes.length > 0}
		<div class="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
			<div class="flex items-center justify-between mb-3">
				<p class="font-semibold text-slate-900">{newCodes.length} token baru dibuat</p>
				<button type="button" onclick={copyCodes} class="btn-secondary btn-sm">
					<Copy class="h-4 w-4" />
					Salin semua
				</button>
			</div>
			<p class="font-mono text-sm leading-relaxed break-words text-slate-800">{newCodes.join('  ')}</p>
			<p class="text-sm text-slate-500 mt-3">Simpan daftar ini, kode tidak ditampilkan lagi setelah halaman dimuat ulang.</p>
		</div>
	{/if}
</section>

<h2 class="section-title mb-4">Daftar token</h2>

<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }} class="card-pad p-4 grid gap-3 sm:grid-cols-4 mb-4">
	<div>
		<label for="f-type" class="field-label">Tipe</label>
		<select id="f-type" bind:value={filterType} onchange={applyFilter} class="input-field min-h-[48px] text-sm">
			<option value="">Semua</option>
			<option value="student">Siswa</option>
			<option value="teacher">Guru</option>
		</select>
	</div>
	<div>
		<label for="f-used" class="field-label">Status</label>
		<select id="f-used" bind:value={filterUsed} onchange={applyFilter} class="input-field min-h-[48px] text-sm">
			<option value="">Semua</option>
			<option value="false">Belum dipakai</option>
			<option value="true">Sudah dipakai</option>
		</select>
	</div>
	<div class="sm:col-span-2">
		<label for="f-q" class="field-label">Cari kode atau label</label>
		<div class="flex gap-2">
			<input id="f-q" type="text" bind:value={search} placeholder="Kode atau label" class="input-field min-h-[48px] text-sm flex-1" />
			<button type="submit" class="btn-primary btn-sm">Cari</button>
		</div>
	</div>
</form>

<div class="flex items-center justify-between mb-4">
	<p class="text-sm text-slate-500">{total} token</p>
	<a href={exportUrl()} class="btn-secondary btn-sm">
		<Download class="h-4 w-4" />
		Unduh CSV
	</a>
</div>

{#if loading}
	<p class="text-slate-500">Memuat token...</p>
{:else if items.length === 0}
	<div class="card-pad text-slate-500">Tidak ada token yang cocok.</div>
{:else}
	<div class="table-wrap">
		<table class="table">
			<thead>
				<tr>
					<th scope="col">Kode</th>
					<th scope="col">Tipe</th>
					<th scope="col">Label</th>
					<th scope="col">Status</th>
					<th scope="col"><span class="sr-only">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each items as t (t.id)}
					<tr>
						<td class="font-mono font-bold tracking-widest text-slate-900">{t.code}</td>
						<td>{t.type === 'teacher' ? 'Guru' : 'Siswa'}</td>
						<td class="text-slate-500">{t.label ?? '-'}</td>
						<td>
							{#if t.is_used}
								<span class="badge-slate">Dipakai</span>
							{:else}
								<span class="badge-emerald">Aktif</span>
							{/if}
						</td>
						<td class="text-right">
							{#if !t.is_used}
								<button type="button" onclick={() => remove(t.id)} class="btn-danger-outline" aria-label="Hapus token {t.code}">
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
		<button type="button" onclick={() => { page = Math.max(0, page - 1); load(); }} disabled={page === 0} class="btn-secondary btn-sm">
			Sebelumnya
		</button>
		<p class="text-sm text-slate-500">Halaman {page + 1} dari {totalPages}</p>
		<button type="button" onclick={() => { page = Math.min(totalPages - 1, page + 1); load(); }} disabled={page >= totalPages - 1} class="btn-secondary btn-sm">
			Berikutnya
		</button>
	</div>
{/if}
