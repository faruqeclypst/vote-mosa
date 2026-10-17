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
		election: 'osis' | 'mpk';
		sort_order: number;
	}

	let items = $state<Candidate[]>([]);
	let error = $state('');
	let loading = $state(true);
	let formError = $state('');
	let saving = $state(false);
	let editingId = $state<string | null>(null);
	let confirmDelete = $state<string | null>(null);
	let electionFilter = $state<'all' | 'osis' | 'mpk'>('all');

	let name = $state('');
	let photo_url = $state('');
	let vision = $state('');
	let mission = $state('');
	let election = $state<'osis' | 'mpk'>('osis');
	let sort_order = $state(0);

	const filtered = $derived(
		electionFilter === 'all' ? items : items.filter((c) => c.election === electionFilter)
	);

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
		election = electionFilter === 'mpk' ? 'mpk' : 'osis';
		sort_order = items.length;
		formError = '';
	}

	function startEdit(c: Candidate) {
		editingId = c.id;
		name = c.name;
		photo_url = c.photo_url ?? '';
		vision = c.vision ?? '';
		mission = c.mission ?? '';
		election = c.election;
		sort_order = c.sort_order;
		formError = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		formError = '';
		const payload = { name, photo_url, vision, mission, election, sort_order: Number(sort_order) || 0 };
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

<div class="mb-6">
	<span class="lbl !mb-1">DAFTAR CALON</span>
	<h1 class="section-head">Kandidat</h1>
</div>

{#if error}
	<p role="alert" class="alert-error mb-4">{error}</p>
{/if}

<section aria-label={editingId ? 'Ubah kandidat' : 'Tambah kandidat'} class="recap !p-6 mb-10">
	<h2 class="text-lg font-extrabold mb-4">{editingId ? 'Ubah kandidat' : 'Tambah kandidat'}</h2>
	<form onsubmit={save} class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="c-name" class="field-label">Nama</label>
			<input id="c-name" type="text" bind:value={name} required minlength="2" maxlength="120" class="input" />
		</div>
		<div>
			<label for="c-order" class="field-label">Urutan tampil</label>
			<input id="c-order" type="number" bind:value={sort_order} min="0" class="input" />
		</div>
		<div>
			<label for="c-election" class="field-label">Pemilihan</label>
			<select id="c-election" bind:value={election} class="input">
				<option value="osis">OSIS — Ketua OSIS</option>
				<option value="mpk">MPK — Ketua MPK</option>
			</select>
		</div>
		<div class="sm:col-span-2">
			<label for="c-photo" class="field-label">URL foto</label>
			<input id="c-photo" type="url" bind:value={photo_url} placeholder="https://..." class="input" />
			{#if photo_url.trim()}
				<div class="mt-3">
					<Photo
						src={photo_url.trim()}
						alt="Pratinjau foto kandidat"
						name={name || '?'}
						imgClass="w-24 h-24 object-cover rounded-md border border-line"
						fallbackClass="w-24 h-24 rounded-md"
						initialClass="text-3xl font-extrabold text-flag"
					/>
				</div>
			{/if}
		</div>
		<div class="sm:col-span-2">
			<label for="c-vision" class="field-label">Visi</label>
			<textarea id="c-vision" bind:value={vision} rows="2" maxlength="2000" class="input min-h-[76px] py-3"></textarea>
		</div>
		<div class="sm:col-span-2">
			<label for="c-mission" class="field-label">Misi</label>
			<textarea id="c-mission" bind:value={mission} rows="4" maxlength="5000" class="input min-h-[110px] py-3"></textarea>
		</div>
		{#if formError}
			<p role="alert" class="alert-error sm:col-span-2">{formError}</p>
		{/if}
		<div class="sm:col-span-2 flex flex-wrap gap-3">
			<button type="submit" disabled={saving} class="btn-flag !w-auto px-8">
				{saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah kandidat'}
			</button>
			{#if editingId}
				<button type="button" onclick={resetForm} class="btn-line">
					Batal
				</button>
			{/if}
		</div>
	</form>
</section>

<span class="lbl">TERDAFTAR</span>
<div class="flex gap-1 mb-4" role="tablist" aria-label="Filter pemilihan">
	{#each [{ id: 'all', label: 'Semua' }, { id: 'osis', label: 'OSIS' }, { id: 'mpk', label: 'MPK' }] as f}
		<button
			type="button"
			role="tab"
			aria-selected={electionFilter === f.id}
			onclick={() => (electionFilter = f.id as 'all' | 'osis' | 'mpk')}
			class={electionFilter === f.id ? 'tab-active' : 'tab'}
		>
			{f.label}
		</button>
	{/each}
</div>
{#if loading}
	<p class="text-muted">Memuat kandidat...</p>
{:else if filtered.length === 0}
	<div class="recap text-muted">Belum ada kandidat.</div>
{:else}
	<div class="ledger-wrap">
		<table class="ledger">
			<thead>
				<tr>
					<th scope="col">NO</th>
					<th scope="col">KANDIDAT</th>
					<th scope="col">PEMILIHAN</th>
					<th scope="col">URUTAN</th>
					<th scope="col"><span class="sr-only">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as c, i (c.id)}
					<tr>
						<td class="text-muted font-bold">{i + 1}</td>
						<td>
							<div class="flex items-center gap-3">
								<Photo
									src={c.photo_url}
									alt="Foto {c.name}"
									name={c.name}
									imgClass="w-11 h-11 rounded-md object-cover border border-line shrink-0"
									fallbackClass="w-11 h-11 rounded-md shrink-0"
									initialClass="text-lg font-extrabold text-flag"
								/>
								<span class="font-extrabold">{c.name}</span>
							</div>
						</td>
						<td>
							<span class="text-xs font-extrabold tracking-widest {c.election === 'mpk' ? 'text-flag' : 'text-muted'}">
								{c.election === 'mpk' ? 'MPK' : 'OSIS'}
							</span>
						</td>
						<td class="text-muted">{c.sort_order}</td>
						<td class="text-right whitespace-nowrap">
							<button type="button" onclick={() => startEdit(c)} class="btn-line btn-sm mr-2" aria-label="Ubah {c.name}">
								<Pencil class="h-4 w-4" />
								Ubah
							</button>
							{#if confirmDelete === c.id}
								<button type="button" onclick={() => remove(c.id)} class="btn-flag btn-sm mr-2">
									Yakin, hapus
								</button>
								<button type="button" onclick={() => (confirmDelete = null)} class="btn-line btn-sm">
									Batal
								</button>
							{:else}
								<button type="button" onclick={() => (confirmDelete = c.id)} class="btn-line btn-sm !border-flag !text-flag" aria-label="Hapus {c.name}">
									<Trash2 class="h-4 w-4" />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
