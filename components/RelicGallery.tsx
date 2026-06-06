'use client';

import type React from 'react';
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
	EffectComposer,
	Bloom,
	Vignette,
	DepthOfField,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import { RELICS, PALETTE, type RelicComponent } from './relics';

interface RelicGalleryProps {
	/** Speed multiplier applied to motion (default: 1) */
	speed?: number;
	/** Spacing between relics along Z in world units (default: 6) */
	zSpacing?: number;
	className?: string;
	style?: React.CSSProperties;
}

const FAR = -42; // spawn depth
const NEAR = 6; // past-camera cull depth

type Slot = {
	id: number;
	relicIndex: number;
	z: number;
	x: number;
	y: number;
	spin: number;
	spinSpeed: number;
	wobblePhase: number;
	scale: number;
};

/**
 * One relic instance: positions itself, fades in/out via opacity, and
 * reports its normalized progress to the relic for approach-driven effects.
 */
function RelicSlot({
	slot,
	Component,
}: {
	slot: Slot;
	Component: RelicComponent;
}) {
	const group = useRef<THREE.Group>(null);
	const [progress, setProgress] = useState(0);

	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		const t = state.clock.elapsedTime;
		g.position.set(slot.x, slot.y, slot.z);
		g.rotation.x = Math.sin(t * 0.45 + slot.wobblePhase) * 0.06;
		g.rotation.y = slot.spin + t * slot.spinSpeed;
		g.rotation.z = Math.cos(t * 0.38 + slot.wobblePhase) * 0.045;

		// progress 0 (far) -> 1 (at camera)
		const p = THREE.MathUtils.clamp((slot.z - FAR) / (NEAR - FAR), 0, 1);
		if (Math.abs(p - progress) > 0.01) setProgress(p);

		// opacity: fade in from far, fade out as it passes the camera
		let opacity = 1;
		if (p < 0.12) opacity = p / 0.12;
		else if (p > 0.82) opacity = Math.max(0, (1 - p) / 0.18);

		g.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (!mesh.isMesh) return;
			const mats = Array.isArray(mesh.material)
				? mesh.material
				: [mesh.material];
			mats.forEach((m) => {
				const mat = m as THREE.Material & { _baseOpacity?: number };
				if (mat._baseOpacity === undefined) {
					mat._baseOpacity = (mat as any).opacity ?? 1;
				}
				const baseOpacity = mat._baseOpacity ?? 1;
				mat.transparent = true;
				(mat as any).opacity = baseOpacity * opacity;
				mat.depthWrite = opacity > 0.85;
			});
		});
	});

	return (
		<group ref={group} scale={0.85 * slot.scale}>
			<Component progress={progress} />
		</group>
	);
}

