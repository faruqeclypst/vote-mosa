<script lang="ts">
	let name = $state('');
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
			const res = await fetch('/api/admin/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Gagal membuat akun.';
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
	<title>Pengaturan Awal - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh flex items-center justify-center px-4 py-10">
	<div class="sheet !max-w-[420px]">
		<div class="kop">
			<div class="kop-school">SMAN MODAL BANGSA</div>
			<h1 class="kop-title !text-2xl">Berita Acara Digital</h1>
		</div>
		<div class="rule-double"></div>

		<span class="lbl">PENGATURAN AWAL</span>
		<h2 class="text-xl font-extrabold mb-1">Buat akun super admin</h2>
		<p class="hint">Belum ada akun admin. Akun pertama ini punya akses penuh, termasuk kelola admin lain.</p>

		<form onsubmit={submit} class="space-y-4 mt-6">
			<div>
				<label for="name" class="field-label">Nama</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					required
					minlength="2"
					autocomplete="name"
					class="input"
				/>
			</div>
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
					minlength="8"
					autocomplete="new-password"
					aria-describedby="password-hint"
					class="input"
				/>
				<p id="password-hint" class="text-[13px] text-muted mt-1.5">Minimal 8 karakter.</p>
			</div>
			{#if error}
				<p role="alert" class="alert-error">{error}</p>
			{/if}
			<button type="submit" disabled={busy} class="btn-flag">
				{busy ? 'Menyimpan...' : 'Buat akun super admin'}
			</button>
		</form>
	</div>
</div>
