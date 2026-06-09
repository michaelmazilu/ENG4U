'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
	CeremonyLight,
	PALETTE,
	hoverValue,
	makeRoundedBoxGeometry,
	type ArtifactProps,
} from './artifactShared';

function pointOnInfinity(angle: number) {
	return new THREE.Vector3(
		Math.sin(angle) * 1.2,
		Math.sin(angle * 2) * 0.45,
		Math.cos(angle) * 0.04
	);
}

function tangentAngle(angle: number) {
	const p = pointOnInfinity(angle);
	const ahead = pointOnInfinity(angle + 0.035);
	return Math.atan2(ahead.y - p.y, ahead.x - p.x);
}

export function InfiniteConveyor({ hovered = false }: ArtifactProps) {
	const group = useRef<THREE.Group>(null);
	const products = useRef<THREE.Group>(null);
	const rails = useMemo(() => {
		const makeRail = (zOffset: number) => {
			const points = Array.from({ length: 180 }, (_, i) => {
				const p = pointOnInfinity((i / 180) * Math.PI * 2);
				p.z += zOffset;
				return p;
			});
			return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 180, 0.034, 8, true);
		};
		return [makeRail(-0.16), makeRail(0.16)];
	}, []);
	const beltSlatGeometry = useMemo(() => makeRoundedBoxGeometry(0.19, 0.055, 0.34, 0.018, 2), []);
	const packageGeometry = useMemo(() => makeRoundedBoxGeometry(0.3, 0.19, 0.24, 0.018, 2), []);

	useFrame((state, delta) => {
		const t = state.clock.elapsedTime;
		const h = hoverValue(hovered);
		if (group.current) {
			group.current.rotation.y = Math.sin(t * 0.22) * 0.18;
			group.current.rotation.y += h * 0.04;
		}
		if (products.current) {
			const children = products.current.children;
			children.forEach((child, i) => {
				const a = t * 0.55 + i * (Math.PI * 2 / children.length);
				const p = pointOnInfinity(a);
				child.position.set(p.x, p.y + 0.1, p.z);
				child.rotation.set(0.08, -a * 0.1, tangentAngle(a));
			});
		}
	});

	return (
		<group ref={group} name="infinite-conveyor-artifact">
			<group name="raised-3d-infinity-conveyor-belt">
				{rails.map((rail, i) => (
					<mesh key={i} name="parallel-blackened-metal-conveyor-rail" geometry={rail} castShadow receiveShadow>
						<meshStandardMaterial color={PALETTE.graphite} roughness={0.76} metalness={0.38} />
					</mesh>
				))}
				{Array.from({ length: 58 }, (_, i) => {
					const a = (i / 58) * Math.PI * 2;
					const p = pointOnInfinity(a);
					return (
						<mesh
							key={i}
							name="fixed-dark-conveyor-belt-slat"
							geometry={beltSlatGeometry}
							position={[p.x, p.y, p.z]}
							rotation={[0, 0, tangentAngle(a)]}
							castShadow
							receiveShadow
						>
							<meshStandardMaterial color="#151514" roughness={0.88} metalness={0.16} />
						</mesh>
					);
				})}
			</group>
			<group ref={products} name="anonymous-interchangeable-product-blocks">
				{Array.from({ length: 10 }, (_, i) => (
					<group key={i} name="small-unbranded-package-on-belt">
						<mesh geometry={packageGeometry} castShadow receiveShadow>
							<meshStandardMaterial
								color={[PALETTE.ivory, '#8a683c', '#5d5648'][i % 3]}
								roughness={0.82}
								metalness={0.02}
							/>
						</mesh>
						<mesh name="paper-package-center-tape" position={[0, 0.101, 0]} scale={[1.08, 1, 1]}>
							<boxGeometry args={[0.045, 0.012, 0.255]} />
							<meshStandardMaterial color="#b8944a" roughness={0.7} metalness={0.05} />
						</mesh>
						<mesh name="paper-package-cross-tape" position={[0, 0.108, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1]}>
							<boxGeometry args={[0.04, 0.012, 0.315]} />
							<meshStandardMaterial color="#b8944a" roughness={0.7} metalness={0.05} />
						</mesh>
						<mesh name="subtle-package-front-seam" position={[0, 0.002, 0.125]} scale={[1, 1, 1]}>
							<boxGeometry args={[0.32, 0.012, 0.01]} />
							<meshStandardMaterial color="#2a2118" roughness={0.85} metalness={0} />
						</mesh>
					</group>
				))}
			</group>
			<mesh name="faint-conveyor-shadow" position={[0, -0.74, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[1.4, 48]} />
				<meshBasicMaterial color="#050403" transparent opacity={0.26} depthWrite={false} />
			</mesh>
			<CeremonyLight intensity={0.24 + hoverValue(hovered) * 0.18} distance={2.7} />
		</group>
	);
}