function GalleryScene({ speed = 1, zSpacing = 6 }: RelicGalleryProps) {
	const velocity = useRef(0);
	const autoPlay = useRef(true);
	const lastInteraction = useRef(Date.now());
	const { camera } = useThree();

	const count = RELICS.length;

	// Lateral / vertical offsets give the tunnel a wandering feel.
	const offsets = useMemo(
		() =>
			Array.from({ length: count }, (_, i) => {
				const ha = i * 2.399;
				const va = i * 1.618 + 1.2;
				// Strong scale variation: some relics loom close, others recede.
				const scale = 0.6 + (Math.sin(i * 3.17) * 0.5 + 0.5) * 0.9;
				return {
					x: Math.sin(ha) * 2.1,
					y: Math.cos(va) * 1.4,
					spin: (i / count) * Math.PI * 2,
					spinSpeed: 0.12 + (i % 5) * 0.035,
					wobblePhase: i * 1.37,
					scale,
				};
			}),
		[count]
	);

	const slots = useRef<Slot[]>(
		Array.from({ length: count }, (_, i) => ({
			id: i,
			relicIndex: i,
			z: FAR + i * zSpacing,
			x: offsets[i].x,
			y: offsets[i].y,
			spin: offsets[i].spin,
			spinSpeed: offsets[i].spinSpeed,
			wobblePhase: offsets[i].wobblePhase,
			scale: offsets[i].scale,
		}))
	);

	const totalDepth = count * zSpacing;

	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			velocity.current += e.deltaY * 0.01 * speed;
			autoPlay.current = false;
			lastInteraction.current = Date.now();
		},
		[speed]
	);

	const handleKey = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
				velocity.current -= 1.5 * speed;
				autoPlay.current = false;
				lastInteraction.current = Date.now();
			} else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
				velocity.current += 1.5 * speed;
				autoPlay.current = false;
				lastInteraction.current = Date.now();
			}
		},
		[speed]
	);

	const touchY = useRef(0);
	const handleTouchStart = useCallback((e: TouchEvent) => {
		touchY.current = e.touches[0].clientY;
	}, []);
	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			const dy = touchY.current - e.touches[0].clientY;
			touchY.current = e.touches[0].clientY;
			velocity.current += dy * 0.03 * speed;
			autoPlay.current = false;
			lastInteraction.current = Date.now();
		},
		[speed]
	);

	useEffect(() => {
		const canvas = document.querySelector('canvas');
		if (!canvas) return;
		canvas.addEventListener('wheel', handleWheel, { passive: false });
		canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
		canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
		document.addEventListener('keydown', handleKey);
		return () => {
			canvas.removeEventListener('wheel', handleWheel);
			canvas.removeEventListener('touchstart', handleTouchStart);
			canvas.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('keydown', handleKey);
		};
	}, [handleWheel, handleKey, handleTouchStart, handleTouchMove]);

	useFrame((_s, delta) => {
		const dt = Math.min(delta, 0.05);
		if (Date.now() - lastInteraction.current > 3000) autoPlay.current = true;
		if (autoPlay.current) velocity.current += 1.2 * dt;
		velocity.current *= 0.94;

		const move = velocity.current * dt + 1.6 * dt; // slow, ceremonial base drift
		slots.current.forEach((slot) => {
			slot.z += move;
			if (slot.z > NEAR) {
				slot.z -= totalDepth;
			} else if (slot.z < FAR) {
				slot.z += totalDepth;
			}
		});

		// subtle camera breathing
		camera.position.x = Math.sin(_s.clock.elapsedTime * 0.2) * 0.15;
		camera.position.y = Math.cos(_s.clock.elapsedTime * 0.15) * 0.1;
		camera.lookAt(0, 0, -10);
	});

	return (
		<>
			<color attach="background" args={[PALETTE.charcoal]} />
			<fog attach="fog" args={['#0a0908', 6, 30]} />

			{/* Near-black fill so the void is never globally lit */}
			<ambientLight intensity={0.05} />

			{/* Warm key light, upper-left, raking down across the relics */}
			<spotLight
				position={[-6, 8, 4]}
				angle={0.5}
				penumbra={1}
				intensity={120}
				distance={40}
				color={'#ffd9a0'}
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.0004}
			/>

			{/* Cool, low rim light from back-right to catch edges */}
			<directionalLight
				position={[7, 2, -6]}
				intensity={0.5}
				color={'#7d93ad'}
			/>

			{/* Faint warm bounce to keep shadow cores from going fully black */}
			<pointLight
				position={[0, -3, 2]}
				intensity={6}
				distance={14}
				color={'#5a3f28'}
			/>

			{slots.current.map((slot) => (
				<RelicSlot
					key={slot.id}
					slot={slot}
					Component={RELICS[slot.relicIndex].Component}
				/>
			))}

			<EffectComposer>
				<Bloom
					intensity={0.9}
					luminanceThreshold={0.85}
					luminanceSmoothing={0.2}
					mipmapBlur
				/>
				<DepthOfField
					focusDistance={0.015}
					focalLength={0.05}
					bokehScale={3}
				/>
				<Vignette eskil={false} offset={0.25} darkness={0.95} />
			</EffectComposer>
		</>
	);
}

export default function RelicGallery({
	speed = 1,
	zSpacing = 6,
	className = 'h-screen w-full',
	style,
}: RelicGalleryProps) {
	const [webgl, setWebgl] = useState(true);

	useEffect(() => {
		try {
			const c = document.createElement('canvas');
			if (!(c.getContext('webgl') || c.getContext('experimental-webgl')))
				setWebgl(false);
		} catch {
			setWebgl(false);
		}
	}, []);

	if (!webgl) {
		return (
			<div
				className={className}
				style={style}
				role="img"
				aria-label="A procession of sacred relics drifting through darkness"
			/>
		);
	}

	return (
		<div className={className} style={style}>
			<Canvas
				shadows
				camera={{ position: [0, 0, 0], fov: 55 }}
				gl={{
					antialias: true,
					toneMapping: THREE.ACESFilmicToneMapping,
					toneMappingExposure: 0.85,
				}}
				dpr={[1, 2]}
			>
				<GalleryScene speed={speed} zSpacing={zSpacing} />
			</Canvas>
		</div>
	);
}
