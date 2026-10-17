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
	<title>Setup Admin - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh flex items-center justify-center px-5 py-10">
	<div class="w-full max-w-md">
		<p class="text-sm font-semibold uppercase tracking-widest text-brand mb-3">Pengaturan awal</p>
		<h1 class="font-display text-3xl tracking-tight mb-3">Buat akun super admin</h1>
		<p class="text-ink-soft mb-8">
			Belum ada akun admin. Buat akun pertama, akun ini punya akses penuh termasuk kelola admin lain.
		</p>

		<form onsubmit={submit} class="space-y-4">
			<div>
				<label for="name" class="block font-semibold mb-2">Nama</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					required
					minlength="2"
					autocomplete="name"
					class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white"
				/>
			</div>
			<div>
				<label for="email" class="block font-semibold mb-2">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white"
				/>
			</div>
			<div>
				<label for="password" class="block font-semibold mb-2">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					minlength="8"
					autocomplete="new-password"
					aria-describedby="password-hint"
					class="w-full min-h-[52px] px-4 rounded-lg border-2 border-ink bg-white"
				/>
				<p id="password-hint" class="text-sm text-ink-soft mt-1">Minimal 8 karakter.</p>
			</div>
			{#if error}
				<p role="alert" class="text-brand-deep font-semibold">{error}</p>
			{/if}
			<button
				type="submit"
				disabled={busy}
				class="w-full min-h-[56px] rounded-lg bg-brand text-white text-lg font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors"
			>
				{busy ? 'Menyimpan...' : 'Buat akun super admin'}
			</button>
		</form>
	</div>
</div>
