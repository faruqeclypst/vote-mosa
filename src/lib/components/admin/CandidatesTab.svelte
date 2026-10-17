<script lang="ts">
	import { onMount } from 'svelte';

	interface Candidate {
		id: string;
		name: string;
		photo_url: string | null;
		vision: string | null;
		mission: string | null;
		sort_order: number;
	}

	let items = $state<Candidate[]>([]);
	let error = $state('');
	let loading = $state(true);
	let formError = $state('');
	let saving = $state(false);
	let editingId = $state<string | null>(null);
	let confirmDelete = $state<string | null>(null);

	let name = $state('');
	let photo_url = $state('');
	let vision = $state('');
	let mission = $state('');
	let sort_order = $state(0);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/admin/candidates');
			if (!res.ok) throw new Error();
			items = (await res.json()).items;
		} catch {
			error = 'Gagal memuat kandidat.';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		editingId = null;
		name = '';
		photo_url = '';
		vision = '';
		mission = '';
		sort_order = items.length;
		formError = '';
	}

	function startEdit(c: Candidate) {
		editingId = c.id;
		name = c.name;
		photo_url = c.photo_url ?? '';
		vision = c.vision ?? '';
		mission = c.mission ?? '';
		sort_order = c.sort_order;
		formError = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		formError = '';
		const payload = { name, photo_url, vision, mission, sort_order: Number(sort_order) || 0 };
		try {
			const res = await fetch(
				editingId ? `/api/admin/candidates/${editingId}` : '/api/admin/candidates',
				{
					method: editingId ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			const body = await res.json();
			if (!res.ok) {
				formError = body.error ?? 'Gagal menyimpan.';
				saving = false;
				return;
			}
			resetForm();
			await load();
		} catch {
			formError = 'Tidak bisa terhubung ke server.';
		} finally {
			saving = false;
		}
	}

	async function remove(id: string) {
		try {
			const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Gagal menghapus.';
				return;
			}
			confirmDelete = null;
			await load();
		} catch {
			error = 'Tidak bisa terhubung ke server.';
		}
	}

	onMount(() => {
		load().then(() => {
			sort_order = items.length;
		});
	});
</script>

<h1 class="font-display text-3xl tracking-tight mb-6">Kandidat</h1>

{#if error}
	<p role="alert" class="text-brand-deep font-semibold mb-4">{error}</p>
{/if}

<section aria-label={editingId ? 'Ubah kandidat' : 'Tambah kandidat'} class="rounded-2xl border-2 border-ink bg-white p-6 mb-10">
	<h2 class="font-display text-xl mb-4">{editingId ? 'Ubah kandidat' : 'Tambah kandidat'}</h2>
	<form onsubmit={save} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="c-name" class="block font-semibold mb-2">Nama</label>
			<input id="c-name" type="text" bind:value={name} required minlength="2" maxlength="120" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div>
			<label for="c-order" class="block font-semibold mb-2">Urutan tampil</label>
			<input id="c-order" type="number" bind:value={sort_order} min="0" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
		</div>
		<div class="sm:col-span-2">
			<label for="c-photo" class="block font-semibold mb-2">URL foto</label>
			<input id="c-photo" type="url" bind:value={photo_url} placeholder="https://..." class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
			{#if photo_url.trim()}
				<img src={photo_url.trim()} alt="Pratinjau foto kandidat" class="mt-3 w-32 h-32 object-cover rounded-lg border-2 border-ink" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} onload={(e) => ((e.currentTarget as HTMLImageElement).style.display = '')} />
			{/if}
		</div>
		<div class="sm:col-span-2">
			<label for="c-vision" class="block font-semibold mb-2">Visi</label>
			<textarea id="c-vision" bind:value={vision} rows="2" maxlength="2000" class="w-full px-4 py-3 rounded-lg border-2 border-ink bg-white"></textarea>
		</div>
		<div class="sm:col-span-2">
			<label for="c-mission" class="block font-semibold mb-2">Misi</label>
			<textarea id="c-mission" bind:value={mission} rows="4" maxlength="5000" class="w-full px-4 py-3 rounded-lg border-2 border-ink bg-white"></textarea>
		</div>
		{#if formError}
			<p role="alert" class="text-brand-deep font-semibold sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2 flex flex-wrap gap-3">
			<button type="submit" disabled={saving} class="min-h-[52px] px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors">
				{saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah kandidat'}
			</button>
			{#if editingId}
				<button type="button" onclick={resetForm} class="min-h-[52px] px-6 rounded-lg border-2 border-ink bg-white font-semibold hover:bg-paper-deep">
					Batal
				</button>
			{/if}
		</div>
	</form>
</section>

<h2 class="font-display text-2xl tracking-tight mb-4">Daftar kandidat</h2>
{#if loading}
	<p class="text-ink-soft">Memuat kandidat...</p>
{:else if items.length === 0}
	<div class="rounded-xl border border-line bg-paper-deep p-6 text-ink-soft">Belum ada kandidat.</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each items as c (c.id)}
			<article class="rounded-xl border border-line bg-white p-5 flex gap-4">
				{#if c.photo_url}
					<img src={c.photo_url} alt="Foto {c.name}" class="w-20 h-20 rounded-lg object-cover border border-line shrink-0" />
				{:else}
					<div class="w-20 h-20 rounded-lg bg-paper-deep border border-line flex items-center justify-center shrink-0" aria-hidden="true">
						<span class="font-display text-3xl text-brand">{c.name.charAt(0)}</span>
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<p class="font-semibold truncate">{c.name}</p>
					<p class="text-sm text-ink-soft">Urutan {c.sort_order}</p>
					<div class="flex gap-2 mt-3">
						<button type="button" onclick={() => startEdit(c)} class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-paper-deep">
							Ubah
						</button>
						{#if confirmDelete === c.id}
							<button type="button" onclick={() => remove(c.id)} class="min-h-[44px] px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-deep">
								Yakin, hapus
							</button>
							<button type="button" onclick={() => (confirmDelete = null)} class="min-h-[44px] px-4 rounded-lg border border-line bg-white text-sm hover:bg-paper-deep">
								Batal
							</button>
						{:else}
							<button type="button" onclick={() => (confirmDelete = c.id)} class="min-h-[44px] px-4 rounded-lg border border-line bg-white text-sm text-brand-deep hover:bg-paper-deep">
								Hapus
							</button>
						{/if}
					</div>
				</div>
			</article>
		{/each}
	</div>
{/if}
