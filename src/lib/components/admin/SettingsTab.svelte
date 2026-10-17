<script lang="ts">
	import { onMount } from 'svelte';

	let votingOpen = $state(true);
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
			votingOpen = s.voting_open === 'true';
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
					voting_open: votingOpen ? 'true' : 'false',
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

<h1 class="page-title mb-6">Pengaturan</h1>

{#if loading}
	<p class="text-slate-500">Memuat pengaturan...</p>
{:else}
	<form onsubmit={save} class="max-w-xl space-y-6">
		<fieldset class="card-pad">
			<legend class="text-lg font-bold text-slate-900 px-1">Status voting</legend>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" bind:checked={votingOpen} class="mt-1 w-6 h-6 accent-blue-600" />
				<span>
					<span class="font-semibold text-slate-900 block">Voting dibuka</span>
					<span class="text-sm text-slate-500">
						Jika dimatikan, pemilih melihat pesan voting ditutup dan tidak bisa mengirim suara.
					</span>
				</span>
			</label>
		</fieldset>

		<fieldset class="card-pad space-y-4">
			<legend class="text-lg font-bold text-slate-900 px-1">Identitas pemilihan</legend>
			<div>
				<label for="s-title" class="field-label">Judul pemilihan</label>
				<input id="s-title" type="text" bind:value={title} required minlength="2" maxlength="120" class="input-field" />
			</div>
			<div>
				<label for="s-school" class="field-label">Nama sekolah</label>
				<input id="s-school" type="text" bind:value={school} required minlength="2" maxlength="120" class="input-field" />
			</div>
		</fieldset>

		{#if error}
			<p role="alert" class="alert-error">{error}</p>
		{/if}
		{#if saved}
			<p role="status" class="alert-success">Pengaturan tersimpan.</p>
		{/if}
		<button type="submit" disabled={saving} class="btn-primary">
			{saving ? 'Menyimpan...' : 'Simpan pengaturan'}
		</button>
	</form>
{/if}
