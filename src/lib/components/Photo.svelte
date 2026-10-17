<script lang="ts">
	let {
		src,
		alt,
		name,
		imgClass = '',
		fallbackClass = '',
		initialClass = 'text-5xl font-bold text-blue-700'
	}: {
		src: string | null;
		alt: string;
		name: string;
		imgClass?: string;
		fallbackClass?: string;
		initialClass?: string;
	} = $props();

	let failed = $state(false);
	const initial = $derived(name.trim().charAt(0).toUpperCase() || '?');
</script>

{#if src && !failed}
	<img
		{src}
		{alt}
		class={imgClass}
		draggable="false"
		loading="lazy"
		onerror={() => (failed = true)}
	/>
{:else}
	<div class="{fallbackClass} flex items-center justify-center bg-blue-50" aria-hidden="true">
		<span class={initialClass}>{initial}</span>
	</div>
{/if}
