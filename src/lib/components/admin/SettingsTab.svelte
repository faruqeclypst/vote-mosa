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

<h1 class="font-display text-3xl tracking-tight mb-6">Pengaturan</h1>

{#if loading}
	<p class="text-ink-soft">Memuat pengaturan...</p>
{:else}
	<form onsubmit={save} class="max-w-xl space-y-6">
		<fieldset class="rounded-2xl border-2 border-ink bg-white p-6">
			<legend class="font-display text-xl px-2">Status voting</legend>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" bind:checked={votingOpen} class="mt-1 w-6 h-6 accent-[#b3261e]" />
				<span>
					<span class="font-semibold block">Voting dibuka</span>
					<span class="text-sm text-ink-soft">
						Jika dimatikan, pemilih melihat pesan voting ditutup dan tidak bisa mengirim suara.
					</span>
				</span>
			</label>
		</fieldset>

		<fieldset class="rounded-2xl border-2 border-ink bg-white p-6 space-y-4">
			<legend class="font-display text-xl px-2">Identitas pemilihan</legend>
			<div>
				<label for="s-title" class="block font-semibold mb-2">Judul pemilihan</label>
				<input id="s-title" type="text" bind:value={title} required minlength="2" maxlength="120" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
			</div>
			<div>
				<label for="s-school" class="block font-semibold mb-2">Nama sekolah</label>
				<input id="s-school" type="text" bind:value={school} required minlength="2" maxlength="120" class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white" />
			</div>
		</fieldset>

		{#if error}
			<p role="alert" class="text-brand-deep font-semibold">{error}</p>
		{/if}
		{#if saved}
			<p role="status" class="text-green-800 font-semibold">Pengaturan tersimpan.</p>
		{/if}
		<button type="submit" disabled={saving} class="min-h-[56px] px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors">
			{saving ? 'Menyimpan...' : 'Simpan pengaturan'}
		</button>
	</form>
{/if}
