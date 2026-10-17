<script lang="ts">
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		error = '';
		busy = true;
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Gagal masuk.';
				busy = false;
				return;
			}
			window.location.href = '/admin';
		} catch {
			error = 'Tidak bisa terhubung ke server.';
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk Panitia - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh flex items-center justify-center px-4 py-10">
	<div class="sheet !max-w-[420px]">
		<div class="kop">
			<div class="kop-school">SMAN MODAL BANGSA</div>
			<h1 class="kop-title !text-2xl">Berita Acara Digital</h1>
		</div>
		<div class="rule-double"></div>

		<span class="lbl">AREA PANITIA</span>
		<h2 class="text-xl font-extrabold mb-1">Masuk sebagai admin</h2>
		<p class="hint">Kelola kandidat, token, dan hasil pemilihan.</p>

		<form onsubmit={submit} class="space-y-4 mt-6">
			<div>
				<label for="email" class="field-label">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					class="input"
				/>
			</div>
			<div>
				<label for="password" class="field-label">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
					class="input"
				/>
			</div>
			{#if error}
				<p role="alert" class="alert-error">{error}</p>
			{/if}
			<button type="submit" disabled={busy} class="btn-flag">
				{busy ? 'Memeriksa...' : 'Masuk'}
			</button>
		</form>

		<p class="footnote !mt-6">
			<a href="/" class="underline font-bold text-ink">Kembali ke surat suara</a>
		</p>
	</div>
</div>
