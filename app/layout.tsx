import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Geist_Mono, Instrument_Serif } from 'next/font/google';
import "./globals.css"

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const instrumentSerif = Instrument_Serif({
	variable: '--font-instrument',
	subsets: ['latin'],
	weight: '400',
	style: ['italic', 'normal'],
});

export const metadata: Metadata = {
	title: 'Relics — A Procession of Sacred Forms',
	description:
		'An infinite 3D procession of idols, offerings, vessels, and fragments of worship drifting through darkness.',
	generator: 'v0.app',
};

export const viewport: Viewport = {
	themeColor: '#1c1a18',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="bg-background">
			<body
				className={`${geistMono.variable} ${instrumentSerif.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
