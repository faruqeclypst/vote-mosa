<script lang="ts">
	import { Vote, CheckCircle2 } from '@lucide/svelte';
	import CandidateDeck from '$lib/components/CandidateDeck.svelte';
	import Photo from '$lib/components/Photo.svelte';
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

	const stepIndex = $derived(step === 'token' ? 0 : step === 'deck' ? 1 : 2);
	const stepLabels = ['Token', 'Pilih kandidat', 'Konfirmasi'];

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

<div class="min-h-dvh flex flex-col bg-slate-50">
	<header class="bg-white border-b border-slate-200 sticky top-0 z-50">
		<div class="mx-auto max-w-3xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
			<a href="/" class="flex items-center gap-2.5">
				<span class="bg-blue-600 rounded-xl p-2" aria-hidden="true">
					<Vote class="h-5 w-5 text-white" />
				</span>
				<span class="text-xl font-extrabold tracking-tight text-slate-900">PEMOS</span>
			</a>
			<p class="text-sm text-slate-500">{data.school}</p>
		</div>
	</header>

	<main class="flex-1">
		<div class="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
			{#if !data.votingOpen}
				<div class="card-pad max-w-xl mx-auto">
					<h1 class="text-2xl font-bold text-slate-900 mb-2">Voting sedang ditutup</h1>
					<p class="text-slate-600 mb-5">Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.</p>
					<a href="/" class="btn-secondary btn-sm">Kembali ke beranda</a>
				</div>
			{:else if step === 'done'}
				<div class="max-w-md mx-auto text-center py-10">
					<div class="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center" aria-hidden="true">
						<CheckCircle2 class="h-10 w-10 text-emerald-600" />
					</div>
					<h1 class="text-3xl font-bold tracking-tight text-slate-900 mb-3">Suara tercatat</h1>
					<p class="text-slate-600 mb-8">Terima kasih sudah berpartisipasi. Satu token, satu suara.</p>
					<a href="/" class="btn-secondary">Kembali ke beranda</a>
				</div>
			{:else}
				<!-- Indikator langkah -->
				<ol class="flex items-center justify-center gap-2 sm:gap-3 mb-8" aria-label="Langkah voting">
					{#each stepLabels as label, i}
						<li class="flex items-center gap-2 sm:gap-3">
							{#if i > 0}
								<span class="w-6 sm:w-10 h-0.5 rounded {i <= stepIndex ? 'bg-blue-600' : 'bg-slate-200'}" aria-hidden="true"></span>
							{/if}
							<span class="flex items-center gap-2">
								<span
									class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold {i < stepIndex
										? 'bg-blue-600 text-white'
										: i === stepIndex
											? 'bg-blue-600 text-white ring-4 ring-blue-100'
											: 'bg-slate-200 text-slate-500'}"
									aria-current={i === stepIndex ? 'step' : undefined}
								>
									{i + 1}
								</span>
								<span class="text-sm font-semibold {i <= stepIndex ? 'text-slate-900' : 'text-slate-400'} hidden sm:inline">
									{label}
								</span>
							</span>
						</li>
					{/each}
				</ol>

				{#if step === 'token'}
					<div class="max-w-md mx-auto">
						<div class="card-pad">
							<h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">Masukkan kode token</h1>
							<p class="text-slate-600 mb-6">
								Kode 5 karakter yang dibagikan panitia. Token hanya bisa dipakai satu kali.
							</p>
							<form onsubmit={validateToken} class="space-y-4">
								<div>
									<label for="token" class="field-label">Kode token</label>
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
										class="input-field text-center text-2xl font-bold tracking-[0.35em] font-mono uppercase"
										aria-describedby={tokenError ? 'token-error' : undefined}
										aria-invalid={tokenError ? 'true' : undefined}
									/>
								</div>
								{#if tokenError}
									<p id="token-error" role="alert" class="alert-error">{tokenError}</p>
								{/if}
								<button type="submit" disabled={validating || code.length !== 5} class="btn-primary w-full">
									{validating ? 'Memeriksa...' : 'Lanjut memilih'}
								</button>
							</form>
						</div>
					</div>
				{:else if step === 'deck'}
					<div>
						<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 text-center">Pilih kandidatmu</h1>
						{#if voterType}
							<p class="text-center mb-6">
								<span class="badge-blue">
									{voterType === 'teacher' ? 'Token guru: suaramu bernilai 2 poin' : 'Token siswa: suaramu bernilai 1 poin'}
								</span>
							</p>
						{/if}
						{#if data.candidates.length === 0}
							<div class="card-pad max-w-xl mx-auto text-center">
								<p class="font-semibold text-slate-900 mb-1">Belum ada kandidat</p>
								<p class="text-slate-600">Panitia belum mendaftarkan kandidat. Coba lagi nanti.</p>
							</div>
						{:else}
							{#key deckKey}
								<CandidateDeck candidates={data.candidates} onSelect={choose} />
							{/key}
						{/if}
					</div>
				{:else if step === 'confirm' && selected}
					<div class="max-w-md mx-auto">
						<h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">Konfirmasi pilihanmu</h1>
						<p class="text-slate-600 mb-6">Pastikan ini kandidat yang kamu dukung. Suara tidak bisa diubah setelah dikirim.</p>

						<article class="card overflow-hidden mb-6">
							<Photo
								src={selected.photo_url}
								alt="Foto {selected.name}"
								name={selected.name}
								imgClass="w-full h-56 object-cover border-b border-slate-200"
								fallbackClass="w-full h-44 border-b border-slate-200"
							/>
							<div class="p-5">
								<h2 class="text-xl font-bold text-slate-900">{selected.name}</h2>
								{#if selected.vision}
									<p class="text-xs font-bold uppercase tracking-widest text-blue-700 mt-4 mb-1">Visi</p>
									<p class="text-slate-700">{selected.vision}</p>
								{/if}
								{#if selected.mission}
									<p class="text-xs font-bold uppercase tracking-widest text-blue-700 mt-4 mb-1">Misi</p>
									<p class="whitespace-pre-line text-slate-700">{selected.mission}</p>
								{/if}
							</div>
						</article>

						{#if submitError}
							<p role="alert" class="alert-error mb-4">{submitError}</p>
						{/if}

						<div class="flex flex-col gap-3">
							<button type="button" onclick={submitVote} disabled={submitting} class="btn-primary w-full">
								{submitting ? 'Mengirim...' : 'Kirim Suara'}
							</button>
							<button type="button" onclick={changeChoice} disabled={submitting} class="btn-secondary w-full">
								Ubah Pilihan
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>
