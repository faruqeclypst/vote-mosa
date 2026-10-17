<script lang="ts">
	import type { Candidate } from '$lib/db';
	import Photo from './Photo.svelte';

	let { candidates, onSelect }: { candidates: Candidate[]; onSelect: (c: Candidate) => void } =
		$props();

	// svelte-ignore state_referenced_locally: deck di-mount ulang via {#key} setiap sesi voting baru,
	// jadi inisialisasi dari props di sini disengaja dan tidak berubah selama komponen hidup.
	let queue = $state(candidates.map((_, i) => i));
	let skipped = $state<number[]>([]);
	let dx = $state(0);
	let dy = $state(0);
	let dragging = $state(false);
	let flying = $state<'left' | 'right' | null>(null);
	let animating = $state(false);
	let startX = 0;
	let startY = 0;

	const visible = $derived(queue.slice(0, 3));
	const ordered = $derived([...visible].reverse());
	const topIndex = $derived(queue[0]);
	const top = $derived(topIndex !== undefined ? candidates[topIndex] : undefined);
	const viewedCount = $derived(candidates.length - queue.length + 1);
	const reduceMotion =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function commit(direction: 'left' | 'right') {
		if (animating || top === undefined || topIndex === undefined) return;
		animating = true;
		flying = direction;
		const chosenIdx = topIndex;
		setTimeout(
			() => {
				queue = queue.slice(1);
				if (direction === 'right') {
					onSelect(candidates[chosenIdx]);
				} else {
					skipped = [...skipped, chosenIdx];
				}
				dx = 0;
				dy = 0;
				flying = null;
				animating = false;
			},
			reduceMotion ? 0 : 220
		);
	}

	function onPointerDown(e: PointerEvent) {
		if (animating || flying) return;
		dragging = true;
		startX = e.clientX;
		startY = e.clientY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		dx = e.clientX - startX;
		dy = e.clientY - startY;
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (dx > 110) commit('right');
		else if (dx < -110) commit('left');
		else {
			dx = 0;
			dy = 0;
		}
	}

	function reviewSkipped() {
		queue = [...skipped];
		skipped = [];
	}

	function candidateNumber(idx: number): number {
		return skipped.length + queue.indexOf(idx) + 1;
	}
</script>

<div class="w-full max-w-sm mx-auto">
	<p class="text-sm text-ink-soft mb-3 text-center" aria-live="polite">
		{#if top}
			Kandidat {viewedCount} dari {candidates.length}
		{:else if skipped.length > 0}
			Semua kartu sudah dilihat
		{/if}
	</p>

	{#if top}
		<div class="relative h-[470px] sm:h-[500px] touch-none select-none">
			{#each ordered as idx (candidates[idx].id)}
				{@const depth = visible.indexOf(idx)}
				{@const isTop = idx === topIndex}
				<!-- svelte-ignore a11y_no_static_element_interactions: kartu swipe custom; padanan keyboard penuh tersedia lewat tombol Lewati/Pilih di bawah deck -->
				<div
					class="absolute inset-0 rounded-2xl border-2 border-ink bg-white overflow-hidden"
					style={isTop
						? `z-index: 10; transform: translate(${flying ? (flying === 'right' ? 520 : -520) : dx}px, ${dy}px) rotate(${flying ? (flying === 'right' ? 16 : -16) : dx / 14}deg); ${dragging || flying ? '' : 'transition: transform 0.22s ease;'}`
						: `z-index: ${5 - depth}; transform: translateY(${depth * 10}px) scale(${1 - depth * 0.045});`}
					onpointerdown={isTop ? onPointerDown : undefined}
					onpointermove={isTop ? onPointerMove : undefined}
					onpointerup={isTop ? onPointerUp : undefined}
					onpointercancel={isTop ? onPointerUp : undefined}
				>
					{#if isTop}
						<div
							aria-hidden="true"
							class="absolute top-4 left-4 px-3 py-1 rounded-md border-2 border-brand text-brand font-bold uppercase tracking-widest text-sm bg-white/95 pointer-events-none"
							style="opacity: {Math.min(1, Math.max(0, dx / 80))}; transform: rotate(-12deg);"
						>
							Pilih
						</div>
						<div
							aria-hidden="true"
							class="absolute top-4 right-4 px-3 py-1 rounded-md border-2 border-ink-soft text-ink-soft font-bold uppercase tracking-widest text-sm bg-white/95 pointer-events-none"
							style="opacity: {Math.min(1, Math.max(0, -dx / 80))}; transform: rotate(12deg);"
						>
							Lewati
						</div>
					{/if}

					<div class="h-full flex flex-col">
						<Photo
							src={candidates[idx].photo_url}
							alt="Foto {candidates[idx].name}"
							name={candidates[idx].name}
							imgClass="w-full h-52 sm:h-60 object-cover border-b-2 border-ink"
							fallbackClass="w-full h-52 sm:h-60 bg-paper-deep border-b-2 border-ink"
						/>
						<div class="p-5 overflow-y-auto flex-1">
							<div class="flex items-center gap-3 mb-2">
								<span
									class="font-display text-lg w-9 h-9 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center"
									aria-label="Nomor urut {candidateNumber(idx)}"
								>
									{candidateNumber(idx)}
								</span>
								<h3 class="font-display text-2xl tracking-tight">{candidates[idx].name}</h3>
							</div>
							{#if candidates[idx].vision}
								<p class="text-xs font-semibold uppercase tracking-widest text-brand mt-4 mb-1">Visi</p>
								<p>{candidates[idx].vision}</p>
							{/if}
							{#if candidates[idx].mission}
								<p class="text-xs font-semibold uppercase tracking-widest text-brand mt-4 mb-1">Misi</p>
								<p class="whitespace-pre-line">{candidates[idx].mission}</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="flex gap-4 justify-center mt-5">
			<button
				type="button"
				onclick={() => commit('left')}
				disabled={animating}
				class="min-h-[56px] px-8 rounded-xl border-2 border-ink bg-white font-semibold hover:bg-paper-deep disabled:opacity-50 transition-colors"
			>
				Lewati
			</button>
			<button
				type="button"
				onclick={() => commit('right')}
				disabled={animating}
				class="min-h-[56px] px-8 rounded-xl border-2 border-brand bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors"
			>
				Pilih
			</button>
		</div>
	{:else if skipped.length > 0}
		<div class="rounded-2xl border-2 border-ink bg-white p-8 text-center">
			<p class="font-display text-2xl mb-2">Belum ada pilihan</p>
			<p class="text-ink-soft mb-6">Kamu melewati semua kandidat. Lihat lagi dari awal untuk memilih.</p>
			<button
				type="button"
				onclick={reviewSkipped}
				class="min-h-[52px] px-8 rounded-lg bg-ink text-paper font-semibold hover:opacity-90 transition-opacity"
			>
				Lihat lagi dari awal
			</button>
		</div>
	{/if}
</div>
