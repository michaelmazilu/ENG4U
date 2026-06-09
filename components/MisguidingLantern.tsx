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

export function MisguidingLantern({ progress = 0, hovered = false }: ArtifactProps) {
	const group = useRef<THREE.Group>(null);
	const fragments = useRef<THREE.Group>(null);
	const core = useRef<THREE.Mesh>(null);
	const frameMaterial = useMemo(
		() => new THREE.MeshStandardMaterial({ color: PALETTE.darkBronze, roughness: 0.54, metalness: 0.68 }),
		[]
	);
	const waste = useMemo(
		() =>
			Array.from({ length: 16 }, (_, i) => ({
				position: [
					(Math.sin(i * 9.3) * 0.5) * 0.36,
					-0.44 + (i / 15) * 0.88,
					(Math.cos(i * 7.7) * 0.5) * 0.28,
				] as [number, number, number],
				scale: 0.04 + (i % 5) * 0.014,
				color: [PALETTE.charcoal, PALETTE.ash, '#383632'][i % 3],
			})),
		[]
	);

	useFrame((state, delta) => {
		const t = state.clock.elapsedTime;
		const h = hoverValue(hovered);
		if (group.current) {
			group.current.rotation.y += delta * THREE.MathUtils.lerp(0.14, 0.05, h);
			group.current.rotation.z = Math.sin(t * 0.44) * 0.022;
			group.current.position.y = Math.sin(t * 0.5) * 0.03;
		}
		if (fragments.current) {
			fragments.current.children.forEach((child, i) => {
				child.rotation.x += delta * (0.12 + i * 0.008);
				child.rotation.y += delta * (0.18 + i * 0.01);
			});
		}
		if (core.current) {
			const mat = core.current.material as THREE.MeshStandardMaterial;
			const reveal = THREE.MathUtils.clamp((progress - 0.45) / 0.4, 0, 1);
			mat.emissiveIntensity = 1.05 + Math.sin(t * 3.1) * 0.1 - reveal * 0.24 + h * 0.18;
		}
	});

	return (
		<group ref={group} name="misguiding-lantern-artifact">
			{[-0.31, 0.31].map((x) =>
				[-0.22, 0.22].map((z) => (
					<mesh key={`${x}-${z}`} name="minimal-blackened-bronze-frame-upright" position={[x, 0, z]}>
						<cylinderGeometry args={[0.018, 0.018, 1.42, 8]} />
						<primitive object={frameMaterial} attach="material" />
					</mesh>
				))
			)}
			{[-0.71, 0.71].map((y) => (
				<group key={y} position={[0, y, 0]}>
					<mesh name="front-horizontal-lantern-frame-width" position={[0, 0, 0.24]}>
						<boxGeometry args={[0.68, 0.035, 0.035]} />
						<primitive object={frameMaterial} attach="material" />
					</mesh>
					<mesh name="back-horizontal-lantern-frame-width" position={[0, 0, -0.24]}>
						<boxGeometry args={[0.68, 0.035, 0.035]} />
						<primitive object={frameMaterial} attach="material" />
					</mesh>
					<mesh name="left-horizontal-lantern-frame-depth" position={[-0.34, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
						<boxGeometry args={[0.48, 0.035, 0.035]} />
						<primitive object={frameMaterial} attach="material" />
					</mesh>
					<mesh name="right-horizontal-lantern-frame-depth" position={[0.34, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
						<boxGeometry args={[0.48, 0.035, 0.035]} />
						<primitive object={frameMaterial} attach="material" />
					</mesh>
				</group>
			))}
			<mesh name="dark-lantern-top-cap" position={[0, 0.79, 0]} castShadow>
				<cylinderGeometry args={[0.28, 0.36, 0.08, 4]} />
				<primitive object={frameMaterial} attach="material" />
			</mesh>
			<mesh name="dark-lantern-bottom-cap" position={[0, -0.79, 0]} castShadow>
				<cylinderGeometry args={[0.36, 0.3, 0.08, 4]} />
				<primitive object={frameMaterial} attach="material" />
			</mesh>
			<mesh name="small-connected-lantern-handle" position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.75, 1, 0.45]}>
				<torusGeometry args={[0.24, 0.018, 8, 36, Math.PI]} />
				<primitive object={frameMaterial} attach="material" />
			</mesh>
			<mesh name="four-smoky-glass-panels">
				<boxGeometry args={[0.58, 1.24, 0.4]} />
				<meshPhysicalMaterial
					color={PALETTE.smoke}
					transparent
					opacity={0.28}
					roughness={0.08}
					metalness={0}
					transmission={0.34}
					thickness={0.24}
					ior={1.42}
					depthWrite={false}
				/>
			</mesh>
			<mesh name="red-misguiding-core" ref={core} scale={[0.56, 0.82, 0.56]}>
				<sphereGeometry args={[0.24, 36, 24]} />
				<meshStandardMaterial
					color="#c4584b"
					emissive="#b33128"
					emissiveIntensity={0.9}
					roughness={0.5}
					metalness={0}
					toneMapped={false}
				/>
			</mesh>
			<group ref={fragments} name="visible-hidden-harm-fragments">
				{waste.map((piece, i) => (
					<mesh key={i} position={piece.position} scale={piece.scale} castShadow>
						{i % 4 === 0 ? <tetrahedronGeometry args={[1, 0]} /> : <boxGeometry args={[1.35, 0.38, 0.24]} />}
						<meshStandardMaterial color={piece.color} roughness={0.88} metalness={i % 5 === 0 ? 0.32 : 0.04} />
					</mesh>
				))}
			</group>
			<pointLight color="#a7332a" intensity={0.85 + hoverValue(hovered) * 0.22} distance={2.4} decay={2} />
			<CeremonyLight color="#a7332a" intensity={0.95 + hoverValue(hovered) * 0.3} distance={3.5} />
		</group>
	);
}
