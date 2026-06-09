'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
	CeremonyLight,
	PALETTE,
	hoverValue,
	type ArtifactProps,
} from './artifactShared';

const roughGold = {
	color: PALETTE.gold,
	roughness: 0.66,
	metalness: 0.72,
};

export function BrokenHalo({ progress = 0, hovered = false }: ArtifactProps) {
	const group = useRef<THREE.Group>(null);
	const crack = useRef<THREE.Mesh>(null);
	const glint = useRef<THREE.Group>(null);
	const { longArc, shortArc, breakCaps } = useMemo(() => {
		const makeArc = (start: number, end: number) => {
			const steps = 96;
			const points = Array.from({ length: steps + 1 }, (_, i) => {
				const a = start + (end - start) * (i / steps);
				return new THREE.Vector3(Math.cos(a) * 1.08, 0, Math.sin(a) * 1.08);
			});
			return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps, 0.19, 18, false);
		};
		const gapStart = 0.56;
		const gapEnd = 1.0;
		return {
			longArc: makeArc(gapEnd, Math.PI * 2 + gapStart),
			shortArc: makeArc(0.12, gapStart - 0.08),
			breakCaps: [
				[Math.cos(gapStart) * 1.08, 0, Math.sin(gapStart) * 1.08] as [number, number, number],
				[Math.cos(gapEnd) * 1.08, 0, Math.sin(gapEnd) * 1.08] as [number, number, number],
			],
		};
	}, []);

	useFrame((state, delta) => {
		const h = hoverValue(hovered);
		if (group.current) {
			group.current.rotation.y += delta * THREE.MathUtils.lerp(0.2, 0.07, h);
			group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.025;
			group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.46) * 0.055;
			group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.035;
		}
		if (crack.current) {
			const mat = crack.current.material as THREE.MeshStandardMaterial;
			const beamLift = Math.max(0, Math.sin(progress * Math.PI * 3));
			mat.emissiveIntensity = 0.48 + beamLift * 0.58 + h * 0.38;
		}
		if (glint.current) {
			const angle = state.clock.elapsedTime * 0.86;
			glint.current.position.set(Math.cos(angle) * 1.08, 0.035, Math.sin(angle) * 1.08);
			const shine = 0.8 + Math.max(0, Math.sin(angle * 1.7)) * 0.45 + h * 0.25;
			glint.current.scale.setScalar(shine);
		}
	});

	return (
		<group ref={group} name="broken-halo-artifact" scale={[1, 0.62, 0.82]}>
			<mesh name="long-rough-gold-broken-halo-arc" geometry={longArc} castShadow receiveShadow>
				<meshStandardMaterial {...roughGold} />
			</mesh>
			<mesh name="short-misaligned-gold-broken-halo-arc" geometry={shortArc} position={[0.08, -0.02, 0.02]} castShadow receiveShadow>
				<meshStandardMaterial {...roughGold} />
			</mesh>
			{breakCaps.map((position, i) => (
				<mesh
					key={i}
					name="rough-exposed-gold-broken-halo-end"
					position={position}
					rotation={[0.2, 0.4, i === 0 ? -0.45 : 0.35]}
					scale={[0.18, 0.08, 0.13]}
					castShadow
				>
					<boxGeometry args={[1, 1, 1]} />
					<meshStandardMaterial {...roughGold} roughness={0.78} />
				</mesh>
			))}
			<mesh
				name="embedded-muted-gold-fracture"
				ref={crack}
				position={[0.72, 0.02, 0.72]}
				rotation={[0.12, 0.62, 0.08]}
				scale={[0.42, 0.78, 0.18]}
			>
				<boxGeometry args={[0.06, 0.46, 0.08]} />
				<meshStandardMaterial
					color={PALETTE.gold}
					emissive={PALETTE.gold}
					emissiveIntensity={0.9}
					roughness={0.5}
					metalness={0.24}
					toneMapped={false}
				/>
			</mesh>
			<mesh
				name="separated-gold-exposed-break-chip"
				position={[0.54, 0.05, 0.84]}
				rotation={[0.1, 0.9, 0.18]}
				scale={[0.34, 0.18, 0.16]}
			>
				<boxGeometry args={[0.1, 0.42, 0.08]} />
				<meshStandardMaterial
					color={PALETTE.gold}
					emissive={PALETTE.gold}
					emissiveIntensity={0.68}
					roughness={0.56}
					metalness={0.18}
					toneMapped={false}
				/>
			</mesh>
			<mesh
				name="small-gold-fragment-separated-from-break"
				position={[0.98, 0.08, 0.52]}
				rotation={[0.22, 0.16, -0.2]}
				scale={[0.12, 0.08, 0.1]}
				castShadow
			>
				<tetrahedronGeometry args={[1, 0]} />
				<meshStandardMaterial {...roughGold} roughness={0.8} />
			</mesh>
			<group ref={glint} name="moving-warm-shine-on-gold-halo">
				<mesh scale={[0.1, 0.035, 0.1]}>
					<sphereGeometry args={[1, 18, 12]} />
					<meshStandardMaterial
						color="#f1d08a"
						emissive="#f1c76e"
						emissiveIntensity={1.15}
						roughness={0.28}
						metalness={0.35}
						toneMapped={false}
					/>
				</mesh>
				<pointLight color="#f1c76e" intensity={0.7} distance={1.45} decay={2} />
			</group>
			<CeremonyLight intensity={0.45 + hoverValue(hovered) * 0.38} distance={3.15} />
		</group>
	);
}
