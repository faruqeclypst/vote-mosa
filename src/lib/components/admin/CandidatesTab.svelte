<script lang="ts">
	import { onMount } from 'svelte';
	import Photo from '$lib/components/Photo.svelte';
	import { Pencil, Trash2 } from '@lucide/svelte';

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

<h1 class="page-title mb-6">Kandidat</h1>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label={editingId ? 'Ubah kandidat' : 'Tambah kandidat'} class="card-pad mb-10">
	<h2 class="text-xl font-bold text-slate-900 mb-4">{editingId ? 'Ubah kandidat' : 'Tambah kandidat'}</h2>
	<form onsubmit={save} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="c-name" class="field-label">Nama</label>
			<input id="c-name" type="text" bind:value={name} required minlength="2" maxlength="120" class="input-field" />
		</div>
		<div>
			<label for="c-order" class="field-label">Urutan tampil</label>
			<input id="c-order" type="number" bind:value={sort_order} min="0" class="input-field" />
		</div>
		<div class="sm:col-span-2">
			<label for="c-photo" class="field-label">URL foto</label>
			<input id="c-photo" type="url" bind:value={photo_url} placeholder="https://..." class="input-field" />
			{#if photo_url.trim()}
				<div class="mt-3">
					<Photo
						src={photo_url.trim()}
						alt="Pratinjau foto kandidat"
						name={name || '?'}
						imgClass="w-32 h-32 object-cover rounded-xl border border-slate-200"
						fallbackClass="w-32 h-32 rounded-xl border border-slate-200"
						initialClass="text-4xl font-bold text-blue-700"
					/>
				</div>
			{/if}
		</div>
		<div class="sm:col-span-2">
			<label for="c-vision" class="field-label">Visi</label>
			<textarea id="c-vision" bind:value={vision} rows="2" maxlength="2000" class="input-field min-h-[80px] py-3"></textarea>
		</div>
		<div class="sm:col-span-2">
			<label for="c-mission" class="field-label">Misi</label>
			<textarea id="c-mission" bind:value={mission} rows="4" maxlength="5000" class="input-field min-h-[120px] py-3"></textarea>
		</div>
		{#if formError}
			<p role="alert" class="alert-error sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2 flex flex-wrap gap-3">
			<button type="submit" disabled={saving} class="btn-primary">
				{saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah kandidat'}
			</button>
			{#if editingId}
				<button type="button" onclick={resetForm} class="btn-secondary">
					Batal
				</button>
			{/if}
		</div>
	</form>
</section>

<h2 class="section-title mb-4">Daftar kandidat</h2>
{#if loading}
	<p class="text-slate-500">Memuat kandidat...</p>
{:else if items.length === 0}
	<div class="card-pad text-slate-500">Belum ada kandidat.</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each items as c (c.id)}
			<article class="card-pad p-5 flex gap-4">
				<Photo
					src={c.photo_url}
					alt="Foto {c.name}"
					name={c.name}
					imgClass="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
					fallbackClass="w-20 h-20 rounded-xl border border-slate-200 shrink-0"
					initialClass="text-3xl font-bold text-blue-700"
				/>
				<div class="flex-1 min-w-0">
					<p class="font-semibold text-slate-900 truncate">{c.name}</p>
					<p class="text-sm text-slate-500">Urutan {c.sort_order}</p>
					<div class="flex flex-wrap gap-2 mt-3">
						<button type="button" onclick={() => startEdit(c)} class="btn-secondary btn-sm">
							<Pencil class="h-4 w-4" />
							Ubah
						</button>
						{#if confirmDelete === c.id}
							<button type="button" onclick={() => remove(c.id)} class="btn-danger btn-sm">
								Yakin, hapus
							</button>
							<button type="button" onclick={() => (confirmDelete = null)} class="btn-secondary btn-sm">
								Batal
							</button>
						{:else}
							<button type="button" onclick={() => (confirmDelete = c.id)} class="btn-danger-outline">
								<Trash2 class="h-4 w-4" />
								Hapus
							</button>
						{/if}
					</div>
				</div>
			</article>
		{/each}
	</div>
{/if}
