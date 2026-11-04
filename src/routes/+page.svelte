<script lang="ts">
	import Photo from '$lib/components/Photo.svelte';
	import { ELECTION_LABEL } from '$lib/elections';
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

	// Pemilihan yang bisa dipilih token ini (dari /api/vote/validate)
	let availableElections = $state<string[]>([]);
	// Coblosan per pemilihan: { osis: candidateId|null, mpk: ... }
	let picks = $state<Record<string, string | null>>({});

	let showConfirm = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let done = $state(false);

	const code = $derived(digits.join(''));

	const candidatesByElection = $derived.by<Record<string, Candidate[]>>(() => {
		const out: Record<string, Candidate[]> = {};
		for (const c of data.candidates) (out[c.election] ??= []).push(c);
		return out;
	});

	// Pemilihan yang tampil di surat suara: dibuka, token belum memakainya, ada kandidatnya
	const votableElections = $derived(
		availableElections.filter((e) => (candidatesByElection[e] ?? []).length > 0)
	);
	const missingElections = $derived(votableElections.filter((e) => !picks[e]));
	const canSubmit = $derived(
		tokenState === 'valid' && votableElections.length > 0 && missingElections.length === 0 && !done
	);

	function candidateName(election: string): string {
		const id = picks[election];
		return candidatesByElection[election]?.find((c) => c.id === id)?.name ?? '';
	}

	function resetTokenState() {
		if (tokenState !== 'idle') {
			tokenState = 'idle';
			tokenError = '';
			voterType = null;
		}
		availableElections = [];
		picks = {};
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
			availableElections = Array.isArray(body.elections)
				? body.elections.filter((e: unknown) => e === 'osis' || e === 'mpk')
				: [];
			picks = {};
			tokenState = 'valid';
		} catch {
			tokenState = 'error';
			tokenError = 'Tidak bisa terhubung ke server. Periksa koneksimu.';
		}
	}

	function togglePick(election: string, id: string) {
		if (tokenState !== 'valid' || done) return;
		picks[election] = picks[election] === id ? null : id;
	}

	async function submitVote() {
		if (submitting || !canSubmit) return;
		submitting = true;
		submitError = '';
		try {
			const picksBody: Record<string, string> = {};
			for (const e of votableElections) {
				if (picks[e]) picksBody[e] = picks[e] as string;
			}
			const res = await fetch('/api/vote/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, picks: picksBody })
			});
			const body = await res.json();
			if (!res.ok) {
				// Jawaban submit bisa hilang di jaringan padahal suara sudah tersimpan di server.
				// Bila server menjawab 409, cek ulang token: kalau pemilihan ini sudah tidak
				// tersedia untuk token tersebut, berarti suara tadi memang sudah tercatat.
				if (res.status === 409) {
					try {
						const check = await fetch('/api/vote/validate', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ code })
						});
						if (check.status === 409) {
							showConfirm = false;
							done = true;
							window.scrollTo({ top: 0 });
							return;
						}
						if (check.ok) {
							const checkBody = await check.json();
							const still: string[] = Array.isArray(checkBody.elections) ? checkBody.elections : [];
							if (votableElections.every((e) => !still.includes(e))) {
								showConfirm = false;
								done = true;
								window.scrollTo({ top: 0 });
								return;
							}
						}
					} catch {
						/* abaikan, tampilkan galat aslinya di bawah */
					}
				}
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

	let resetTimer: ReturnType<typeof setTimeout> | null = null;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let countdown = $state(0);

	function backToBallot() {
		done = false;
		digits = ['', '', '', '', ''];
		availableElections = [];
		picks = {};
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

<div class="min-h-dvh flex items-center justify-center px-4 py-6 sm:py-10">
	<div class="sheet sheet-fluid">
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
				<p class="hint !mb-0">Terima kasih sudah berpartisipasi.<br />Satu token, satu suara di setiap pemilihan.</p>
				<p class="mt-4 text-sm text-faint">Kembali ke surat suara dalam {countdown} detik…</p>
			</div>
		{:else if !data.votingOpen}
			<div class="kop">
				<div class="kop-school">{data.school.toUpperCase()}</div>
				<h1 class="kop-title">{data.title}</h1>
			</div>
			<div class="rule-double"></div>
			<div class="text-center max-w-xl mx-auto">
				<h2 class="text-xl font-extrabold mb-2">Pemilihan sedang ditutup</h2>
				<p class="hint !mb-0">Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.</p>
			</div>
		{:else}
			<!-- Kop surat suara -->
			<div class="kop">
				<div class="kop-school">{data.school.toUpperCase()}</div>
				<h1 class="kop-title">{data.title}</h1>
				<div class="kop-period">Tahun Ajaran 2026/2027 &middot; Surat Suara Digital</div>
			</div>
			<div class="rule-double"></div>

			{#if submitError}
				<p role="alert" class="alert-error mb-6">{submitError}</p>
			{/if}

			{#if tokenState !== 'valid'}
			<!-- Kode token -->
			<section aria-label="Kode token" class="w-full max-w-[560px] mx-auto">
				<span class="lbl">KODE TOKEN</span>
				<p class="hint">Masukkan 5 karakter token yang dibagikan panitia. Satu token berlaku untuk setiap pemilihan yang dibuka.</p>
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
				{:else if tokenState === 'error'}
					<p role="alert" class="alert-error mb-6">{tokenError}</p>
				{/if}
			</section>
			{/if}

			<!-- Surat suara per pemilihan -->
			{#if tokenState === 'valid'}
				<section aria-label="Surat suara" class="mt-2">
					{#each votableElections as election, ei}
						<div class={ei > 0 ? 'mt-8' : ''}>
							<span class="lbl">SURAT SUARA — {ELECTION_LABEL[election as keyof typeof ELECTION_LABEL].toUpperCase()}</span>
							<p class="hint">Ketuk satu kandidat untuk mencoblos. Kamu bisa mengganti pilihan sebelum disahkan.</p>
							<div class="grid gap-5 items-stretch" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));">
								{#each candidatesByElection[election] as c, i (c.id)}
									<button
										type="button"
										onclick={() => togglePick(election, c.id)}
										class="ballot-card {picks[election] === c.id ? 'picked' : ''}"
										aria-pressed={picks[election] === c.id}
									>
										<span class="flex w-full items-center justify-between">
											<span class="num-box" aria-hidden="true">{i + 1}</span>
											<span class="cat-tag">{election.toUpperCase()}</span>
										</span>
										<Photo
											src={c.photo_url}
											alt="Foto {c.name}"
											name={c.name}
											imgClass="w-full max-w-[400px] mx-auto aspect-[4/5] object-cover rounded-md mt-5"
											fallbackClass="w-full max-w-[400px] mx-auto aspect-[4/5] rounded-md mt-5"
											initialClass="text-6xl font-extrabold text-flag"
										/>
										<span class="block text-3xl font-extrabold leading-tight mt-5">{c.name}</span>
										{#if picks[election] === c.id}
											<span class="stamp" aria-hidden="true">COBLOS</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
					{#if votableElections.length === 0}
						<p class="hint">Belum ada kandidat yang bisa dipilih dengan token ini.</p>
					{/if}

					<div class="w-full max-w-2xl mx-auto">
						<button
							type="button"
							disabled={!canSubmit}
							onclick={() => (showConfirm = true)}
							class="btn-flag mt-5"
						>
							Sahkan suaraku
						</button>
						{#if tokenState === 'valid' && missingElections.length > 0}
							<p class="hint mt-2 !mb-0">
								Pilih juga {missingElections.map((e) => ELECTION_LABEL[e as keyof typeof ELECTION_LABEL]).join(' dan ')} sebelum mengesahkan.
							</p>
						{/if}
						<p class="footnote">Suaramu tercatat permanen setelah disahkan.<br />Pilihanmu rahasia, panitia tidak bisa melacaknya.</p>
					</div>
				</section>
			{/if}
		{/if}

		<p class="footnote !mt-8">
			Panitia? <a href="/admin/login" class="underline font-bold text-ink">Masuk sebagai admin</a>
		</p>
	</div>
</div>

<!-- Modal konfirmasi -->
{#if showConfirm && votableElections.length > 0}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
		<button type="button" aria-label="Tutup" onclick={() => (showConfirm = false)} class="absolute inset-0 bg-ink/60 cursor-default"></button>
		<div class="relative bg-paper rounded-lg w-full max-w-sm p-7 text-center" style="box-shadow: 0 10px 40px rgba(27,27,27,.25);">
			<span class="lbl !mb-3">KONFIRMASI</span>
			<h2 id="confirm-title" class="text-xl font-extrabold mb-4">Kamu memilih</h2>
			{#each votableElections as election}
				<div class="mb-4">
					<span class="lbl !mb-1">{ELECTION_LABEL[election as keyof typeof ELECTION_LABEL]}</span>
					<p class="text-lg font-extrabold text-flag">{candidateName(election)}</p>
				</div>
			{/each}
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
