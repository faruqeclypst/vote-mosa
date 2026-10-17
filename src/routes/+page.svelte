<script lang="ts">
	import { Vote, ShieldCheck, Smartphone, BarChart3, KeyRound, Users, CheckCircle2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const features = [
		{
			icon: ShieldCheck,
			tile: 'bg-emerald-100 text-emerald-700',
			title: 'Aman dengan token unik',
			text: 'Setiap pemilih menerima kode token 5 karakter yang hanya bisa dipakai satu kali. Pilihanmu bersifat rahasia.'
		},
		{
			icon: Smartphone,
			tile: 'bg-blue-100 text-blue-700',
			title: 'Mudah lewat HP',
			text: 'Tampilan dirancang untuk layar ponsel. Geser kartu kandidat ke kanan untuk memilih, ke kiri untuk melewati.'
		},
		{
			icon: BarChart3,
			tile: 'bg-amber-100 text-amber-700',
			title: 'Hasil transparan',
			text: 'Panitia memantau perolehan suara secara langsung dengan grafik dan peringkat yang selalu diperbarui.'
		}
	];

	const steps = [
		{
			icon: KeyRound,
			title: 'Masukkan kode token',
			text: 'Kode 5 karakter yang dibagikan panitia ke setiap pemilih.'
		},
		{
			icon: Users,
			title: 'Pilih kandidat',
			text: 'Baca visi dan misi tiap kandidat, lalu pilih yang paling kamu dukung.'
		},
		{
			icon: CheckCircle2,
			title: 'Konfirmasi dan kirim',
			text: 'Periksa pilihanmu sekali lagi, lalu kirim. Suara tercatat permanen.'
		}
	];
</script>

<svelte:head>
	<title>{data.title} - {data.school}</title>
</svelte:head>

<div class="min-h-dvh flex flex-col bg-slate-50">
	<header class="bg-white border-b border-slate-200 sticky top-0 z-50">
		<div class="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
			<a href="/" class="flex items-center gap-2.5">
				<span class="bg-blue-600 rounded-xl p-2" aria-hidden="true">
					<Vote class="h-5 w-5 text-white" />
				</span>
				<span class="text-xl font-extrabold tracking-tight text-slate-900">PEMOS</span>
			</a>
			<a href="/admin" class="btn-secondary btn-sm">Admin</a>
		</div>
	</header>

	<main class="flex-1">
		<!-- Hero -->
		<section class="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center">
			<p class="badge-blue mb-5">
				<CheckCircle2 class="h-3.5 w-3.5" />
				Sistem voting digital
			</p>
			<h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-5">
				{data.title}
			</h1>
			<p class="text-lg text-slate-600 max-w-2xl mx-auto mb-9">
				{data.school} — pilih ketua OSIS periode berikutnya. Satu token, satu suara, tercatat aman
				dan transparan.
			</p>
			{#if data.votingOpen}
				<a href="/vote" class="btn-primary text-lg px-10">
					<Vote class="h-5 w-5" />
					Mulai Voting Sekarang
				</a>
			{:else}
				<div class="card-pad max-w-xl mx-auto text-left">
					<p class="font-semibold text-slate-900 mb-1">Voting sedang ditutup</p>
					<p class="text-slate-600">Panitia belum membuka masa pemilihan. Silakan kembali lagi nanti.</p>
				</div>
			{/if}
		</section>

		<!-- Fitur -->
		<section aria-label="Keunggulan" class="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-20">
			<div class="grid gap-5 md:grid-cols-3">
				{#each features as f}
					<div class="card-pad">
						<div class="rounded-2xl w-14 h-14 flex items-center justify-center mb-5 {f.tile}" aria-hidden="true">
							<f.icon class="h-7 w-7" />
						</div>
						<h2 class="text-lg font-bold text-slate-900 mb-2">{f.title}</h2>
						<p class="text-slate-600 leading-relaxed">{f.text}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Cara memilih -->
		<section aria-label="Cara memilih" class="bg-white border-y border-slate-200">
			<div class="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
				<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center mb-10">
					Cara memilih
				</h2>
				<ol class="grid gap-5 md:grid-cols-3">
					{#each steps as s, i}
						<li class="card-pad relative">
							<span
								class="absolute top-5 right-6 text-5xl font-extrabold text-slate-100 select-none"
								aria-hidden="true"
							>
								{i + 1}
							</span>
							<div class="rounded-2xl w-12 h-12 flex items-center justify-center mb-4 bg-blue-100 text-blue-700" aria-hidden="true">
								<s.icon class="h-6 w-6" />
							</div>
							<h3 class="font-bold text-slate-900 mb-1.5">{s.title}</h3>
							<p class="text-sm text-slate-600 leading-relaxed">{s.text}</p>
						</li>
					{/each}
				</ol>
				<div class="card-pad mt-8 max-w-3xl mx-auto">
					<h3 class="font-bold text-slate-900 mb-3">Perlu diketahui</h3>
					<ul class="list-disc pl-5 space-y-1.5 text-slate-600 text-sm">
						<li>Satu token hanya bisa dipakai satu kali.</li>
						<li>Token guru bernilai 2 poin, token siswa bernilai 1 poin.</li>
						<li>Pilihanmu bersifat rahasia, panitia tidak bisa melacak siapa memilih siapa.</li>
					</ul>
				</div>
			</div>
		</section>
	</main>

	<footer class="bg-slate-900 text-white">
		<div class="mx-auto max-w-6xl px-4 sm:px-6 py-10 text-center">
			<div class="flex items-center justify-center gap-2.5 mb-4">
				<span class="bg-blue-600 rounded-xl p-2" aria-hidden="true">
					<Vote class="h-5 w-5 text-white" />
				</span>
				<span class="text-lg font-extrabold tracking-tight">PEMOS {data.school}</span>
			</div>
			<p class="text-slate-400 text-sm mb-1">Sistem voting digital untuk pemilihan ketua OSIS.</p>
			<p class="text-slate-500 text-sm">Satu token, satu suara.</p>
		</div>
	</footer>
</div>
