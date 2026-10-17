<script lang="ts">
	import CandidateDeck from '$lib/components/CandidateDeck.svelte';
	import type { Candidate } from '$lib/db';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Step = 'token' | 'deck' | 'confirm' | 'done';

	let step = $state<Step>('token');
	let code = $state('');
	let voterType = $state<'student' | 'teacher' | null>(null);
	let tokenError = $state('');
	let validating = $state(false);

	let selected = $state<Candidate | null>(null);
	let deckKey = $state(0);
	let submitting = $state(false);
	let submitError = $state('');

	function normalizeCode(v: string): string {
		return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
	}

	async function validateToken(e: SubmitEvent) {
		e.preventDefault();
		if (validating || code.length !== 5) return;
		validating = true;
		tokenError = '';
		try {
			const res = await fetch('/api/vote/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const body = await res.json();
			if (!res.ok) {
				tokenError = body.error ?? 'Kode token tidak valid.';
				return;
			}
			voterType = body.type;
			step = 'deck';
		} catch {
			tokenError = 'Tidak bisa terhubung ke server. Periksa koneksimu.';
		} finally {
			validating = false;
		}
	}

	function choose(c: Candidate) {
		selected = c;
		step = 'confirm';
	}

	function changeChoice() {
		selected = null;
		deckKey += 1;
		step = 'deck';
	}

	async function submitVote() {
		if (submitting || !selected) return;
		submitting = true;
		submitError = '';
		try {
			const res = await fetch('/api/vote/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, candidateId: selected.id })
			});
			const body = await res.json();
			if (!res.ok) {
				submitError = body.error ?? 'Gagal menyimpan suara.';
				submitting = false;
				return;
			}
			step = 'done';
		} catch {
			submitError = 'Tidak bisa terhubung ke server. Coba lagi.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Voting - {data.title}</title>
</svelte:head>

<div class="min-h-dvh flex flex-col">
	<header class="border-b-2 border-ink">
		<div class="mx-auto max-w-3xl px-5 py-4 flex items-baseline justify-between gap-4">
			<a href="/" class="font-display text-lg tracking-tight hover:underline">{data.school}</a>
			<p class="text-sm text-ink-soft">Kartu suara digital</p>
		</div>
	</header>

	<main class="flex-1">
		<div class="mx-auto max-w-3xl px-5 py-8 sm:py-12">
			{#if !data.votingOpen}
				<div class="max-w-xl mx-auto rounded-lg border border-line bg-paper-deep p-6">
					<h1 class="font-display text-2xl mb-2">Voting sedang ditutup</h1>
					<p class="text-ink-soft">Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.</p>
					<a href="/" class="inline-block mt-4 underline underline-offset-4">Kembali ke beranda</a>
				</div>
			{:else if step === 'token'}
				<div class="max-w-md mx-auto">
					<p class="text-sm text-ink-soft mb-2">Langkah 1 dari 3</p>
					<h1 class="font-display text-3xl tracking-tight mb-3">Masukkan kode tokenmu</h1>
					<p class="text-ink-soft mb-8">
						Kode 5 karakter yang dibagikan panitia. Token hanya bisa dipakai satu kali.
					</p>
					<form onsubmit={validateToken} class="space-y-4">
						<div>
							<label for="token" class="block font-semibold mb-2">Kode token</label>
							<input
								id="token"
								name="token"
								type="text"
								inputmode="text"
								autocomplete="off"
								autocapitalize="characters"
								spellcheck="false"
								placeholder="XXXXX"
								value={code}
								oninput={(e) => (code = normalizeCode(e.currentTarget.value))}
								class="w-full min-h-[56px] px-4 text-2xl tracking-[0.3em] text-center font-mono rounded-lg border-2 border-ink bg-white placeholder:text-ink-soft/50"
								aria-describedby={tokenError ? 'token-error' : undefined}
								aria-invalid={tokenError ? 'true' : undefined}
							/>
						</div>
						{#if tokenError}
							<p id="token-error" role="alert" class="text-brand-deep font-semibold">{tokenError}</p>
						{/if}
						<button
							type="submit"
							disabled={validating || code.length !== 5}
							class="w-full min-h-[56px] rounded-lg bg-brand text-white text-lg font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors"
						>
							{validating ? 'Memeriksa...' : 'Lanjut memilih'}
						</button>
					</form>
				</div>
			{:else if step === 'deck'}
				<div>
					<p class="text-sm text-ink-soft mb-2 text-center">Langkah 2 dari 3</p>
					<h1 class="font-display text-3xl tracking-tight mb-2 text-center">Pilih kandidatmu</h1>
					{#if voterType}
						<p class="text-sm text-ink-soft text-center mb-6">
							{voterType === 'teacher' ? 'Token guru: suaramu bernilai 2 poin.' : 'Token siswa: suaramu bernilai 1 poin.'}
						</p>
					{/if}
					{#if data.candidates.length === 0}
						<div class="max-w-xl mx-auto rounded-lg border border-line bg-paper-deep p-6 text-center">
							<p class="font-semibold mb-1">Belum ada kandidat</p>
							<p class="text-ink-soft">Panitia belum mendaftarkan kandidat. Coba lagi nanti.</p>
						</div>
					{:else}
						{#key deckKey}
							<CandidateDeck candidates={data.candidates} onSelect={choose} />
						{/key}
					{/if}
				</div>
			{:else if step === 'confirm' && selected}
				<div class="max-w-md mx-auto">
					<p class="text-sm text-ink-soft mb-2">Langkah 3 dari 3</p>
					<h1 class="font-display text-3xl tracking-tight mb-3">Konfirmasi pilihanmu</h1>
					<p class="text-ink-soft mb-6">Pastikan ini kandidat yang kamu dukung. Suara tidak bisa diubah setelah dikirim.</p>

					<article class="rounded-2xl border-2 border-ink bg-white overflow-hidden mb-6">
						{#if selected.photo_url}
							<img src={selected.photo_url} alt="Foto {selected.name}" class="w-full h-56 object-cover border-b-2 border-ink" />
						{/if}
						<div class="p-5">
							<h2 class="font-display text-2xl tracking-tight">{selected.name}</h2>
							{#if selected.vision}
								<p class="text-xs font-semibold uppercase tracking-widest text-brand mt-3 mb-1">Visi</p>
								<p>{selected.vision}</p>
							{/if}
						</div>
					</article>

					{#if submitError}
						<p role="alert" class="text-brand-deep font-semibold mb-4">{submitError}</p>
					{/if}

					<div class="flex flex-col gap-3">
						<button
							type="button"
							onclick={submitVote}
							disabled={submitting}
							class="w-full min-h-[56px] rounded-lg bg-brand text-white text-lg font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors"
						>
							{submitting ? 'Mengirim...' : 'Kirim Suara'}
						</button>
						<button
							type="button"
							onclick={changeChoice}
							disabled={submitting}
							class="w-full min-h-[56px] rounded-lg border-2 border-ink bg-white font-semibold hover:bg-paper-deep disabled:opacity-50 transition-colors"
						>
							Ubah Pilihan
						</button>
					</div>
				</div>
			{:else if step === 'done'}
				<div class="max-w-md mx-auto text-center py-10">
					<div
						class="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-brand flex items-center justify-center"
						aria-hidden="true"
					>
						<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b3261e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<h1 class="font-display text-3xl tracking-tight mb-3">Terima kasih</h1>
					<p class="text-ink-soft mb-8">Suaramu sudah tercatat. Satu token, satu suara.</p>
					<a
						href="/"
						class="inline-block min-h-[52px] px-10 py-3.5 rounded-lg bg-ink text-paper font-semibold hover:opacity-90"
					>
						Kembali ke beranda
					</a>
				</div>
			{/if}
		</div>
	</main>
</div>
