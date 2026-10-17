<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.title} - {data.school}</title>
</svelte:head>

<div class="min-h-dvh flex flex-col">
	<header class="border-b-2 border-ink">
		<div class="mx-auto max-w-3xl px-5 py-4 flex items-baseline justify-between gap-4">
			<p class="font-display text-lg tracking-tight">{data.school}</p>
			<a href="/admin" class="text-sm underline underline-offset-4 text-ink-soft hover:text-ink"
				>Masuk sebagai admin</a
			>
		</div>
	</header>

	<main class="flex-1">
		<div class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
			<p class="text-sm font-semibold uppercase tracking-widest text-brand mb-4">Kartu suara digital</p>
			<h1 class="font-display text-4xl sm:text-5xl leading-tight tracking-tight mb-5">{data.title}</h1>
			<p class="text-lg text-ink-soft max-w-xl mb-10">
				Pilih ketua OSIS periode berikutnya. Setiap pemilih menerima satu kode token unik.
				Geser kartu kandidat untuk memilih, lalu kirim suaramu.
			</p>

			{#if data.votingOpen}
				<a
					href="/vote"
					class="inline-block min-h-[52px] px-10 py-4 bg-brand text-white text-lg font-semibold rounded-lg hover:bg-brand-deep transition-colors"
				>
					Mulai Voting
				</a>
			{:else}
				<div class="max-w-xl rounded-lg border border-line bg-paper-deep p-6">
					<p class="font-semibold mb-1">Voting sedang ditutup</p>
					<p class="text-ink-soft">
						Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.
					</p>
				</div>
			{/if}

			<section aria-label="Cara memilih" class="mt-16">
				<h2 class="font-display text-2xl tracking-tight mb-6">Cara memilih</h2>
				<ol class="grid gap-4 sm:grid-cols-3">
					<li class="rounded-lg border border-line bg-white/60 p-5">
						<p class="font-display text-3xl text-brand mb-2">1</p>
						<p class="font-semibold mb-1">Masukkan kode token</p>
						<p class="text-sm text-ink-soft">Kode 5 karakter yang dibagikan panitia ke tiap pemilih.</p>
					</li>
					<li class="rounded-lg border border-line bg-white/60 p-5">
						<p class="font-display text-3xl text-brand mb-2">2</p>
						<p class="font-semibold mb-1">Geser kartu kandidat</p>
						<p class="text-sm text-ink-soft">Geser kanan atau tekan pilih untuk kandidat pilihanmu.</p>
					</li>
					<li class="rounded-lg border border-line bg-white/60 p-5">
						<p class="font-display text-3xl text-brand mb-2">3</p>
						<p class="font-semibold mb-1">Kirim suaramu</p>
						<p class="text-sm text-ink-soft">Periksa pilihanmu sekali lagi, lalu kirim. Suara tercatat permanen.</p>
					</li>
				</ol>
			</section>

			<section aria-label="Catatan" class="mt-12 max-w-xl">
				<h2 class="font-display text-2xl tracking-tight mb-4">Perlu diketahui</h2>
				<ul class="list-disc pl-5 space-y-2 text-ink-soft">
					<li>Satu token hanya bisa dipakai satu kali.</li>
					<li>Token guru bernilai 2 poin, token siswa bernilai 1 poin.</li>
					<li>Pilihanmu bersifat rahasia, panitia tidak bisa melacak siapa memilih siapa.</li>
				</ul>
			</section>
		</div>
	</main>

	<footer class="border-t border-line">
		<div class="mx-auto max-w-3xl px-5 py-5 text-sm text-ink-soft flex justify-between gap-4">
			<span>{data.school}</span>
			<span>Pemilihan Ketua OSIS</span>
		</div>
	</footer>
</div>
