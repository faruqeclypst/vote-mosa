<script lang="ts">
	import { onMount } from 'svelte';

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

<h1 class="font-display text-3xl tracking-tight mb-6">Token</h1>

{#if error}
	<p role="alert" class="text-brand-deep font-semibold mb-4">{error}</p>
{/if}

<section aria-label="Buat token baru" class="rounded-2xl border-2 border-ink bg-white p-6 mb-10">
	<h2 class="font-display text-xl mb-4">Buat token baru</h2>
	<form onsubmit={generate} class="grid gap-4 sm:grid-cols-4 items-end">
		<div>
			<label for="t-count" class="block font-semibold mb-2">Jumlah</label>
			<input id="t-count" type="number" bind:value={genCount} min="1" max="1000" required class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div>
			<label for="t-type" class="block font-semibold mb-2">Tipe</label>
			<select id="t-type" bind:value={genType} class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white">
				<option value="student">Siswa (1 poin)</option>
				<option value="teacher">Guru (2 poin)</option>
			</select>
		</div>
		<div class="sm:col-span-2">
			<label for="t-label" class="block font-semibold mb-2">Label (mis. X-1)</label>
			<input id="t-label" type="text" bind:value={genLabel} maxlength="80" placeholder="Opsional" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div class="sm:col-span-4">
			<button type="submit" disabled={generating} class="min-h-[52px] px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors">
				{generating ? 'Membuat...' : 'Buat token'}
			</button>
		</div>
	</form>
	{#if genError}
		<p role="alert" class="text-brand-deep font-semibold mt-4">{genError}</p>
	{/if}
	{#if newCodes.length > 0}
		<div class="mt-6 rounded-xl border border-line bg-paper-deep p-5">
			<div class="flex items-center justify-between mb-3">
				<p class="font-semibold">{newCodes.length} token baru dibuat</p>
				<button type="button" onclick={copyCodes} class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-white">
					Salin semua
				</button>
			</div>
			<p class="font-mono text-sm leading-relaxed break-words">{newCodes.join('  ')}</p>
			<p class="text-sm text-ink-soft mt-3">Simpan daftar ini, kode tidak ditampilkan lagi setelah halaman dimuat ulang.</p>
		</div>
	{/if}
</section>

<h2 class="font-display text-2xl tracking-tight mb-4">Daftar token</h2>

<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }} class="grid gap-3 sm:grid-cols-4 mb-4">
	<div>
		<label for="f-type" class="block text-sm font-semibold mb-1">Tipe</label>
		<select id="f-type" bind:value={filterType} onchange={applyFilter} class="w-full min-h-[48px] px-3 rounded-lg border-2 border-ink bg-white text-sm">
			<option value="">Semua</option>
			<option value="student">Siswa</option>
			<option value="teacher">Guru</option>
		</select>
	</div>
	<div>
		<label for="f-used" class="block text-sm font-semibold mb-1">Status</label>
		<select id="f-used" bind:value={filterUsed} onchange={applyFilter} class="w-full min-h-[48px] px-3 rounded-lg border-2 border-ink bg-white text-sm">
			<option value="">Semua</option>
			<option value="false">Belum dipakai</option>
			<option value="true">Sudah dipakai</option>
		</select>
	</div>
	<div class="sm:col-span-2">
		<label for="f-q" class="block text-sm font-semibold mb-1">Cari kode atau label</label>
		<div class="flex gap-2">
			<input id="f-q" type="text" bind:value={search} placeholder="Kode atau label" class="flex-1 min-h-[48px] px-3 rounded-lg border-2 border-ink bg-white text-sm" />
			<button type="submit" class="min-h-[48px] px-5 rounded-lg bg-ink text-paper text-sm font-semibold">Cari</button>
		</div>
	</div>
</form>

<div class="flex items-center justify-between mb-4">
	<p class="text-sm text-ink-soft">{total} token</p>
	<a href={exportUrl()} class="min-h-[44px] inline-flex items-center px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-paper-deep">
		Unduh CSV
	</a>
</div>

{#if loading}
	<p class="text-ink-soft">Memuat token...</p>
{:else if items.length === 0}
	<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">Tidak ada token yang cocok.</div>
{:else}
	<div class="overflow-x-auto rounded-xl border border-line">
		<table class="w-full text-sm bg-white">
			<thead>
				<tr class="border-b border-line text-left">
					<th scope="col" class="px-4 py-3 font-semibold">Kode</th>
					<th scope="col" class="px-4 py-3 font-semibold">Tipe</th>
					<th scope="col" class="px-4 py-3 font-semibold">Label</th>
					<th scope="col" class="px-4 py-3 font-semibold">Status</th>
					<th scope="col" class="px-4 py-3 font-semibold"><span class="sr-only">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each items as t (t.id)}
					<tr class="border-b border-line last:border-0">
						<td class="px-4 py-3 font-mono font-semibold tracking-widest">{t.code}</td>
						<td class="px-4 py-3">{t.type === 'teacher' ? 'Guru' : 'Siswa'}</td>
						<td class="px-4 py-3 text-ink-soft">{t.label ?? '-'}</td>
						<td class="px-4 py-3">
							{#if t.is_used}
								<span class="text-ink-soft">Dipakai</span>
							{:else}
								<span class="text-brand font-semibold">Aktif</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-right">
							{#if !t.is_used}
								<button type="button" onclick={() => remove(t.id)} class="min-h-[40px] px-3 rounded-lg border border-line text-sm text-brand-deep hover:bg-paper-deep">
									Hapus
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="flex items-center justify-between mt-4">
		<button type="button" onclick={() => { page = Math.max(0, page - 1); load(); }} disabled={page === 0} class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold disabled:opacity-40">
			Sebelumnya
		</button>
		<p class="text-sm text-ink-soft">Halaman {page + 1} dari {totalPages}</p>
		<button type="button" onclick={() => { page = Math.min(totalPages - 1, page + 1); load(); }} disabled={page >= totalPages - 1} class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold disabled:opacity-40">
			Berikutnya
		</button>
	</div>
{/if}
