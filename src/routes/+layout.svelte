<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="description" content="Voting digital pemilihan ketua OSIS. Satu token, satu suara." />
</svelte:head>

{@render children()}
