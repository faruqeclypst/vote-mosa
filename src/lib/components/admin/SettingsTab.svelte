<script lang="ts">
	import { onMount } from 'svelte';

	let osisOpen = $state(true);
	let mpkOpen = $state(false);
	let title = $state('');
	let school = $state('');
	let error = $state('');
	let saved = $state(false);
	let loading = $state(true);
	let saving = $state(false);

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/admin/settings');
			if (!res.ok) throw new Error();
			const s = (await res.json()).settings as Record<string, string>;
			osisOpen = s.osis_open === 'true';
			mpkOpen = s.mpk_open === 'true';
			title = s.election_title ?? '';
			school = s.school_name ?? '';
		} catch {
			error = 'Gagal memuat pengaturan.';
		} finally {
			loading = false;
		}
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		error = '';
		saved = false;
		try {
			const res = await fetch('/api/admin/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					osis_open: osisOpen ? 'true' : 'false',
					mpk_open: mpkOpen ? 'true' : 'false',
					election_title: title.trim(),
					school_name: school.trim()
				})
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Gagal menyimpan.';
				saving = false;
				return;
			}
			saved = true;
		} catch {
			error = 'Tidak bisa terhubung ke server.';
		} finally {
			saving = false;
		}
	}

	onMount(load);
</script>

<div class="mb-6">
	<span class="lbl !mb-1">KETETAPAN PANITIA</span>
	<h1 class="section-head">Pengaturan</h1>
</div>

{#if loading}
	<p class="text-muted">Memuat pengaturan...</p>
{:else}
	<form onsubmit={save}>
		<div class="grid gap-6 lg:grid-cols-2 items-start mb-6">
		<fieldset class="recap !p-6">
			<legend class="text-lg font-extrabold px-1">Status pemilihan</legend>
			<div class="space-y-5">
				<div class="flex items-center justify-between gap-4">
					<span>
						<span class="font-extrabold block">Pemilihan OSIS</span>
						<span class="text-sm text-muted">
							Surat suara ketua OSIS dibuka untuk pemilih.
						</span>
					</span>
					<button
						type="button"
						role="switch"
						aria-checked={osisOpen}
						aria-label="Buka atau tutup pemilihan OSIS"
						onclick={() => (osisOpen = !osisOpen)}
						class="switch"
					>
						<span class="switch-knob" aria-hidden="true"></span>
					</button>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span>
						<span class="font-extrabold block">Pemilihan MPK</span>
						<span class="text-sm text-muted">
							Surat suara ketua MPK dibuka untuk pemilih.
						</span>
					</span>
					<button
						type="button"
						role="switch"
						aria-checked={mpkOpen}
						aria-label="Buka atau tutup pemilihan MPK"
						onclick={() => (mpkOpen = !mpkOpen)}
						class="switch"
					>
						<span class="switch-knob" aria-hidden="true"></span>
					</button>
				</div>
				<p class="text-sm text-muted !mt-4">
					Satu token berlaku untuk setiap pemilihan yang dibuka — satu suara ketua OSIS dan satu suara ketua MPK.
				</p>
			</div>
		</fieldset>

		<fieldset class="recap !p-6 space-y-4">
			<legend class="text-lg font-extrabold px-1">Identitas pemilihan</legend>
			<div>
				<label for="s-title" class="field-label">Judul pemilihan</label>
				<input id="s-title" type="text" bind:value={title} required minlength="2" maxlength="120" class="input" />
			</div>
			<div>
				<label for="s-school" class="field-label">Nama sekolah</label>
				<input id="s-school" type="text" bind:value={school} required minlength="2" maxlength="120" class="input" />
			</div>
		</fieldset>
		</div>

		{#if error}
			<p role="alert" class="alert-error">{error}</p>
		{/if}
		{#if saved}
			<p role="status" class="alert-ok">Pengaturan tersimpan.</p>
		{/if}
		<button type="submit" disabled={saving} class="btn-flag !w-auto px-8">
			{saving ? 'Menyimpan...' : 'Simpan pengaturan'}
		</button>
	</form>
{/if}
