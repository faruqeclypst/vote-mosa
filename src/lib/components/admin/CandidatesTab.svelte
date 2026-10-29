<script lang="ts">
	import { onMount } from 'svelte';
	import Photo from '$lib/components/Photo.svelte';
	import Pager from '$lib/components/admin/Pager.svelte';
	import { compressImage, formatBytes } from '$lib/image';
	import { ImagePlus, LoaderCircle, Pencil, Trash2, X } from '@lucide/svelte';

	interface Candidate {
		id: string;
		name: string;
		photo_url: string | null;
		photo_link: string | null;
		has_blob: boolean;
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
	let photoDataUrl = $state<string | null>(null);
	let photoInfo = $state('');
	let photoRemoved = $state(false);
	let editingPhotoSrc = $state<string | null>(null);
	let photoBusy = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const previewSrc = $derived(
		photoDataUrl ?? (photo_url.trim() !== '' ? photo_url.trim() : photoRemoved ? null : editingPhotoSrc)
	);

	let vision = $state('');
	let mission = $state('');
	let election = $state<'osis' | 'mpk'>('osis');
	let sort_order = $state(0);

	const filtered = $derived(
		electionFilter === 'all' ? items : items.filter((c) => c.election === electionFilter)
	);

	let page = $state(0);
	const PAGE_SIZE = 10;
	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const paged = $derived(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
	const rangeStart = $derived(filtered.length === 0 ? 0 : page * PAGE_SIZE + 1);
	const rangeEnd = $derived(Math.min(filtered.length, (page + 1) * PAGE_SIZE));

	$effect(() => {
		if (page > totalPages - 1) page = totalPages - 1;
	});

	function selectFilter(f: 'all' | 'osis' | 'mpk') {
		electionFilter = f;
		page = 0;
	}

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

	function resetPhoto() {
		photoDataUrl = null;
		photoInfo = '';
		photoRemoved = false;
		editingPhotoSrc = null;
		if (fileInput) fileInput.value = '';
	}

	async function onPickPhoto(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		photoBusy = true;
		formError = '';
		try {
			const out = await compressImage(file);
			photoDataUrl = out.dataUrl;
			photoRemoved = false;
			photoInfo = `Foto terkompres jadi ${formatBytes(out.bytes)}`;
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Gagal memproses foto.';
		} finally {
			photoBusy = false;
		}
	}

	function removePhoto() {
		photoDataUrl = null;
		photo_url = '';
		photoRemoved = true;
		editingPhotoSrc = null;
		photoInfo = '';
		if (fileInput) fileInput.value = '';
	}

	function resetForm() {
		editingId = null;
		name = '';
		photo_url = '';
		resetPhoto();
		vision = '';
		mission = '';
		election = electionFilter === 'mpk' ? 'mpk' : 'osis';
		sort_order = items.length;
		formError = '';
	}

	function startEdit(c: Candidate) {
		editingId = c.id;
		name = c.name;
		photo_url = c.photo_link ?? '';
		resetPhoto();
		editingPhotoSrc = c.photo_url;
		photoInfo = c.has_blob ? 'Foto tersimpan.' : '';
		vision = c.vision ?? '';
		mission = c.mission ?? '';
		election = c.election;
		sort_order = c.sort_order;
		formError = '';
		document.getElementById('candidate-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		formError = '';
		const payload: Record<string, unknown> = { name, photo_url, vision, mission, election, sort_order: Number(sort_order) || 0 };
		if (photoDataUrl) payload.photo_data = photoDataUrl;
		else if (photoRemoved) payload.photo_data = null;
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

<div class="grid gap-8 lg:grid-cols-[minmax(0,350px)_minmax(0,1fr)] items-start">
	<section id="candidate-form" aria-label={editingId ? 'Ubah kandidat' : 'Tambah kandidat'} class="recap !p-5 lg:sticky lg:top-6 scroll-mt-6">
		<h2 class="text-base font-extrabold mb-3">{editingId ? 'Ubah kandidat' : 'Tambah kandidat'}</h2>
		<form onsubmit={save} class="grid gap-3">
			<div>
				<label for="c-name" class="field-label">Nama</label>
				<input id="c-name" type="text" bind:value={name} required minlength="2" maxlength="120" class="input" />
			</div>
			<div class="flex gap-3 items-start">
				<div class="flex-1 min-w-0">
					<span class="field-label" id="c-election-label">Pemilihan</span>
					<div class="flex h-[50px] items-center gap-1 rounded-md border bg-white p-1" role="radiogroup" aria-labelledby="c-election-label">
						{#each [{ id: 'osis', label: 'OSIS' }, { id: 'mpk', label: 'MPK' }] as opt}
							<button
								type="button"
								role="radio"
								aria-checked={election === opt.id}
								onclick={() => (election = opt.id as 'osis' | 'mpk')}
								class="flex-1 h-full rounded-md text-sm font-extrabold tracking-wide transition-colors {election === opt.id ? 'bg-flag text-white' : 'text-muted hover:text-ink'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>
				<div class="shrink-0">
					<span class="field-label" id="c-photo-label">Foto</span>
					<div class="relative h-[50px] w-[50px]">
						<label
							for="c-photo-file"
							class="block h-[50px] w-[50px] rounded-md border bg-white cursor-pointer overflow-hidden"
							aria-label="Unggah foto kandidat"
							title="Unggah foto kandidat"
						>
							{#if previewSrc}
								<Photo
									src={previewSrc}
									alt=""
									name={name || '?'}
									imgClass="h-full w-full object-cover"
									fallbackClass="h-full w-full"
									initialClass="text-lg font-extrabold text-flag"
								/>
							{:else}
								<span class="flex h-full w-full items-center justify-center text-muted">
									<ImagePlus class="h-5 w-5" aria-hidden="true" />
								</span>
							{/if}
							{#if photoBusy}
								<span class="absolute inset-0 flex items-center justify-center bg-white/70">
									<LoaderCircle class="h-5 w-5 animate-spin text-flag" aria-hidden="true" />
								</span>
							{/if}
						</label>
						<input id="c-photo-file" type="file" accept="image/*" class="sr-only" bind:this={fileInput} onchange={onPickPhoto} aria-labelledby="c-photo-label" />
						{#if previewSrc && !photoBusy}
							<button
								type="button"
								onclick={removePhoto}
								class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-flag bg-paper text-flag"
								aria-label="Hapus foto kandidat"
								title="Hapus foto"
							>
								<X class="h-3 w-3" aria-hidden="true" />
							</button>
						{/if}
					</div>
					<input id="c-photo" type="hidden" bind:value={photo_url} />
				</div>
			</div>
			{#if photoInfo}
				<p class="text-xs text-muted">{photoInfo}</p>
			{/if}
			<div>
				<label for="c-vision" class="field-label">Visi</label>
				<textarea id="c-vision" bind:value={vision} rows="2" maxlength="2000" class="input min-h-[64px] py-2.5"></textarea>
			</div>
			<div>
				<label for="c-mission" class="field-label">Misi</label>
				<textarea id="c-mission" bind:value={mission} rows="3" maxlength="5000" class="input min-h-[84px] py-2.5"></textarea>
			</div>
			{#if formError}
				<p role="alert" class="alert-error">{formError}</p>
			{/if}
			<div class="flex gap-2">
				<button type="submit" disabled={saving} class="btn-flag flex-1">
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

	<section aria-label="Kandidat terdaftar" class="min-w-0">
		<span class="lbl">TERDAFTAR</span>
		<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
			<div class="flex gap-1" role="tablist" aria-label="Filter pemilihan">
				{#each [{ id: 'all', label: 'Semua' }, { id: 'osis', label: 'OSIS' }, { id: 'mpk', label: 'MPK' }] as f}
					<button
						type="button"
						role="tab"
						aria-selected={electionFilter === f.id}
						onclick={() => selectFilter(f.id as 'all' | 'osis' | 'mpk')}
						class={electionFilter === f.id ? 'tab-active' : 'tab'}
					>
						{f.label}
					</button>
				{/each}
			</div>
			{#if filtered.length > 0}
				<p class="text-sm text-muted" role="status">Menampilkan {rangeStart} sampai {rangeEnd} dari {filtered.length} kandidat</p>
			{/if}
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
							<th scope="col"><span class="sr-only">Aksi</span></th>
						</tr>
					</thead>
					<tbody>
						{#each paged as c, i (c.id)}
							<tr>
								<td class="text-muted font-bold">{page * PAGE_SIZE + i + 1}</td>
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
			<Pager {page} {totalPages} label="Paginasi kandidat" onPage={(p) => (page = Math.min(Math.max(0, p), totalPages - 1))} />
		{/if}
	</section>
</div>
