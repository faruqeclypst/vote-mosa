<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { LogOut } from '@lucide/svelte';
	import StatsTab from '$lib/components/admin/StatsTab.svelte';
	import CandidatesTab from '$lib/components/admin/CandidatesTab.svelte';
	import TokensTab from '$lib/components/admin/TokensTab.svelte';
	import ResultsTab from '$lib/components/admin/ResultsTab.svelte';
	import SettingsTab from '$lib/components/admin/SettingsTab.svelte';
	import AdminsTab from '$lib/components/admin/AdminsTab.svelte';
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();

	const tabs = [
		{ id: 'ringkasan', label: 'Ringkasan' },
		{ id: 'kandidat', label: 'Kandidat' },
		{ id: 'token', label: 'Token' },
		{ id: 'hasil', label: 'Hasil' },
		{ id: 'pengaturan', label: 'Pengaturan' }
	] as const;

	const isSuper = $derived(data.admin?.role === 'super');
	const allTabs = $derived(isSuper ? [...tabs, { id: 'admin', label: 'Kelola Admin' }] : [...tabs]);
	const active = $derived(() => {
		const t = page.url.searchParams.get('tab') ?? 'ringkasan';
		const ids = allTabs.map((x) => x.id);
		return (ids as string[]).includes(t) ? t : 'ringkasan';
	});

	function selectTab(id: string) {
		const url = new URL(page.url);
		url.searchParams.set('tab', id);
		goto(url.toString(), { noScroll: true, keepFocus: true });
	}

	async function logout() {
		await fetch('/api/admin/logout', { method: 'POST' });
		window.location.href = '/admin/login';
	}
</script>

<svelte:head>
	<title>Berita Acara Digital - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh py-6 sm:py-10 px-4">
	<div class="sheet-wide">
		<header>
			<div class="kop">
				<div class="kop-school">SMAN MODAL BANGSA</div>
				<h1 class="kop-title">Berita Acara Digital</h1>
				<div class="kop-period">Pemilihan Ketua OSIS &middot; Tahun Ajaran 2026/2027</div>
			</div>
			<div class="rule-double"></div>
			<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
				<p class="text-sm text-muted">
					<span class="font-extrabold text-ink">{data.admin?.name}</span>
					&middot; {data.admin?.role === 'super' ? 'super admin' : 'admin'}
				</p>
				<div class="flex items-center gap-2">
					<a href="/" class="btn-line btn-sm">Lihat surat suara</a>
					<button type="button" onclick={logout} class="btn-line btn-sm">
						<LogOut class="h-4 w-4" />
						Keluar
					</button>
				</div>
			</div>
			<nav aria-label="Bagian berita acara" class="border-b border-line">
				<div class="flex gap-1 overflow-x-auto" role="tablist">
					{#each allTabs as t}
						<button
							type="button"
							role="tab"
							aria-selected={active() === t.id}
							onclick={() => selectTab(t.id)}
							class={active() === t.id ? 'tab-active' : 'tab'}
						>
							{t.label}
						</button>
					{/each}
				</div>
			</nav>
		</header>

		<main class="pt-8">
			{#if active() === 'ringkasan'}
				<StatsTab />
			{:else if active() === 'kandidat'}
				<CandidatesTab />
			{:else if active() === 'token'}
				<TokensTab />
			{:else if active() === 'hasil'}
				<ResultsTab />
			{:else if active() === 'pengaturan'}
				<SettingsTab />
			{:else if active() === 'admin' && isSuper}
				<AdminsTab />
			{/if}
		</main>
	</div>
</div>
