<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import StatsTab from '$lib/components/admin/StatsTab.svelte';
	import CandidatesTab from '$lib/components/admin/CandidatesTab.svelte';
	import TokensTab from '$lib/components/admin/TokensTab.svelte';
	import ResultsTab from '$lib/components/admin/ResultsTab.svelte';
	import SettingsTab from '$lib/components/admin/SettingsTab.svelte';
	import AdminsTab from '$lib/components/admin/AdminsTab.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const tabs = [
		{ id: 'ringkasan', label: 'Ringkasan' },
		{ id: 'kandidat', label: 'Kandidat' },
		{ id: 'token', label: 'Token' },
		{ id: 'hasil', label: 'Hasil' },
		{ id: 'pengaturan', label: 'Pengaturan' }
	] as const;

	const isSuper = $derived(data.admin?.role === 'super');
	const active = $derived(() => {
		const t = page.url.searchParams.get('tab') ?? 'ringkasan';
		const ids = isSuper ? [...tabs.map((x) => x.id), 'admin'] : tabs.map((x) => x.id);
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
	<title>Dashboard Admin - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh flex flex-col">
	<header class="border-b-2 border-ink bg-paper sticky top-0 z-20">
		<div class="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
			<div>
				<p class="font-display text-lg tracking-tight leading-none">Panel Panitia</p>
				<p class="text-xs text-ink-soft mt-1">
					{data.admin?.name} ({data.admin?.role === 'super' ? 'super admin' : 'admin'})
				</p>
			</div>
			<div class="flex items-center gap-3">
				<a href="/" class="text-sm underline underline-offset-4 text-ink-soft hover:text-ink">Lihat situs</a>
				<button
					type="button"
					onclick={logout}
					class="min-h-[44px] px-4 rounded-lg border-2 border-ink bg-white text-sm font-semibold hover:bg-paper-deep"
				>
					Keluar
				</button>
			</div>
		</div>
		<nav aria-label="Tab dashboard" class="mx-auto max-w-6xl px-5">
			<div class="flex gap-1 overflow-x-auto" role="tablist">
				{#each tabs as t}
					<button
						type="button"
						role="tab"
						aria-selected={active() === t.id}
						onclick={() => selectTab(t.id)}
						class="min-h-[48px] px-4 text-sm font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors {active() === t.id
							? 'border-brand text-brand'
							: 'border-transparent text-ink-soft hover:text-ink'}"
					>
						{t.label}
					</button>
				{/each}
				{#if isSuper}
					<button
						type="button"
						role="tab"
						aria-selected={active() === 'admin'}
						onclick={() => selectTab('admin')}
						class="min-h-[48px] px-4 text-sm font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors {active() === 'admin'
							? 'border-brand text-brand'
							: 'border-transparent text-ink-soft hover:text-ink'}"
					>
						Kelola Admin
					</button>
				{/if}
			</div>
		</nav>
	</header>

	<main class="flex-1">
		<div class="mx-auto max-w-6xl px-5 py-8">
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
		</div>
	</main>
</div>
