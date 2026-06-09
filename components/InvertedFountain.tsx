'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
	CeremonyLight,
	PALETTE,
	agedBronze,
	hoverValue,
	type ArtifactProps,
} from './artifactShared';

export function InvertedFountain({ hovered = false }: ArtifactProps) {
	const group = useRef<THREE.Group>(null);
	const liquid = useRef<THREE.Group>(null);
	const droplets = useRef<THREE.Group>(null);
	const basinGeometry = useMemo(() => {
		const points = [
			new THREE.Vector2(0.0, -0.16),
			new THREE.Vector2(0.34, -0.16),
			new THREE.Vector2(0.66, -0.1),
			new THREE.Vector2(0.82, 0.02),
			new THREE.Vector2(0.76, 0.16),
			new THREE.Vector2(0.42, 0.24),
			new THREE.Vector2(0.0, 0.22),
		];
		const geo = new THREE.LatheGeometry(points, 96);
		geo.computeVertexNormals();
		return geo;
	}, []);
	const topBasinGeometry = useMemo(() => {
		const points = [
			new THREE.Vector2(0.0, -0.08),
			new THREE.Vector2(0.19, -0.08),
			new THREE.Vector2(0.33, -0.02),
			new THREE.Vector2(0.35, 0.08),
			new THREE.Vector2(0.18, 0.13),
			new THREE.Vector2(0.0, 0.12),
		];
		const geo = new THREE.LatheGeometry(points, 64);
		geo.computeVertexNormals();
		return geo;
	}, []);
	const streamCurves = useMemo(
		() =>
			Array.from({ length: 10 }, (_, i) => {
				const angle = (i / 10) * Math.PI * 2;
				const points = [
					new THREE.Vector3(Math.cos(angle) * 0.08, 0.72, Math.sin(angle) * 0.08),
					new THREE.Vector3(Math.cos(angle) * 0.38, 0.98, Math.sin(angle) * 0.26),
					new THREE.Vector3(Math.cos(angle + 0.2) * 0.74, 0.2, Math.sin(angle + 0.2) * 0.48),
				];
				return new THREE.CatmullRomCurve3(points);
			}),
		[]
	);
	const streamGeometries = useMemo(
		() => streamCurves.map((curve) => new THREE.TubeGeometry(curve, 44, 0.045, 14, false)),
		[streamCurves]
	);

	useFrame((state, delta) => {
		const t = state.clock.elapsedTime;
		const h = hoverValue(hovered);
		if (group.current) {
			group.current.rotation.y += delta * THREE.MathUtils.lerp(0.2, 0.075, h);
			group.current.rotation.z = Math.sin(t * 0.34) * 0.035;
		}
		if (liquid.current) {
			liquid.current.children.forEach((child, i) => {
				child.position.y = Math.sin(t * 0.58 + i * 0.74) * 0.055;
				child.rotation.y += delta * (0.05 + i * 0.008);
				child.scale.setScalar(1 + Math.sin(t * 1.1 + i) * 0.045);
			});
		}
		if (droplets.current) {
			droplets.current.children.forEach((child, i) => {
				const curve = streamCurves[i % streamCurves.length];
				const phase = (t * 0.22 + i * 0.093) % 1;
				const point = curve.getPoint(phase);
				child.position.copy(point);
				const size = 0.72 + Math.sin(phase * Math.PI) * 0.55;
				child.scale.setScalar(size);
			});
		}
	});

	return (
		<group ref={group} name="inverted-fountain-artifact">
			<mesh name="wide-aged-bronze-fountain-basin" geometry={basinGeometry} position={[0, -0.22, 0]} castShadow receiveShadow>
				<meshStandardMaterial {...agedBronze} side={THREE.DoubleSide} />
			</mesh>
			<mesh name="warm-highlighted-fountain-rim" position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.78, 0.027, 14, 96]} />
				<meshStandardMaterial color={PALETTE.gold} roughness={0.46} metalness={0.65} />
			</mesh>
			<mesh name="dark-round-fountain-plinth" position={[0, -0.66, 0]} castShadow receiveShadow>
				<cylinderGeometry args={[0.34, 0.48, 0.16, 48]} />
				<meshStandardMaterial color={PALETTE.darkBronze} roughness={0.58} metalness={0.55} />
			</mesh>
			<mesh name="central-ceremonial-fountain-column" position={[0, 0.28, 0]} castShadow>
				<cylinderGeometry args={[0.095, 0.14, 0.9, 40]} />
				<meshStandardMaterial {...agedBronze} />
			</mesh>
			<mesh name="small-upper-offering-cup" geometry={topBasinGeometry} position={[0, 0.7, 0]} castShadow receiveShadow>
				<meshStandardMaterial {...agedBronze} side={THREE.DoubleSide} />
			</mesh>
			<mesh name="black-oil-spout" position={[0, 0.86, 0]} castShadow>
				<cylinderGeometry args={[0.055, 0.08, 0.22, 32]} />
				<meshPhysicalMaterial color="#030302" roughness={0.18} metalness={0.06} clearcoat={0.9} clearcoatRoughness={0.12} />
			</mesh>
			<group ref={liquid} name="impossible-glossy-black-liquid-flow">
				{streamGeometries.map((geo, i) => (
					<mesh key={i} name="controlled-black-oil-arc" geometry={geo}>
						<meshPhysicalMaterial
							color="#030302"
							roughness={0.2}
							metalness={0.08}
							clearcoat={0.72}
							clearcoatRoughness={0.18}
							reflectivity={0.55}
						/>
					</mesh>
				))}
			</group>
			<group ref={droplets} name="animated-black-water-droplets-riding-streams">
				{Array.from({ length: 16 }, (_, i) => (
					<mesh
						key={i}
						name="moving-black-corrupted-water-droplet"
						scale={[0.07, 0.1 + (i % 3) * 0.02, 0.07]}
					>
						<sphereGeometry args={[0.08, 24, 16]} />
						<meshPhysicalMaterial color="#050403" roughness={0.16} metalness={0.04} clearcoat={0.9} clearcoatRoughness={0.1} />
					</mesh>
				))}
			</group>
			<CeremonyLight intensity={0.38 + hoverValue(hovered) * 0.22} distance={2.6} />
		</group>
	);
}
