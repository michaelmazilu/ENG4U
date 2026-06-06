'use client';

import type React from 'react';
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
	EffectComposer,
	Bloom,
	Vignette,
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
const ARCH_FAR = -78;
const ARCH_NEAR = 12;
const BAY_SPACING = 8;

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

function archCurve(width: number, wallHeight: number, crownHeight: number) {
	const points: THREE.Vector3[] = [];
	const half = width / 2;
	const radius = half;
	for (let i = 0; i <= 10; i += 1) {
		points.push(new THREE.Vector3(-half, (i / 10) * wallHeight, 0));
	}
	for (let i = 0; i <= 32; i += 1) {
		const angle = Math.PI - (i / 32) * Math.PI;
		points.push(
			new THREE.Vector3(
				Math.cos(angle) * radius,
				wallHeight + Math.sin(angle) * (crownHeight - wallHeight),
				0
			)
		);
	}
	for (let i = 0; i <= 10; i += 1) {
		points.push(new THREE.Vector3(half, wallHeight - (i / 10) * wallHeight, 0));
	}
	return new THREE.CatmullRomCurve3(points);
}

function CathedralArchitecture() {
	const nave = useRef<THREE.Group>(null);
	const dust = useRef<THREE.Points>(null);

	const bayDepths = useMemo(
		() =>
			Array.from(
				{ length: Math.ceil((ARCH_NEAR - ARCH_FAR) / BAY_SPACING) + 3 },
				(_, i) => ARCH_FAR + i * BAY_SPACING
			),
		[]
	);

	const columnGeometry = useMemo(() => new THREE.CylinderGeometry(0.32, 0.44, 7.4, 18), []);
	const columnCapitalGeometry = useMemo(
		() => new THREE.CylinderGeometry(0.56, 0.48, 0.28, 18),
		[]
	);
	const archGeometry = useMemo(
		() => new THREE.TubeGeometry(archCurve(8.6, 4.4, 7.35), 80, 0.1, 10, false),
		[]
	);
	const sideArchGeometry = useMemo(
		() => new THREE.TubeGeometry(archCurve(3.4, 3.25, 5.25), 64, 0.06, 8, false),
		[]
	);
	const ribGeometry = useMemo(
		() => new THREE.TubeGeometry(archCurve(5.8, 5.6, 8.2), 72, 0.035, 6, false),
		[]
	);

	const dustGeometry = useMemo(() => {
		const count = 520;
		const positions = new Float32Array(count * 3);
		for (let i = 0; i < count; i += 1) {
			positions[i * 3] = (Math.random() - 0.5) * 13;
			positions[i * 3 + 1] = 0.6 + Math.random() * 7.4;
			positions[i * 3 + 2] = ARCH_FAR + Math.random() * (ARCH_NEAR - ARCH_FAR);
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return geometry;
	}, []);

	const stone = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: '#171411',
				roughness: 0.86,
				metalness: 0.04,
			}),
		[]
	);
	const stoneEdge = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: '#2b261f',
				roughness: 0.82,
				metalness: 0.08,
			}),
		[]
	);
	const floorMaterial = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: '#0d0c0b',
				roughness: 0.72,
				metalness: 0.22,
			}),
		[]
	);
	const bronze = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: '#5a462c',
				roughness: 0.66,
				metalness: 0.55,
			}),
		[]
	);
	const archHighlight = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: '#c99a62',
				transparent: true,
				opacity: 0.11,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[]
	);
	const coolEdge = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: '#6f8396',
				transparent: true,
				opacity: 0.075,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[]
	);

	useFrame((state) => {
		const t = state.clock.elapsedTime;
		if (nave.current) {
			nave.current.position.z = (t * 0.18) % BAY_SPACING;
		}
		if (dust.current) {
			dust.current.rotation.y = Math.sin(t * 0.08) * 0.025;
			dust.current.position.z = (t * 0.08) % BAY_SPACING;
		}
	});

	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, -31]} receiveShadow>
				<planeGeometry args={[18, 112]} />
				<primitive object={floorMaterial} attach="material" />
			</mesh>

			{/* soft reflected nave guide lines on the polished black stone */}
			{[-2.7, 2.7].map((x) => (
				<mesh
					key={x}
					position={[x, -2.335, -30]}
					rotation={[-Math.PI / 2, 0, 0]}
				>
					<planeGeometry args={[0.035, 92]} />
					<meshBasicMaterial color="#d19a53" transparent opacity={0.055} />
				</mesh>
			))}

			<mesh position={[0, 5.55, -33]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[6.9, 6.9, 112, 32, 1, true, 0, Math.PI]} />
				<meshStandardMaterial
					color="#11100f"
					roughness={0.9}
					metalness={0.05}
					side={THREE.BackSide}
				/>
			</mesh>

			{/* distant abstract oculus / altar glow */}
			<mesh position={[0, 2.5, ARCH_FAR - 4]}>
				<circleGeometry args={[3.8, 80]} />
				<meshBasicMaterial color="#d19045" transparent opacity={0.18} />
			</mesh>
			<mesh position={[0, 2.5, ARCH_FAR - 3.95]}>
				<ringGeometry args={[1.55, 2.0, 80]} />
				<meshBasicMaterial color="#f0c07a" transparent opacity={0.22} />
			</mesh>
			<pointLight position={[0, 2.9, ARCH_FAR - 2]} color="#d99a4b" intensity={28} distance={42} />

			<points ref={dust} geometry={dustGeometry}>
				<pointsMaterial
					color="#d8b98a"
					size={0.018}
					transparent
					opacity={0.24}
					sizeAttenuation
					depthWrite={false}
				/>
			</points>

			<group ref={nave}>
				{bayDepths.map((z, i) => (
					<group key={z} position={[0, 0, z]}>
						{[-1, 1].map((side) => (
							<group key={side}>
								<mesh
									geometry={columnGeometry}
									material={stone}
									position={[side * 4.35, 1.35, 0]}
									castShadow
									receiveShadow
								/>
								<mesh
									geometry={columnCapitalGeometry}
									material={stoneEdge}
									position={[side * 4.35, 5.12, 0]}
									castShadow
								/>
								<mesh
									geometry={columnGeometry}
									material={stone}
									position={[side * 6.35, 0.75, 0]}
									scale={[0.58, 0.78, 0.58]}
									castShadow
									receiveShadow
								/>
							</group>
						))}
						<mesh
							geometry={archGeometry}
							material={i % 3 === 0 ? bronze : stoneEdge}
							position={[0, -1.95, 0]}
							castShadow
						/>
						<mesh
							geometry={archGeometry}
							material={i % 2 === 0 ? archHighlight : coolEdge}
							position={[0, -1.92, 0.02]}
							scale={[0.985, 0.985, 1]}
						/>
						{[-1, 1].map((side) => (
							<mesh
								key={side}
								geometry={sideArchGeometry}
								material={stone}
								position={[side * 6.1, -1.25, 0]}
								scale={[1, 1, 0.8]}
								castShadow
							/>
						))}
						<mesh
							geometry={ribGeometry}
							material={stoneEdge}
							position={[0, -1.05, 0]}
							castShadow
						/>
					</group>
				))}
			</group>

			{/* side aisles and far silhouettes sinking into darkness */}
			{[-1, 1].map((side) => (
				<group key={side}>
					<mesh position={[side * 8.2, 0.9, -30]} rotation={[0, 0, side * 0.08]}>
						<boxGeometry args={[2.8, 7.4, 94]} />
						<meshStandardMaterial color="#090807" roughness={0.9} metalness={0.02} />
					</mesh>
					<mesh position={[side * 5.75, 5.9, -34]} rotation={[0, 0, side * 0.34]}>
						<boxGeometry args={[0.06, 1.2, 96]} />
						<primitive object={stoneEdge} attach="material" />
					</mesh>
				</group>
			))}
		</group>
	);
}

