<script lang="ts">
	import Photo from '$lib/components/Photo.svelte';
	import type { Candidate } from '$lib/db';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type TokenState = 'idle' | 'checking' | 'valid' | 'error';

	let digits = $state(['', '', '', '', '']);
	let inputs: HTMLInputElement[] = [];
	let tokenState = $state<TokenState>('idle');
	let tokenError = $state('');
	let voterType = $state<'student' | 'teacher' | null>(null);
	let lastChecked = $state('');

	let pickedId = $state<string | null>(null);
	let showConfirm = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let done = $state(false);

	const code = $derived(digits.join(''));
	const picked: Candidate | null = $derived(data.candidates.find((c) => c.id === pickedId) ?? null);
	const canSubmit = $derived(tokenState === 'valid' && pickedId !== null && !done);

	function resetTokenState() {
		if (tokenState !== 'idle') {
			tokenState = 'idle';
			tokenError = '';
			voterType = null;
		}
	}

	function onDigitInput(i: number, e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const ch = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
		digits[i] = ch;
		el.value = ch;
		if (ch && i < 4) inputs[i + 1]?.focus();
		resetTokenState();
	}

	function onDigitKey(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !digits[i] && i > 0) {
			digits[i - 1] = '';
			inputs[i - 1]?.focus();
			resetTokenState();
		} else if (e.key === 'ArrowLeft' && i > 0) {
			inputs[i - 1]?.focus();
		} else if (e.key === 'ArrowRight' && i < 4) {
			inputs[i + 1]?.focus();
		}
	}

	function onPaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = (e.clipboardData?.getData('text') ?? '')
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 5);
		if (!text) return;
		for (let i = 0; i < 5; i++) digits[i] = text[i] ?? '';
		inputs[Math.min(text.length, 4)]?.focus();
		resetTokenState();
	}

	$effect(() => {
		if (code.length === 5 && code !== lastChecked && tokenState !== 'checking') {
			validateToken(code);
		}
	});

	async function validateToken(c: string) {
		lastChecked = c;
		tokenState = 'checking';
		tokenError = '';
		try {
			const res = await fetch('/api/vote/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: c })
			});
			const body = await res.json();
			if (!res.ok) {
				tokenState = 'error';
				tokenError = body.error ?? 'Kode token tidak valid.';
				return;
			}
			voterType = body.type;
			tokenState = 'valid';
		} catch {
			tokenState = 'error';
			tokenError = 'Tidak bisa terhubung ke server. Periksa koneksimu.';
		}
	}

	function togglePick(id: string) {
		if (tokenState !== 'valid' || done) return;
		pickedId = pickedId === id ? null : id;
	}

	async function submitVote() {
		if (submitting || !pickedId) return;
		submitting = true;
		submitError = '';
		try {
			const res = await fetch('/api/vote/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, candidateId: pickedId })
			});
			const body = await res.json();
			if (!res.ok) {
				submitError = body.error ?? 'Gagal menyimpan suara.';
				showConfirm = false;
				submitting = false;
				window.scrollTo({ top: 0, behavior: 'smooth' });
				return;
			}
			showConfirm = false;
			done = true;
			window.scrollTo({ top: 0 });
		} catch {
			submitError = 'Tidak bisa terhubung ke server. Coba lagi.';
			showConfirm = false;
		} finally {
			submitting = false;
		}
	}

	function visionOf(c: Candidate): string {
		return c.vision?.trim() || c.mission?.trim().split('\n')[0] || '';
	}

	let resetTimer: ReturnType<typeof setTimeout> | null = null;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let countdown = $state(0);

	function backToBallot() {
		done = false;
		digits = ['', '', '', '', ''];
		pickedId = null;
		showConfirm = false;
		submitError = '';
		tokenState = 'idle';
		tokenError = '';
		voterType = null;
		lastChecked = '';
		countdown = 0;
		window.scrollTo({ top: 0 });
	}

	// Setelah suara tercatat, kembali otomatis ke surat suara dalam 5 detik
	$effect(() => {
		if (done) {
			countdown = 5;
			countdownTimer = setInterval(() => {
				countdown -= 1;
				if (countdown <= 0 && countdownTimer) clearInterval(countdownTimer);
			}, 1000);
			resetTimer = setTimeout(backToBallot, 5000);
		}
		return () => {
			if (resetTimer) clearTimeout(resetTimer);
			if (countdownTimer) clearInterval(countdownTimer);
			resetTimer = null;
			countdownTimer = null;
		};
	});
</script>

<svelte:head>
	<title>{data.title} - {data.school}</title>
</svelte:head>

