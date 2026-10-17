<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Vote, LogOut } from '@lucide/svelte';
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
	<title>Dashboard Admin - Pemilihan OSIS</title>
</svelte:head>

<div class="min-h-dvh flex flex-col bg-slate-50">
	<header class="bg-white border-b border-slate-200 sticky top-0 z-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
			<div class="flex items-center gap-2.5">
				<span class="bg-blue-600 rounded-xl p-2" aria-hidden="true">
					<Vote class="h-5 w-5 text-white" />
				</span>
				<div>
					<p class="font-extrabold tracking-tight text-slate-900 leading-none">Panel Panitia</p>
					<p class="text-xs text-slate-500 mt-1">
						{data.admin?.name} ({data.admin?.role === 'super' ? 'super admin' : 'admin'})
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<a href="/" class="btn-secondary btn-sm">Lihat situs</a>
				<button type="button" onclick={logout} class="btn-secondary btn-sm">
					<LogOut class="h-4 w-4" />
					Keluar
				</button>
			</div>
		</div>
		<nav aria-label="Tab dashboard" class="mx-auto max-w-6xl px-4 sm:px-6">
			<div class="flex gap-1 overflow-x-auto" role="tablist">
				{#each allTabs as t}
					<button
						type="button"
						role="tab"
						aria-selected={active() === t.id}
						onclick={() => selectTab(t.id)}
						class={active() === t.id ? 'tab-btn-active' : 'tab-btn'}
					>
						{t.label}
					</button>
				{/each}
			</div>
		</nav>
	</header>

	<main class="flex-1">
		<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">
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