function CathedralLightRig() {
	const beamDepths = [-8, -18, -30, -42];

	return (
		<group>
			{beamDepths.map((z, i) => (
				<group key={z}>
					<mesh
						position={[i % 2 === 0 ? -1.15 : 1.15, 2.25, z]}
						rotation={[0.16, 0, i % 2 === 0 ? -0.18 : 0.18]}
					>
						<coneGeometry args={[1.55, 8.4, 32, 1, true]} />
						<meshBasicMaterial
							color={i === 1 ? '#f0c58b' : '#c99558'}
							transparent
							opacity={i === 1 ? 0.07 : 0.045}
							depthWrite={false}
							side={THREE.DoubleSide}
							blending={THREE.AdditiveBlending}
						/>
					</mesh>
					<mesh position={[0, -2.325, z]} rotation={[-Math.PI / 2, 0, 0]}>
						<circleGeometry args={[i === 1 ? 2.25 : 1.75, 56]} />
						<meshBasicMaterial
							color="#d59b58"
							transparent
							opacity={i === 1 ? 0.18 : 0.1}
							depthWrite={false}
							blending={THREE.AdditiveBlending}
						/>
					</mesh>
				</group>
			))}

			{/* High architectural light, as if entering through clerestory openings. */}
			<spotLight
				position={[-5.8, 7.8, -4]}
				target-position={[0.15, -1.15, -10]}
				angle={0.24}
				penumbra={0.7}
				intensity={92}
				distance={34}
				color="#f2be7b"
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.00035}
			/>
			<spotLight
				position={[5.6, 7.4, -17]}
				target-position={[-0.1, -1.25, -20]}
				angle={0.22}
				penumbra={0.72}
				intensity={76}
				distance={36}
				color="#d9a05f"
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-bias={-0.00035}
			/>
			<spotLight
				position={[0, 8.6, -13]}
				target-position={[0, -2.2, -13]}
				angle={0.3}
				penumbra={0.82}
				intensity={128}
				distance={28}
				color="#ffd7a0"
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.0003}
			/>
			<directionalLight
				position={[2.5, 4.5, -46]}
				intensity={1.65}
				color="#7c91aa"
			/>
			<pointLight
				position={[0, -0.8, -14]}
				intensity={4.8}
				distance={8}
				color="#7a5330"
			/>
		</group>
	);
}

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
			<color attach="background" args={['#080706']} />
			<fogExp2 attach="fog" args={['#090706', 0.032]} />

			{/* Near-black fill so the cathedral stays mostly in shadow */}
			<ambientLight intensity={0.018} />

			<CathedralArchitecture />
			<CathedralLightRig />

			{/* Low-intensity architectural fill; the beams carry the real exposure. */}
			<spotLight
				position={[-4.6, 6.8, -8]}
				angle={0.36}
				penumbra={1}
				intensity={16}
				distance={34}
				color={'#d89a54'}
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-bias={-0.0004}
			/>
			<spotLight
				position={[4.8, 6.4, -20]}
				target-position={[0, 0.5, -18]}
				angle={0.22}
				penumbra={1}
				intensity={10}
				distance={36}
				color={'#c79d66'}
			/>

			{/* Cool, low rim light from back-right to catch edges */}
			<directionalLight
				position={[6, 3, -28]}
				intensity={1.35}
				color={'#7b8ca0'}
			/>

			{/* Faint warm bounce to keep shadow cores from going fully black */}
			<pointLight
				position={[0, -3, 2]}
				intensity={2.2}
				distance={9}
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
					intensity={0.48}
					luminanceThreshold={0.92}
					luminanceSmoothing={0.12}
					mipmapBlur
				/>
				<Vignette eskil={false} offset={0.2} darkness={0.82} />
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
					toneMappingExposure: 0.78,
				}}
				onCreated={({ gl }) => {
					gl.shadowMap.type = THREE.PCFSoftShadowMap;
				}}
				dpr={[1, 2]}
			>
				<GalleryScene speed={speed} zSpacing={zSpacing} />
			</Canvas>
		</div>
	);
}
