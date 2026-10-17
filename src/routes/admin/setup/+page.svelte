<script lang="ts">
	import { Vote } from '@lucide/svelte';

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

<div class="min-h-dvh flex items-center justify-center px-4 py-10 bg-slate-50">
	<div class="w-full max-w-md">
		<div class="flex items-center justify-center gap-2.5 mb-8">
			<span class="bg-blue-600 rounded-xl p-2" aria-hidden="true">
				<Vote class="h-5 w-5 text-white" />
			</span>
			<span class="text-xl font-extrabold tracking-tight text-slate-900">PEMOS</span>
		</div>

		<div class="card-pad">
			<p class="badge-slate mb-3">Pengaturan awal</p>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">Buat akun super admin</h1>
			<p class="text-slate-600 mb-6">
				Belum ada akun admin. Buat akun pertama — akun ini punya akses penuh termasuk kelola admin lain.
			</p>

			<form onsubmit={submit} class="space-y-4">
				<div>
					<label for="name" class="field-label">Nama</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						required
						minlength="2"
						autocomplete="name"
						class="input-field"
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
						class="input-field"
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
						class="input-field"
					/>
					<p id="password-hint" class="text-sm text-slate-500 mt-1.5">Minimal 8 karakter.</p>
				</div>
				{#if error}
					<p role="alert" class="alert-error">{error}</p>
				{/if}
				<button type="submit" disabled={busy} class="btn-primary w-full">
					{busy ? 'Menyimpan...' : 'Buat akun super admin'}
				</button>
			</form>
		</div>
	</div>
</div>
