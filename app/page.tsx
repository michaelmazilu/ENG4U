import RelicGallery from '@/components/RelicGallery';

export default function Home() {
	return (
		<main className="min-h-screen bg-background">
			<RelicGallery
				speed={1.2}
				zSpacing={6}
				className="h-screen w-full overflow-hidden"
			/>
			<div className="fixed top-6 left-6 md:top-8 md:left-8 pointer-events-none z-10">
				<p className="font-serif italic text-xl md:text-2xl tracking-tight text-foreground/90">
					Michael Alexander Mazilu
				</p>
				<p className="font-mono uppercase text-[10px] md:text-[11px] tracking-[0.2em] text-foreground/50 mt-1">
					ENG4U Culminating
				</p>
			</div>

			<div className="text-center fixed bottom-10 left-0 right-0 font-mono uppercase text-[11px] font-semibold text-white/90">
				<p>Use mouse wheel, arrow keys, or touch to navigate</p>
			</div>
		</main>
	);
}
