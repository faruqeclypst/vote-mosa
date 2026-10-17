<script lang="ts">
	let {
		src,
		alt,
		name,
		imgClass = '',
		fallbackClass = '',
		initialClass = 'font-display text-6xl text-brand w-24 h-24 rounded-full border-2 border-brand flex items-center justify-center'
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
	<div class="{fallbackClass} flex items-center justify-center" aria-hidden="true">
		<span class={initialClass}>{initial}</span>
	</div>
{/if}
