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
	<p class="text-sm text-slate-500 mb-3 text-center" aria-live="polite">
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
					class="absolute inset-0 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-lg"
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
							class="absolute top-4 left-4 px-3 py-1 rounded-lg border-2 border-blue-600 text-blue-700 font-bold uppercase tracking-widest text-sm bg-white/95 pointer-events-none"
							style="opacity: {Math.min(1, Math.max(0, dx / 80))}; transform: rotate(-12deg);"
						>
							Pilih
						</div>
						<div
							aria-hidden="true"
							class="absolute top-4 right-4 px-3 py-1 rounded-lg border-2 border-slate-400 text-slate-500 font-bold uppercase tracking-widest text-sm bg-white/95 pointer-events-none"
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
							imgClass="w-full h-52 sm:h-60 object-cover border-b border-slate-200"
							fallbackClass="w-full h-52 sm:h-60 border-b border-slate-200"
						/>
						<div class="p-5 overflow-y-auto flex-1">
							<div class="flex items-center gap-3 mb-2">
								<span
									class="text-base font-bold w-9 h-9 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center"
									aria-label="Nomor urut {candidateNumber(idx)}"
								>
									{candidateNumber(idx)}
								</span>
								<h3 class="text-xl font-bold tracking-tight text-slate-900">{candidates[idx].name}</h3>
							</div>
							{#if candidates[idx].vision}
								<p class="text-xs font-bold uppercase tracking-widest text-blue-700 mt-4 mb-1">Visi</p>
								<p class="text-slate-700">{candidates[idx].vision}</p>
							{/if}
							{#if candidates[idx].mission}
								<p class="text-xs font-bold uppercase tracking-widest text-blue-700 mt-4 mb-1">Misi</p>
								<p class="whitespace-pre-line text-slate-700">{candidates[idx].mission}</p>
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
				class="btn-secondary flex-1"
			>
				Lewati
			</button>
			<button
				type="button"
				onclick={() => commit('right')}
				disabled={animating}
				class="btn-primary flex-1"
			>
				Pilih
			</button>
		</div>
	{:else if skipped.length > 0}
		<div class="card-pad p-8 text-center">
			<p class="text-xl font-bold text-slate-900 mb-2">Belum ada pilihan</p>
			<p class="text-slate-600 mb-6">Kamu melewati semua kandidat. Lihat lagi dari awal untuk memilih.</p>
			<button type="button" onclick={reviewSkipped} class="btn-primary">
				Lihat lagi dari awal
			</button>
		</div>
	{/if}
</div>
