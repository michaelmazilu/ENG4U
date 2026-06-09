'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
	CeremonyLight,
	PALETTE,
	hoverValue,
	obsidianStone,
	type ArtifactProps,
	useRoundedBoxGeometry,
} from './artifactShared';

const thoughtClusters = [
	{ base: [0.58, 0.2, 0.1], phase: 0.05, scale: [0.18, 0.14, 0.14] },
	{ base: [0.6, 0.36, 0.16], phase: 0.22, scale: [0.12, 0.1, 0.1] },
	{ base: [-0.22, 0.58, -0.24], phase: 0.43, scale: [0.16, 0.12, 0.12] },
	{ base: [-0.42, 0.56, -0.2], phase: 0.63, scale: [0.1, 0.08, 0.08] },
	{ base: [0.32, -0.58, -0.3], phase: 0.82, scale: [0.14, 0.1, 0.1] },
] as const;

export function BlackThoughtBox({ hovered = false }: ArtifactProps) {
	const group = useRef<THREE.Group>(null);
	const thoughts = useRef<THREE.Group>(null);
	const cubeGeometry = useRoundedBoxGeometry(1.2, 1.2, 1.2, 0.075, 5);
	const bubbleMaterial = useMemo(
		() =>
			new THREE.MeshPhysicalMaterial({
				color: PALETTE.pearl,
				emissive: PALETTE.ivory,
				emissiveIntensity: 0.16,
				transparent: true,
				opacity: 0.3,
				roughness: 0.28,
				metalness: 0,
				transmission: 0.18,
				thickness: 0.16,
				depthWrite: false,
			}),
		[]
	);

	useFrame((state, delta) => {
		const t = state.clock.elapsedTime;
		const h = hoverValue(hovered);
		if (group.current) {
			group.current.rotation.y += delta * THREE.MathUtils.lerp(0.055, 0.018, h);
			const breath = 1 + Math.sin(t * 0.74) * 0.012;
			group.current.scale.setScalar(breath);
		}
		if (thoughts.current) {
			thoughts.current.children.forEach((child, i) => {
				const pulse = (Math.sin(t * 0.9 + i * 0.8) + 1) * 0.5;
				const cycle = (t * 0.14 + thoughtClusters[i].phase) % 1;
				const seep = cycle < 0.72
					? THREE.MathUtils.smoothstep(cycle / 0.72, 0, 1)
					: 1 - THREE.MathUtils.smoothstep((cycle - 0.72) / 0.28, 0, 1);
				const base = thoughtClusters[i].base;
				const direction = new THREE.Vector3(base[0], base[1], base[2]).normalize();
				const distance = 0.04 + seep * 0.42;
				child.position.set(
					base[0] + direction.x * distance,
					base[1] + direction.y * distance * 0.55 + Math.sin(t * 0.7 + i) * 0.025,
					base[2] + direction.z * distance
				);
				child.scale.setScalar(0.72 + seep * 0.46 + pulse * 0.08 + h * 0.08);
			});
		}
	});

	return (
		<group ref={group} name="black-thought-box-artifact">
			<mesh name="sealed-obsidian-thought-cube" geometry={cubeGeometry} castShadow receiveShadow>
				<meshStandardMaterial {...obsidianStone} />
			</mesh>
			<group ref={thoughts} name="contained-smoky-thought-bubbles">
				{thoughtClusters.map((bubble, i) => (
					<group key={i} position={bubble.base as [number, number, number]}>
						<mesh scale={bubble.scale as [number, number, number]}>
							<sphereGeometry args={[1, 24, 16]} />
							<primitive object={bubbleMaterial} attach="material" />
						</mesh>
						<mesh position={[-0.18, -0.03, -0.02]} scale={[bubble.scale[0] * 0.35, bubble.scale[1] * 0.34, bubble.scale[2] * 0.34]}>
							<sphereGeometry args={[1, 16, 10]} />
							<primitive object={bubbleMaterial} attach="material" />
						</mesh>
						<mesh position={[0.11, 0.04, 0.03]} scale={[bubble.scale[0] * 0.7, bubble.scale[1] * 0.62, bubble.scale[2] * 0.62]}>
							<sphereGeometry args={[1, 20, 14]} />
							<primitive object={bubbleMaterial} attach="material" />
						</mesh>
						<mesh position={[-0.08, -0.04, -0.02]} scale={[bubble.scale[0] * 0.55, bubble.scale[1] * 0.52, bubble.scale[2] * 0.52]}>
							<sphereGeometry args={[1, 20, 14]} />
							<primitive object={bubbleMaterial} attach="material" />
						</mesh>
					</group>
				))}
			</group>
			<CeremonyLight color={PALETTE.ivory} intensity={0.18 + hoverValue(hovered) * 0.18} distance={2.1} />
		</group>
	);
}