<div class="min-h-dvh py-6 sm:py-10 px-4">
	<div class="sheet">
		{#if done}
			<!-- Layar sukses -->
			<div class="kop">
				<div class="kop-school">{data.school.toUpperCase()}</div>
				<h1 class="kop-title">{data.title}</h1>
			</div>
			<div class="rule-double"></div>
			<div class="text-center py-8">
				<span class="stamp-big">SAH</span>
				<h2 class="text-2xl font-extrabold mt-8 mb-2">Suaramu tercatat</h2>
				<p class="hint !mb-0">Terima kasih sudah berpartisipasi.<br />Satu token, satu suara.</p>
				<p class="mt-4 text-sm text-faint">Kembali ke surat suara dalam {countdown} detik…</p>
			</div>
		{:else if !data.votingOpen}
			<div class="kop">
				<div class="kop-school">{data.school.toUpperCase()}</div>
				<h1 class="kop-title">{data.title}</h1>
			</div>
			<div class="rule-double"></div>
			<h2 class="text-xl font-extrabold mb-2">Voting sedang ditutup</h2>
			<p class="hint">Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.</p>
		{:else}
			<!-- Kop surat suara -->
			<div class="kop">
				<div class="kop-school">{data.school.toUpperCase()}</div>
				<h1 class="kop-title">{data.title}</h1>
				<div class="kop-period">Tahun Ajaran 2025/2026 &middot; Surat Suara Digital</div>
			</div>
			<div class="rule-double"></div>

			{#if submitError}
				<p role="alert" class="alert-error mb-6">{submitError}</p>
			{/if}

			<!-- Kode token -->
			<section aria-label="Kode token">
				<span class="lbl">KODE TOKEN</span>
				<p class="hint">Masukkan 5 karakter token yang dibagikan panitia. Satu token untuk satu suara.</p>
				<div class="tokenboxes" role="group" aria-label="Kode token, 5 karakter">
					{#each digits as d, i}
						<input
							type="text"
							inputmode="text"
							autocomplete="off"
							autocapitalize="characters"
							spellcheck="false"
							aria-label="Karakter {i + 1} dari 5"
							maxlength="2"
							bind:this={inputs[i]}
							value={d}
							oninput={(e) => onDigitInput(i, e)}
							onkeydown={(e) => onDigitKey(i, e)}
							onpaste={onPaste}
							class="tokenbox {d ? 'filled' : ''}"
						/>
					{/each}
				</div>
				{#if tokenState === 'checking'}
					<p role="status" class="hint !text-ink font-semibold">Memeriksa token...</p>
				{:else if tokenState === 'valid'}
					<p role="status" class="hint !text-ink font-bold">
						Token valid{voterType === 'teacher' ? ' — suaramu bernilai 2 poin.' : ' — suaramu bernilai 1 poin.'}
					</p>
				{:else if tokenState === 'error'}
					<p role="alert" class="alert-error mb-6">{tokenError}</p>
				{/if}
			</section>

			<!-- Surat suara -->
			<section aria-label="Surat suara" class="mt-2">
				<span class="lbl">SURAT SUARA</span>
				<p class="hint">Ketuk satu kandidat untuk mencoblos. Kamu bisa mengganti pilihan sebelum disahkan.</p>

				{#if data.candidates.length === 0}
					<p class="hint">Belum ada kandidat. Panitia belum mendaftarkan kandidat.</p>
				{:else}
					<div>
						{#each data.candidates as c, i (c.id)}
							<button
								type="button"
								disabled={tokenState !== 'valid'}
								onclick={() => togglePick(c.id)}
								class="ballot-row {pickedId === c.id ? 'picked' : ''}"
								aria-pressed={pickedId === c.id}
							>
								<span class="num-circle" aria-hidden="true">{i + 1}</span>
								<Photo
									src={c.photo_url}
									alt="Foto {c.name}"
									name={c.name}
									imgClass="w-14 h-14 rounded-md object-cover shrink-0"
									fallbackClass="w-14 h-14 rounded-md shrink-0"
									initialClass="text-xl font-extrabold text-flag"
								/>
								<span class="flex-1 min-w-0 text-left">
									<span class="block text-[17px] font-extrabold leading-snug">{c.name}</span>
									{#if visionOf(c)}
										<span class="block text-[13px] text-muted leading-snug mt-0.5">{visionOf(c)}</span>
									{/if}
								</span>
								{#if pickedId === c.id}
									<span class="stamp" aria-hidden="true">COBLOS</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				<button
					type="button"
					disabled={!canSubmit}
					onclick={() => (showConfirm = true)}
					class="btn-flag mt-5"
				>
					Sahkan suaraku
				</button>
				<p class="footnote">Suaramu tercatat permanen setelah disahkan.<br />Pilihanmu rahasia, panitia tidak bisa melacaknya.</p>
			</section>
		{/if}

		<p class="footnote !mt-8">
			Panitia? <a href="/admin/login" class="underline font-bold text-ink">Masuk sebagai admin</a>
		</p>
	</div>
</div>

<!-- Modal konfirmasi -->
{#if showConfirm && picked}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
		<button type="button" aria-label="Tutup" onclick={() => (showConfirm = false)} class="absolute inset-0 bg-ink/60 cursor-default"></button>
		<div class="relative bg-paper rounded-lg w-full max-w-sm p-7 text-center" style="box-shadow: 0 10px 40px rgba(27,27,27,.25);">
			<span class="lbl !mb-3">KONFIRMASI</span>
			<h2 id="confirm-title" class="text-xl font-extrabold mb-1">Kamu memilih</h2>
			<p class="text-lg font-extrabold text-flag mb-4">{picked.name}</p>
			<p class="hint !mb-6">Suara tidak bisa diubah setelah disahkan.</p>
			<div class="flex flex-col gap-3">
				<button type="button" onclick={submitVote} disabled={submitting} class="btn-flag">
					{submitting ? 'Mengirim...' : 'Sahkan'}
				</button>
				<button type="button" onclick={() => (showConfirm = false)} disabled={submitting} class="btn-line w-full">
					Kembali
				</button>
			</div>
		</div>
	</div>
{/if}
