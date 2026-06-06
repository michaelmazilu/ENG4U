'use client';

import { type ReactElement, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Shared sacred-relic palette.
 * bone white, warm gold, deep charcoal, muted bronze, soft pearl,
 * smoked glass, faint amber glow.
 */
export const PALETTE = {
	bone: '#e9e2d2',
	pearl: '#f1ece2',
	ivory: '#ded5c0',
	gold: '#c9a24b',
	amber: '#e0a449',
	bronze: '#8a6a3f',
	charcoal: '#1c1a18',
	graphite: '#2b2b2e',
	gunmetal: '#3a3c40',
	sand: '#cdbfa3',
	clay: '#bcae90',
	limestone: '#cbc3b2',
	smoke: '#9aa0a6',
} as const;

/* -------------------------------------------------------------------------- */
/*  Shared material helpers                                                    */
/* -------------------------------------------------------------------------- */

function matteMaterial(color: string, roughness = 0.95) {
	return (
		<meshStandardMaterial
			color={color}
			roughness={roughness}
			metalness={0.02}
		/>
	);
}

function metalMaterial(color: string, roughness = 0.5, metalness = 0.85) {
	return (
		<meshStandardMaterial
			color={color}
			roughness={roughness}
			metalness={metalness}
		/>
	);
}

function emissiveMaterial(color: string, intensity = 1.4) {
	return (
		<meshStandardMaterial
			color={color}
			emissive={color}
			emissiveIntensity={intensity}
			roughness={0.4}
			metalness={0}
			toneMapped={false}
		/>
	);
}

/* Rounded-box geometry factory (cached per-args via useMemo at call site). */
function useRoundedBox(
	width: number,
	height: number,
	depth: number,
	radius = 0.04,
	segments = 3
) {
	return useMemo(() => {
		// Approximate a rounded box with an extruded rounded rectangle.
		const w = width - radius * 2;
		const h = height - radius * 2;
		const shape = new THREE.Shape();
		shape.moveTo(-w / 2, -h / 2 - radius);
		shape.lineTo(w / 2, -h / 2 - radius);
		shape.quadraticCurveTo(
			w / 2 + radius,
			-h / 2 - radius,
			w / 2 + radius,
			-h / 2
		);
		shape.lineTo(w / 2 + radius, h / 2);
		shape.quadraticCurveTo(w / 2 + radius, h / 2 + radius, w / 2, h / 2 + radius);
		shape.lineTo(-w / 2, h / 2 + radius);
		shape.quadraticCurveTo(
			-w / 2 - radius,
			h / 2 + radius,
			-w / 2 - radius,
			h / 2
		);
		shape.lineTo(-w / 2 - radius, -h / 2);
		shape.quadraticCurveTo(
			-w / 2 - radius,
			-h / 2 - radius,
			-w / 2,
			-h / 2 - radius
		);
		const geo = new THREE.ExtrudeGeometry(shape, {
			depth: depth - radius * 2,
			bevelEnabled: true,
			bevelThickness: radius,
			bevelSize: radius,
			bevelSegments: segments,
			steps: 1,
		});
		geo.center();
		geo.computeVertexNormals();
		return geo;
	}, [width, height, depth, radius, segments]);
}

export type RelicProps = {
	/** 0..1 progress through the depth tunnel, 0 = far, 1 = at camera. */
	progress?: number;
};

/* -------------------------------------------------------------------------- */
/*  1. Hollow Halo Stone                                                       */
/* -------------------------------------------------------------------------- */
export function HollowHaloStone(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	useFrame((s, d) => {
		if (!g.current) return;
		g.current.rotation.y += d * 0.35;
		g.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.6) * 0.05;
	});
	return (
		<group ref={g}>
			<mesh scale={[1, 1, 0.7]} castShadow receiveShadow>
				<torusGeometry args={[1.1, 0.25, 24, 80]} />
				{matteMaterial(PALETTE.ivory, 0.9)}
			</mesh>
			{/* fracture inset with faint gold glow */}
			<mesh position={[0.78, 0.78, 0]} rotation={[0, 0, -0.78]}>
				<boxGeometry args={[0.07, 0.5, 0.5]} />
				{emissiveMaterial(PALETTE.gold, 0.8)}
			</mesh>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  2. Veiled Obelisk                                                          */
/* -------------------------------------------------------------------------- */
export function VeiledObelisk(_: RelicProps) {
	const veil = useRef<THREE.Group>(null);
	useFrame((_s, d) => {
		if (veil.current) veil.current.rotation.y += d * 0.5;
	});
	return (
		<group>
			{/* shaft */}
			<mesh position={[0, -0.2, 0]} castShadow>
				<boxGeometry args={[0.45, 2.4, 0.35]} />
				{matteMaterial(PALETTE.charcoal, 0.7)}
			</mesh>
			{/* pointed cap */}
			<mesh position={[0, 1.3, 0]} castShadow>
				<coneGeometry args={[0.32, 0.6, 4]} />
				{matteMaterial(PALETTE.charcoal, 0.7)}
			</mesh>
			{/* veil */}
			<group ref={veil}>
				<mesh>
					<torusKnotGeometry args={[0.45, 0.06, 120, 12, 2, 3]} />
					<meshPhysicalMaterial
						color={PALETTE.pearl}
						transparent
						opacity={0.22}
						roughness={0.1}
						transmission={0.6}
						thickness={0.4}
						side={THREE.DoubleSide}
					/>
				</mesh>
			</group>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  3. Suspended Offering Bowl                                                 */
/* -------------------------------------------------------------------------- */
export function SuspendedOfferingBowl(_: RelicProps) {
	const bowl = useRef<THREE.Group>(null);
	const drop = useRef<THREE.Mesh>(null);
	useFrame((s, d) => {
		if (bowl.current) bowl.current.rotation.y += d * 0.4;
		if (drop.current) {
			drop.current.position.y =
				-0.55 + Math.sin(s.clock.elapsedTime * 1.2) * 0.06;
		}
	});
	return (
		<group>
			<group ref={bowl}>
				{/* upside-down shallow hemisphere */}
				<mesh rotation={[Math.PI, 0, 0]} castShadow>
					<sphereGeometry
						args={[0.8, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.4]}
					/>
					<meshStandardMaterial
						color={PALETTE.bronze}
						roughness={0.55}
						metalness={0.8}
						side={THREE.DoubleSide}
					/>
				</mesh>
			</group>
			<mesh ref={drop} position={[0, -0.55, 0]} scale={[1, 1.6, 1]}>
				<sphereGeometry args={[0.1, 24, 24]} />
				{emissiveMaterial(PALETTE.amber, 1.8)}
			</mesh>
			<pointLight position={[0, -0.55, 0]} color={PALETTE.amber} intensity={3} distance={2} />
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  4. Twin Tablets                                                            */
/* -------------------------------------------------------------------------- */
export function TwinTablets(_: RelicProps) {
	const left = useRef<THREE.Mesh>(null);
	const right = useRef<THREE.Mesh>(null);
	const geo = useRoundedBox(0.65, 1.5, 0.08, 0.05);
	useFrame((s) => {
		const sep = 0.12 + (Math.sin(s.clock.elapsedTime * 0.7) + 1) * 0.05;
		if (left.current) left.current.position.x = -sep;
		if (right.current) right.current.position.x = sep;
	});
	return (
		<group>
			<mesh ref={left} geometry={geo} position={[-0.18, 0, 0]} castShadow>
				{matteMaterial(PALETTE.sand, 0.95)}
			</mesh>
			<mesh ref={right} geometry={geo} position={[0.18, 0, 0]} castShadow>
				{matteMaterial(PALETTE.clay, 0.95)}
			</mesh>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  5. The Unlit Crown                                                         */
/* -------------------------------------------------------------------------- */
export function UnlitCrown(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	useFrame((s, d) => {
		if (!g.current) return;
		g.current.rotation.y += d * 0.45;
		g.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.5) * 0.08;
	});
	const pillars = useMemo(
		() => Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2),
		[]
	);
	return (
		<group ref={g}>
			<mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
				<torusGeometry args={[0.7, 0.07, 20, 60]} />
				{metalMaterial(PALETTE.gunmetal, 0.45, 0.9)}
			</mesh>
			{pillars.map((a, i) => (
				<mesh
					key={i}
					position={[Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7]}
					castShadow
				>
					<boxGeometry args={[0.15, 0.55, 0.15]} />
					{metalMaterial(PALETTE.graphite, 0.4, 0.9)}
				</mesh>
			))}
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  6. Glass Reliquary Cube                                                    */
/* -------------------------------------------------------------------------- */
export function GlassReliquaryCube(_: RelicProps) {
	const shard = useRef<THREE.Mesh>(null);
	useFrame((_s, d) => {
		if (shard.current) {
			shard.current.rotation.y += d * 0.6;
			shard.current.rotation.x += d * 0.2;
		}
	});
	return (
		<group>
			<mesh castShadow>
				<boxGeometry args={[1, 1, 1]} />
				<meshPhysicalMaterial
					transparent
					transmission={0.9}
					thickness={0.6}
					roughness={0.05}
					ior={1.5}
					opacity={0.4}
					color={PALETTE.pearl}
				/>
			</mesh>
			<mesh ref={shard} scale={[0.35, 0.55, 0.35]}>
				<octahedronGeometry args={[1, 0]} />
				{emissiveMaterial(PALETTE.amber, 1.2)}
			</mesh>
			<pointLight color={PALETTE.amber} intensity={2} distance={2.5} />
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  7. Broken Sun Disc                                                         */
/* -------------------------------------------------------------------------- */
export function BrokenSunDisc(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	const frags = useRef<THREE.Group>(null);
	const discGeo = useMemo(() => {
		const shape = new THREE.Shape();
		const r = 0.9;
		const start = THREE.MathUtils.degToRad(25);
		const end = THREE.MathUtils.degToRad(335);
		shape.moveTo(0, 0);
		shape.absarc(0, 0, r, start, end, false);
		shape.lineTo(0, 0);
		const geo = new THREE.ExtrudeGeometry(shape, {
			depth: 0.08,
			bevelEnabled: true,
			bevelThickness: 0.02,
			bevelSize: 0.02,
			bevelSegments: 1,
		});
		geo.center();
		return geo;
	}, []);
	useFrame((_s, d) => {
		if (g.current) g.current.rotation.z += d * 0.25;
		if (frags.current) frags.current.rotation.z -= d * 0.15;
	});
	const chips = useMemo(
		() =>
			Array.from({ length: 5 }, (_, i) => ({
				a: THREE.MathUtils.degToRad(-30 + i * 15),
				r: 1.15 + (i % 2) * 0.2,
				s: 0.1 + (i % 3) * 0.03,
			})),
		[]
	);
	return (
		<group>
			<group ref={g}>
				<mesh geometry={discGeo} castShadow>
					{matteMaterial(PALETTE.gold, 0.7)}
				</mesh>
			</group>
			<group ref={frags}>
				{chips.map((c, i) => (
					<mesh
						key={i}
						position={[Math.cos(c.a) * c.r, Math.sin(c.a) * c.r, 0]}
						rotation={[0, 0, c.a]}
					>
						<tetrahedronGeometry args={[c.s, 0]} />
						{matteMaterial(PALETTE.bronze, 0.7)}
					</mesh>
				))}
			</group>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  8. Silent Bell Form                                                        */
/* -------------------------------------------------------------------------- */
export function SilentBellForm(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	const bellGeo = useMemo(() => {
		const pts: THREE.Vector2[] = [];
		// bell profile: wide flared base -> narrow top
		pts.push(new THREE.Vector2(0.0, -0.75));
		pts.push(new THREE.Vector2(0.5, -0.75));
		pts.push(new THREE.Vector2(0.48, -0.55));
		pts.push(new THREE.Vector2(0.34, -0.2));
		pts.push(new THREE.Vector2(0.26, 0.2));
		pts.push(new THREE.Vector2(0.2, 0.55));
		pts.push(new THREE.Vector2(0.18, 0.75));
		return new THREE.LatheGeometry(pts, 64);
	}, []);
	useFrame((s) => {
		if (g.current)
			g.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.9) * 0.1;
	});
	return (
		<group ref={g}>
			<mesh geometry={bellGeo} castShadow>
				<meshStandardMaterial
					color={PALETTE.bone}
					roughness={0.85}
					metalness={0.05}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{/* dark interior cap */}
			<mesh position={[0, 0.74, 0]}>
				<circleGeometry args={[0.18, 32]} />
				{matteMaterial(PALETTE.charcoal, 1)}
			</mesh>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  9. Floating Threshold Frame                                                */
/* -------------------------------------------------------------------------- */
export function FloatingThresholdFrame(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	useFrame((s) => {
		if (g.current)
			g.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.4) * 0.12;
	});
	const t = 0.18;
	return (
		<group ref={g}>
			<mesh position={[-0.6, -0.1, 0]} castShadow>
				<boxGeometry args={[t, 2.4, t]} />
				{matteMaterial(PALETTE.limestone, 0.9)}
			</mesh>
			<mesh position={[0.6, -0.1, 0]} castShadow>
				<boxGeometry args={[t, 2.4, t]} />
				{matteMaterial(PALETTE.limestone, 0.9)}
			</mesh>
			<mesh position={[0, 1.1, 0]} castShadow>
				<boxGeometry args={[1.38, t, t]} />
				{matteMaterial(PALETTE.limestone, 0.9)}
			</mesh>
			{/* faint portal glow at the back edge */}
			<mesh position={[0, 0.1, -0.12]}>
				<planeGeometry args={[1.1, 2.1]} />
				<meshBasicMaterial
					color={PALETTE.amber}
					transparent
					opacity={0.08}
					side={THREE.DoubleSide}
				/>
			</mesh>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  10. Threaded Idol                                                          */
/* -------------------------------------------------------------------------- */
export function ThreadedIdol(_: RelicProps) {
	const cords = useRef<THREE.Group>(null);
	const cordGeo = useMemo(() => {
		const points = Array.from({ length: 200 }, (_, i) => {
			const t = i / 199;
			const angle = t * Math.PI * 8;
			const y = -0.55 + t * 1.1;
			const r = 0.26 + Math.sin(t * Math.PI) * 0.05;
			return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
		});
		const path = new THREE.CatmullRomCurve3(points);
		return new THREE.TubeGeometry(path, 200, 0.025, 8, false);
	}, []);
	useFrame((_s, d) => {
		if (cords.current) cords.current.rotation.y += d * 0.5;
	});
	return (
		<group>
			<mesh castShadow>
				<capsuleGeometry args={[0.22, 0.7, 8, 24]} />
				{matteMaterial(PALETTE.pearl, 0.5)}
			</mesh>
			<group ref={cords}>
				<mesh geometry={cordGeo}>
					<meshStandardMaterial
						color={PALETTE.charcoal}
						roughness={0.5}
						metalness={0.1}
					/>
				</mesh>
			</group>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  11. Inverted Stair Relic                                                   */
/* -------------------------------------------------------------------------- */
export function InvertedStairRelic(_: RelicProps) {
	const g = useRef<THREE.Group>(null);
	useFrame((_s, d) => {
		if (g.current) g.current.rotation.x += d * 0.4;
	});
	const steps = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
	return (
		<group ref={g} rotation={[Math.PI, 0, 0]}>
			{steps.map((i) => (
				<mesh
					key={i}
					position={[0, -0.35 + i * 0.1, -0.6 + i * 0.18]}
					castShadow
					receiveShadow
				>
					<boxGeometry args={[1.0, 0.1, 1.2 - i * 0.16]} />
					{matteMaterial(PALETTE.limestone, 0.9)}
				</mesh>
			))}
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  12. Sealed Vessel                                                          */
/* -------------------------------------------------------------------------- */
export function SealedVessel({ progress = 0 }: RelicProps) {
	const seam = useRef<THREE.Mesh>(null);
	const g = useRef<THREE.Group>(null);
	const vesselGeo = useMemo(() => {
		const pts: THREE.Vector2[] = [
			new THREE.Vector2(0.0, -0.85),
			new THREE.Vector2(0.3, -0.85),
			new THREE.Vector2(0.37, -0.5),
			new THREE.Vector2(0.37, 0.0),
			new THREE.Vector2(0.28, 0.45),
			new THREE.Vector2(0.16, 0.7),
			new THREE.Vector2(0.15, 0.85),
		];
		return new THREE.LatheGeometry(pts, 64);
	}, []);
	useFrame((_s, d) => {
		if (g.current) g.current.rotation.y += d * 0.4;
		if (seam.current) {
			const mat = seam.current.material as THREE.MeshStandardMaterial;
			// single pulse as it approaches the camera
			const pulse = THREE.MathUtils.clamp((progress - 0.6) / 0.3, 0, 1);
			mat.emissiveIntensity = 0.6 + pulse * 2.2;
		}
	});
	return (
		<group ref={g}>
			<mesh geometry={vesselGeo} castShadow>
				<meshStandardMaterial
					color={PALETTE.bone}
					roughness={0.9}
					metalness={0.02}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{/* seam glow */}
			<mesh ref={seam} position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.16, 0.02, 12, 40]} />
				{emissiveMaterial(PALETTE.amber, 0.8)}
			</mesh>
			{/* black lid */}
			<mesh position={[0, 0.78, 0]}>
				<cylinderGeometry args={[0.17, 0.17, 0.06, 32]} />
				<meshStandardMaterial
					color={PALETTE.charcoal}
					roughness={0.3}
					metalness={0.2}
				/>
			</mesh>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  13. Orbiting Ash Ring (instanced)                                          */
/* -------------------------------------------------------------------------- */
export function OrbitingAshRing(_: RelicProps) {
	const mesh = useRef<THREE.InstancedMesh>(null);
	const COUNT = 44;
	const dummy = useMemo(() => new THREE.Object3D(), []);
	const frags = useMemo(
		() =>
			Array.from({ length: COUNT }, (_, i) => ({
				angle: (i / COUNT) * Math.PI * 2,
				radius: 0.8 + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.12,
				speed: 0.2 + (Math.sin(i * 4.21) * 0.5 + 0.5) * 0.5,
				size: 0.04 + (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.08,
				gold: i % 7 === 0,
			})),
		[]
	);
	useFrame((s) => {
		if (!mesh.current) return;
		const t = s.clock.elapsedTime;
		frags.forEach((f, i) => {
			const a = f.angle + t * f.speed * 0.4;
			dummy.position.set(
				Math.cos(a) * f.radius,
				Math.sin(a * 2) * 0.06,
				Math.sin(a) * f.radius
			);
			dummy.rotation.set(a, a * 1.5, 0);
			dummy.scale.setScalar(f.size / 0.08);
			dummy.updateMatrix();
			mesh.current!.setMatrixAt(i, dummy.matrix);
		});
		mesh.current.instanceMatrix.needsUpdate = true;
	});
	return (
		<group>
			<instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} castShadow>
				<boxGeometry args={[0.08, 0.08, 0.08]} />
				<meshStandardMaterial color={PALETTE.charcoal} roughness={0.85} />
			</instancedMesh>
			{/* a few gold accent fragments */}
			{frags
				.filter((f) => f.gold)
				.map((f, i) => (
					<mesh
						key={i}
						position={[Math.cos(f.angle) * f.radius, 0, Math.sin(f.angle) * f.radius]}
					>
						<boxGeometry args={[0.07, 0.07, 0.07]} />
						{emissiveMaterial(PALETTE.gold, 0.5)}
					</mesh>
				))}
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  14. Soft Prism Lantern                                                     */
/* -------------------------------------------------------------------------- */
export function SoftPrismLantern(_: RelicProps) {
	const prism = useRef<THREE.Mesh>(null);
	const cage = useRef<THREE.Group>(null);
	useFrame((_s, d) => {
		if (prism.current) prism.current.rotation.y += d * 0.5;
		if (cage.current) cage.current.rotation.y -= d * 0.4;
	});
	const edges = useMemo(() => {
		const w = 0.4;
		const h = 0.65;
		const pos: [number, number, number][] = [
			[w, 0, w],
			[-w, 0, w],
			[w, 0, -w],
			[-w, 0, -w],
		];
		return { pos, h };
	}, []);
	return (
		<group>
			<mesh ref={prism} scale={[0.45, 1, 0.45]}>
				<octahedronGeometry args={[0.55, 0]} />
				{emissiveMaterial(PALETTE.pearl, 1.1)}
			</mesh>
			<pointLight color={PALETTE.amber} intensity={1.6} distance={2.2} />
			<group ref={cage}>
				{edges.pos.map((p, i) => (
					<mesh key={i} position={[p[0], 0, p[2]]}>
						<cylinderGeometry args={[0.015, 0.015, edges.h * 2, 8]} />
						{metalMaterial(PALETTE.charcoal, 0.4, 0.6)}
					</mesh>
				))}
				{[edges.h, -edges.h].map((y) => (
					<mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<torusGeometry args={[0.4 * Math.SQRT2, 0.015, 8, 4]} />
						{metalMaterial(PALETTE.charcoal, 0.4, 0.6)}
					</mesh>
				))}
			</group>
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  15. The Empty Hand                                                         */
/* -------------------------------------------------------------------------- */
export function EmptyHand(_: RelicProps) {
	const fingers = useRef<THREE.Group>(null);
	useFrame((s) => {
		if (!fingers.current) return;
		const spread = (Math.sin(s.clock.elapsedTime * 0.6) + 1) * 0.08;
		fingers.current.children.forEach((c, i) => {
			const dir = i - 2;
			c.rotation.z = -dir * spread;
		});
	});
	const fingerData = useMemo(
		() => [
			{ x: -0.4, h: 0.55 },
			{ x: -0.2, h: 0.75 },
			{ x: 0.0, h: 0.9 },
			{ x: 0.2, h: 0.78 },
			{ x: 0.4, h: 0.6 },
		],
		[]
	);
	return (
		<group rotation={[0.2, 0, 0]}>
			{/* curved palm base */}
			<mesh position={[0, -0.45, 0]} scale={[1, 0.5, 0.6]} castShadow>
				<sphereGeometry args={[0.55, 32, 24, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
				{matteMaterial(PALETTE.ivory, 0.85)}
			</mesh>
			<group ref={fingers} position={[0, -0.3, 0]}>
				{fingerData.map((f, i) => (
					<mesh key={i} position={[f.x, f.h / 2, 0]} castShadow>
						<capsuleGeometry args={[0.08, f.h, 6, 16]} />
						{matteMaterial(PALETTE.bone, 0.8)}
					</mesh>
				))}
			</group>
			<pointLight position={[0, 0.1, 0.2]} color={PALETTE.amber} intensity={0.6} distance={1.5} />
		</group>
	);
}

/* -------------------------------------------------------------------------- */
/*  Registry                                                                   */
/* -------------------------------------------------------------------------- */
export type RelicComponent = (props: RelicProps) => ReactElement;

export const RELICS: { name: string; Component: RelicComponent }[] = [
	{ name: 'Hollow Halo Stone', Component: HollowHaloStone },
	{ name: 'Veiled Obelisk', Component: VeiledObelisk },
	{ name: 'Suspended Offering Bowl', Component: SuspendedOfferingBowl },
	{ name: 'Twin Tablets', Component: TwinTablets },
	{ name: 'The Unlit Crown', Component: UnlitCrown },
	{ name: 'Glass Reliquary Cube', Component: GlassReliquaryCube },
	{ name: 'Broken Sun Disc', Component: BrokenSunDisc },
	{ name: 'Silent Bell Form', Component: SilentBellForm },
	{ name: 'Floating Threshold Frame', Component: FloatingThresholdFrame },
	{ name: 'Threaded Idol', Component: ThreadedIdol },
	{ name: 'Inverted Stair Relic', Component: InvertedStairRelic },
	{ name: 'Sealed Vessel', Component: SealedVessel },
	{ name: 'Orbiting Ash Ring', Component: OrbitingAshRing },
	{ name: 'Soft Prism Lantern', Component: SoftPrismLantern },
	{ name: 'The Empty Hand', Component: EmptyHand },
];
