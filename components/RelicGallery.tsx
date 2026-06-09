'use client';

import type React from 'react';
import { useRef, useCallback, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
	EffectComposer,
	Bloom,
	Noise,
	Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import FinalArtifacts, {
	ARTIFACTS,
	type ArtifactMeta,
	type ProcessionSlot,
} from './FinalArtifacts';

interface RelicGalleryProps {
	/** Speed multiplier applied to motion (default: 1) */
	speed?: number;
	/** Spacing between artifacts along Z in world units (default: 6) */
	zSpacing?: number;
	className?: string;
	style?: React.CSSProperties;
}

const FAR = -100; // procession reset depth
const NEAR = 8; // past-camera cull depth
const ARCH_FAR = -78;
const ARCH_NEAR = 12;
const BAY_SPACING = 8;

type Slot = ProcessionSlot;

type BeamConfig = {
	id: string;
	source: [number, number, number];
	target: [number, number, number];
	width: number;
	opacity: number;
	pool: [number, number];
	poolOpacity: number;
	color: string;
	intensity: number;
	angle: number;
};

type InstanceSpec = {
	position: [number, number, number];
	rotation?: [number, number, number];
	scale?: [number, number, number];
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

function makeBeamTexture() {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	canvas.width = 96;
	canvas.height = 384;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const image = ctx.createImageData(canvas.width, canvas.height);
	for (let y = 0; y < canvas.height; y += 1) {
		const v = y / (canvas.height - 1);
		const lengthFade = Math.pow(Math.sin(v * Math.PI), 0.6);
		for (let x = 0; x < canvas.width; x += 1) {
			const u = Math.abs((x / (canvas.width - 1)) * 2 - 1);
			const feather = Math.exp(-u * u * 3.9);
			const core = Math.exp(-u * u * 18) * 0.08;
			const dust = ((x * 17 + y * 31) % 23 === 0 ? 0.12 : 0) * feather;
			const alpha = Math.min(255, (feather * 0.58 + core + dust) * lengthFade * 255);
			const i = (y * canvas.width + x) * 4;
			image.data[i] = alpha;
			image.data[i + 1] = alpha;
			image.data[i + 2] = alpha;
			image.data[i + 3] = alpha;
		}
	}
	ctx.putImageData(image, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.needsUpdate = true;
	return texture;
}

function makePoolTexture() {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	canvas.width = 192;
	canvas.height = 192;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const gradient = ctx.createRadialGradient(96, 96, 0, 96, 96, 96);
	gradient.addColorStop(0, 'rgba(210, 210, 210, 0.74)');
	gradient.addColorStop(0.42, 'rgba(70, 70, 70, 0.25)');
	gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.needsUpdate = true;
	return texture;
}

function makeFogTexture() {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
	gradient.addColorStop(0, 'rgba(180, 180, 180, 0.5)');
	gradient.addColorStop(0.48, 'rgba(92, 92, 92, 0.22)');
	gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.needsUpdate = true;
	return texture;
}

function InstancedMeshes({
	geometry,
	material,
	instances,
	castShadow = false,
	receiveShadow = false,
}: {
	geometry: THREE.BufferGeometry;
	material: THREE.Material;
	instances: InstanceSpec[];
	castShadow?: boolean;
	receiveShadow?: boolean;
}) {
	const ref = useRef<THREE.InstancedMesh>(null);

	useLayoutEffect(() => {
		const mesh = ref.current;
		if (!mesh) return;

		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const rotation = new THREE.Euler();
		const scale = new THREE.Vector3();

		instances.forEach((instance, i) => {
			position.set(...instance.position);
			rotation.set(...(instance.rotation ?? [0, 0, 0]));
			quaternion.setFromEuler(rotation);
			scale.set(...(instance.scale ?? [1, 1, 1]));
			matrix.compose(position, quaternion, scale);
			mesh.setMatrixAt(i, matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
		mesh.computeBoundingSphere();
	}, [instances]);

	if (instances.length === 0) return null;

	return (
		<instancedMesh
			ref={ref}
			args={[geometry, material, instances.length]}
			castShadow={castShadow}
			receiveShadow={receiveShadow}
		/>
	);
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
	const naveInstances = useMemo(() => {
		const mainColumns: InstanceSpec[] = [];
		const capitals: InstanceSpec[] = [];
		const sideColumns: InstanceSpec[] = [];
		const stoneArches: InstanceSpec[] = [];
		const bronzeArches: InstanceSpec[] = [];
		const warmHighlights: InstanceSpec[] = [];
		const coolHighlights: InstanceSpec[] = [];
		const sideArches: InstanceSpec[] = [];
		const ribs: InstanceSpec[] = [];

		bayDepths.forEach((z, i) => {
			[-1, 1].forEach((side) => {
				mainColumns.push({
					position: [side * 4.35, 1.35, z],
				});
				capitals.push({
					position: [side * 4.35, 5.12, z],
				});
				sideColumns.push({
					position: [side * 6.35, 0.75, z],
					scale: [0.58, 0.78, 0.58],
				});
				sideArches.push({
					position: [side * 6.1, -1.25, z],
					scale: [1, 1, 0.8],
				});
			});

			const arch = {
				position: [0, -1.95, z] as [number, number, number],
			};
			if (i % 3 === 0) bronzeArches.push(arch);
			else stoneArches.push(arch);

			const highlight = {
				position: [0, -1.92, z + 0.02] as [number, number, number],
				scale: [0.985, 0.985, 1] as [number, number, number],
			};
			if (i % 2 === 0) warmHighlights.push(highlight);
			else coolHighlights.push(highlight);

			ribs.push({
				position: [0, -1.05, z],
			});
		});

		return {
			mainColumns,
			capitals,
			sideColumns,
			stoneArches,
			bronzeArches,
			warmHighlights,
			coolHighlights,
			sideArches,
			ribs,
		};
	}, [bayDepths]);

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
				color: '#030302',
				roughness: 0.82,
				metalness: 0.16,
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
					<meshBasicMaterial color="#b88745" transparent opacity={0.032} />
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
					opacity={0.16}
					sizeAttenuation
					depthWrite={false}
				/>
			</points>

			<group ref={nave}>
				<InstancedMeshes
					geometry={columnGeometry}
					material={stone}
					instances={naveInstances.mainColumns}
					castShadow
					receiveShadow
				/>
				<InstancedMeshes
					geometry={columnCapitalGeometry}
					material={stoneEdge}
					instances={naveInstances.capitals}
					castShadow
				/>
				<InstancedMeshes
					geometry={columnGeometry}
					material={stone}
					instances={naveInstances.sideColumns}
					castShadow
					receiveShadow
				/>
				<InstancedMeshes
					geometry={archGeometry}
					material={stoneEdge}
					instances={naveInstances.stoneArches}
					castShadow
				/>
				<InstancedMeshes
					geometry={archGeometry}
					material={bronze}
					instances={naveInstances.bronzeArches}
					castShadow
				/>
				<InstancedMeshes
					geometry={archGeometry}
					material={archHighlight}
					instances={naveInstances.warmHighlights}
				/>
				<InstancedMeshes
					geometry={archGeometry}
					material={coolEdge}
					instances={naveInstances.coolHighlights}
				/>
				<InstancedMeshes
					geometry={sideArchGeometry}
					material={stone}
					instances={naveInstances.sideArches}
					castShadow
				/>
				<InstancedMeshes
					geometry={ribGeometry}
					material={stoneEdge}
					instances={naveInstances.ribs}
					castShadow
				/>
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

function GlobalCathedralFog() {
	const mist = useRef<THREE.Points>(null);
	const fogTexture = useMemo(() => makeFogTexture(), []);
	const mistGeometry = useMemo(() => {
		const count = 1500;
		const positions = new Float32Array(count * 3);
		for (let i = 0; i < count; i += 1) {
			const depth = Math.random();
			positions[i * 3] = (Math.random() - 0.5) * 13.5;
			positions[i * 3 + 1] = -1.7 + Math.random() * 8.2;
			positions[i * 3 + 2] = -14 - depth * depth * 62;
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return geometry;
	}, []);

	useFrame((state) => {
		if (!mist.current) return;
		mist.current.position.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.18;
		mist.current.position.y = Math.cos(state.clock.elapsedTime * 0.06) * 0.08;
	});

	return (
		<points ref={mist} geometry={mistGeometry}>
			<pointsMaterial
				color="#9f876b"
				alphaMap={fogTexture ?? undefined}
				size={0.34}
				transparent
				opacity={0.022}
				sizeAttenuation
				depthWrite={false}
				depthTest
				blending={THREE.AdditiveBlending}
			/>
		</points>
	);
}

function VolumetricBeam({
	beam,
	beamTexture,
	poolTexture,
}: {
	beam: BeamConfig;
	beamTexture: THREE.Texture | null;
	poolTexture: THREE.Texture | null;
}) {
	const { position, quaternion, length, dustGeometry } = useMemo(() => {
		const source = new THREE.Vector3(...beam.source);
		const target = new THREE.Vector3(...beam.target);
		const direction = target.clone().sub(source);
		const beamLength = direction.length();
		const q = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			direction.clone().normalize()
		);
		const positions = new Float32Array(28 * 3);
		const side = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
		const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
		for (let i = 0; i < 28; i += 1) {
			const t = (i + 0.5) / 28;
			const center = source.clone().lerp(target, t);
			const radius = beam.width * (0.16 + Math.sin(t * Math.PI) * 0.34);
			center.add(side.clone().multiplyScalar((Math.random() - 0.5) * radius));
			center.add(normal.clone().multiplyScalar((Math.random() - 0.5) * radius));
			positions[i * 3] = center.x;
			positions[i * 3 + 1] = center.y;
			positions[i * 3 + 2] = center.z;
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		return {
			position: source.clone().lerp(target, 0.5),
			quaternion: q,
			length: beamLength,
			dustGeometry: geometry,
		};
	}, [beam]);

	return (
		<group>
			{beam.opacity > 0.005 && (
				<>
					<group position={position} quaternion={quaternion}>
						{[0, Math.PI / 2].map((rotation) => (
							<mesh key={rotation} rotation={[0, rotation, 0]}>
								<planeGeometry args={[beam.width, length]} />
								<meshBasicMaterial
									color={beam.color}
									alphaMap={beamTexture ?? undefined}
									transparent
									opacity={beam.opacity}
									depthWrite={false}
									depthTest
									side={THREE.DoubleSide}
									blending={THREE.AdditiveBlending}
								/>
							</mesh>
						))}
					</group>
					<points geometry={dustGeometry}>
						<pointsMaterial
							color="#d9b47b"
							size={0.025}
							transparent
							opacity={0.12}
							sizeAttenuation
							depthWrite={false}
							blending={THREE.AdditiveBlending}
						/>
					</points>
				</>
			)}
			<mesh
				position={[beam.target[0], -2.322, beam.target[2]]}
				rotation={[-Math.PI / 2, 0, beam.target[0] * 0.12]}
				scale={[beam.pool[0], beam.pool[1], 1]}
			>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial
					color={beam.color}
					alphaMap={poolTexture ?? undefined}
					transparent
					opacity={beam.poolOpacity}
					depthWrite={false}
					blending={THREE.AdditiveBlending}
				/>
			</mesh>
		</group>
	);
}

function CathedralLightRig() {
	const beamTexture = useMemo(() => makeBeamTexture(), []);
	const poolTexture = useMemo(() => makePoolTexture(), []);
	const beams = useMemo<BeamConfig[]>(
		() => [
			{
				id: 'near-left',
				source: [-5.9, 7.95, -5.5],
				target: [-0.55, -2.18, -10.5],
				width: 0.68,
				opacity: 0.032,
				pool: [1.75, 0.85],
				poolOpacity: 0.09,
				color: '#b88745',
				intensity: 12,
				angle: 0.09,
			},
			{
				id: 'center-high',
				source: [1.25, 8.55, -14],
				target: [0.18, -2.2, -16.5],
				width: 0.72,
				opacity: 0,
				pool: [1.35, 0.72],
				poolOpacity: 0.076,
				color: '#c79a5a',
				intensity: 10,
				angle: 0.085,
			},
			{
				id: 'right-mid',
				source: [5.7, 7.65, -23.5],
				target: [0.72, -2.2, -25.5],
				width: 0.6,
				opacity: 0.024,
				pool: [1.55, 0.78],
				poolOpacity: 0.068,
				color: '#b88745',
				intensity: 9,
				angle: 0.09,
			},
			{
				id: 'far-left',
				source: [-5.4, 7.5, -38.5],
				target: [-0.38, -2.2, -42],
				width: 0.5,
				opacity: 0.02,
				pool: [1.2, 0.58],
				poolOpacity: 0.052,
				color: '#c79a5a',
				intensity: 7,
				angle: 0.08,
			},
		],
		[]
	);

	return (
		<group>
			{beams.map((beam) => (
				<VolumetricBeam
					key={beam.id}
					beam={beam}
					beamTexture={beamTexture}
					poolTexture={poolTexture}
				/>
			))}

			{/* High architectural light, as if entering through clerestory openings. */}
			{beams.map((beam, i) => (
				<spotLight
					key={`${beam.id}-spot`}
					position={beam.source}
					target-position={beam.target}
					angle={beam.angle}
					penumbra={0.86}
					intensity={beam.intensity}
					distance={24 + i * 3}
					color={beam.color}
					castShadow={i < 2}
					shadow-mapSize-width={1024}
					shadow-mapSize-height={1024}
					shadow-bias={-0.00035}
				/>
			))}
			<directionalLight
				position={[-5.5, 3.8, -34]}
				intensity={0.28}
				color="#7c91aa"
			/>
			<directionalLight
				position={[5.2, 2.6, -18]}
				intensity={0.24}
				color="#5f748c"
			/>
			<pointLight
				position={[0, -0.8, -14]}
				intensity={0.8}
				distance={8}
				color="#7a5330"
			/>
		</group>
	);
}

function CaptionPanel({
	selected,
	onClose,
}: {
	selected: ArtifactMeta | null;
	onClose: () => void;
}) {
	if (!selected) return null;

	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			<div className="pointer-events-auto absolute right-5 top-24 w-[min(340px,calc(100vw-40px))] border border-white/12 bg-black/48 px-4 py-3 text-white shadow-2xl backdrop-blur-md md:right-8 md:top-28">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="font-serif text-lg leading-tight text-white/95">
							{selected.name}
						</p>
						<p className="mt-2 text-sm leading-snug text-white/78">
							{selected.text}
						</p>
					</div>
					<button
						type="button"
						aria-label="Close caption"
						className="grid h-7 w-7 shrink-0 place-items-center border border-white/15 text-white/65 transition hover:border-white/35 hover:text-white"
						onClick={onClose}
					>
						×
					</button>
				</div>
			</div>
		</div>
	);
}

function GalleryScene({
	speed = 1,
	zSpacing = 6,
	selected,
	onSelect,
}: RelicGalleryProps & {
	selected: ArtifactMeta | null;
	onSelect: (artifact: ArtifactMeta) => void;
}) {
	const velocity = useRef(0);
	const autoPlay = useRef(true);
	const lastInteraction = useRef(Date.now());
	const { camera, gl } = useThree();

	const count = ARTIFACTS.length;

	// Fixed offsets keep the five symbolic artifacts in a deliberate procession.
	const offsets = useMemo(
		() =>
			Array.from({ length: count }, (_, i) => {
				const procession = [
					{ x: 0, y: 0.42, scale: 1.08 },
					{ x: -1.05, y: -0.04, scale: 0.92 },
					{ x: 1.05, y: 0.1, scale: 0.98 },
					{ x: 0, y: -0.52, scale: 0.96 },
					{ x: 0.68, y: 0.72, scale: 0.86 },
				];
				const p = procession[i % procession.length];
				return {
					x: p.x,
					y: p.y,
					spin: (i / count) * Math.PI * 2,
					spinSpeed: 0.075 + (i % 5) * 0.018,
					wobblePhase: i * 1.37,
					scale: p.scale,
				};
			}),
		[count]
	);

	const slots = useRef<Slot[]>(
		Array.from({ length: count }, (_, i) => ({
			id: i,
			artifactIndex: i,
			z: -24 - i * zSpacing,
			x: offsets[i].x,
			y: offsets[i].y,
			spin: offsets[i].spin,
			spinSpeed: offsets[i].spinSpeed,
			wobblePhase: offsets[i].wobblePhase,
			scale: offsets[i].scale,
		}))
	);

	const totalDepth = count * zSpacing;

	useEffect(() => {
		const canvas = gl.domElement;
		const handleCanvasClick = () => {
			const dominant = slots.current
				.filter((slot) => slot.z > FAR + 8 && slot.z < NEAR - 1)
				.sort((a, b) => b.z - a.z)[0];
			if (dominant) onSelect(ARTIFACTS[dominant.artifactIndex]);
		};
		canvas.addEventListener('click', handleCanvasClick);
		return () => canvas.removeEventListener('click', handleCanvasClick);
	}, [gl, onSelect]);

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
			<fogExp2 attach="fog" args={['#211c17', 0.038]} />

			{/* Near-black fill so the cathedral stays mostly in shadow */}
			<ambientLight intensity={0.12} />

			<CathedralArchitecture />
			<GlobalCathedralFog />
			<CathedralLightRig />

			{/* Low-intensity architectural fill; the beams carry the real exposure. */}
			<spotLight
				position={[-4.6, 6.8, -8]}
				angle={0.36}
				penumbra={1}
				intensity={22}
				distance={34}
				color={'#b88745'}
			/>
			<spotLight
				position={[4.8, 6.4, -20]}
				target-position={[0, 0.5, -18]}
				angle={0.22}
				penumbra={1}
				intensity={14}
				distance={36}
				color={'#c79d66'}
			/>

			{/* Cool, low rim light from back-right to catch edges */}
			<directionalLight
				position={[6, 3, -28]}
				intensity={1.65}
				color={'#7b8ca0'}
			/>

			{/* Faint warm bounce to keep shadow cores from going fully black */}
			<pointLight
				position={[0, -3, 2]}
				intensity={3.6}
				distance={9}
				color={'#5a3f28'}
			/>
			<pointLight
				position={[0, 1.2, -18]}
				intensity={5.5}
				distance={38}
				color={'#6d5136'}
			/>

			<FinalArtifacts
				slots={slots.current}
				selected={selected}
				onSelect={onSelect}
				far={FAR}
				near={NEAR}
			/>

			<EffectComposer>
				<Bloom
					intensity={0.28}
					luminanceThreshold={1.05}
					luminanceSmoothing={0.08}
					mipmapBlur
				/>
				<Noise opacity={0.025} />
				<Vignette eskil={false} offset={0.15} darkness={0.58} />
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
	const [selected, setSelected] = useState<ArtifactMeta | null>(null);

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
				aria-label="A procession of five symbolic artifacts drifting through a dark cathedral"
			/>
		);
	}

	return (
		<div className={className} style={style}>
			<div className="artifact-procession-canvas relative h-full w-full">
			<Canvas
				shadows
				camera={{ position: [0, 0, 0], fov: 55 }}
				style={{ width: '100%', height: '100%' }}
				gl={{
					antialias: true,
					alpha: false,
					stencil: false,
					depth: true,
					powerPreference: 'high-performance',
					toneMapping: THREE.ACESFilmicToneMapping,
					toneMappingExposure: 1.48,
				}}
				onCreated={({ gl }) => {
					gl.shadowMap.type = THREE.PCFSoftShadowMap;
				}}
				dpr={[1, 1.5]}
			>
				<GalleryScene
					speed={speed}
					zSpacing={zSpacing}
					selected={selected}
					onSelect={setSelected}
				/>
			</Canvas>
			<CaptionPanel selected={selected} onClose={() => setSelected(null)} />
			</div>
		</div>
	);
}
