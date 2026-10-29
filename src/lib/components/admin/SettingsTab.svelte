<script lang="ts">
	import { onMount } from 'svelte';
	import { TriangleAlert, X } from '@lucide/svelte';

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

	let resetScope = $state<'votes_tokens' | 'all' | null>(null);
	let resetText = $state('');
	let resetting = $state(false);
	let resetError = $state('');
	let resetDone = $state('');

	function openReset(scope: 'votes_tokens' | 'all') {
		resetScope = scope;
		resetText = '';
		resetError = '';
		resetDone = '';
	}

	function closeReset() {
		if (!resetting) resetScope = null;
	}

	async function doReset() {
		if (!resetScope || resetText !== 'RESET' || resetting) return;
		const scope = resetScope;
		resetting = true;
		resetError = '';
		try {
			const res = await fetch('/api/admin/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scope, confirm: resetText })
			});
			const body = await res.json();
			if (!res.ok) {
				resetError = body.error ?? 'Reset gagal.';
				return;
			}
			resetDone =
				`Reset selesai: ${body.deleted.votes} suara dan ${body.deleted.tokens} token dihapus` +
				(scope === 'all' ? `, plus ${body.deleted.candidates} kandidat.` : '.');
			resetScope = null;
		} catch {
			resetError = 'Tidak bisa terhubung ke server.';
		} finally {
			resetting = false;
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

	<section class="recap !p-6 mt-8" aria-label="Reset data">
		<h2 class="text-lg font-extrabold text-flag mb-1">Reset data</h2>
		<p class="text-sm text-muted mb-4">
			Mulai pemilihan dari nol. Reset tidak bisa dibatalkan dan hanya bisa dilakukan super admin.
		</p>
		{#if resetDone}
			<p role="status" class="alert-ok mb-4">{resetDone}</p>
		{/if}
		<div class="flex flex-wrap gap-3">
			<div>
				<button type="button" onclick={() => openReset('votes_tokens')} class="btn-danger btn-sm">
					Reset suara &amp; token
				</button>
				<p class="text-xs text-faint mt-1.5">Kandidat dan pengaturan tetap.</p>
			</div>
			<div>
				<button type="button" onclick={() => openReset('all')} class="btn-flag btn-sm">
					Reset total
				</button>
				<p class="text-xs text-faint mt-1.5">Kandidat ikut dihapus.</p>
			</div>
		</div>
	</section>
{/if}

{#if resetScope}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
		<button type="button" class="absolute inset-0 bg-ink/50" onclick={closeReset} aria-label="Tutup konfirmasi reset"></button>
		<div role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-desc" class="relative recap w-full max-w-sm !p-6">
			<div class="flex items-start justify-between gap-3 mb-2">
				<h2 id="reset-title" class="text-lg font-extrabold text-flag flex items-center gap-2">
					<TriangleAlert class="h-5 w-5" aria-hidden="true" />
					{resetScope === 'all' ? 'Reset total?' : 'Reset suara & token?'}
				</h2>
				<button type="button" class="btn-line btn-sm !px-2" onclick={closeReset} aria-label="Tutup">
					<X class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
			<div id="reset-desc" class="text-sm text-muted">
				<p class="mb-1">Yang terhapus permanen:</p>
				<ul class="list-disc pl-5 mb-3">
					<li>Semua suara yang sudah masuk</li>
					<li>Semua token, termasuk yang belum terpakai</li>
					{#if resetScope === 'all'}
						<li>Semua kandidat beserta fotonya</li>
					{/if}
				</ul>
				<p class="mb-4">
					{#if resetScope === 'all'}
						Pengaturan dan akun admin tidak ikut terhapus.
					{:else}
						Kandidat, pengaturan, dan akun admin tidak ikut terhapus.
					{/if}
				</p>
			</div>
			<label for="reset-confirm" class="field-label">Ketik RESET untuk melanjutkan</label>
			<input
				id="reset-confirm"
				type="text"
				bind:value={resetText}
				class="input mb-4"
				autocomplete="off"
				autocapitalize="characters"
				placeholder="RESET"
			/>
			{#if resetError}
				<p role="alert" class="alert-error mb-4">{resetError}</p>
			{/if}
			<div class="flex gap-3">
				<button type="button" class="btn-line btn-sm flex-1 whitespace-nowrap" onclick={closeReset}>Batal</button>
				<button
					type="button"
					class="btn-flag btn-sm flex-1 whitespace-nowrap"
					disabled={resetText !== 'RESET' || resetting}
					onclick={doReset}
				>
					{resetting ? 'Mereset...' : 'Reset sekarang'}
				</button>
			</div>
		</div>
	</div>
{/if}
