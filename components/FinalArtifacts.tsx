'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BrokenHalo } from './BrokenHalo';
import { BlackThoughtBox } from './BlackThoughtBox';
import { InvertedFountain } from './InvertedFountain';
import { InfiniteConveyor } from './InfiniteConveyor';
import { MisguidingLantern } from './MisguidingLantern';
import type { ArtifactComponent, ArtifactMeta } from './artifactShared';

export type { ArtifactMeta } from './artifactShared';

export type ProcessionSlot = {
	id: number;
	artifactIndex: number;
	z: number;
	x: number;
	y: number;
	spin: number;
	spinSpeed: number;
	wobblePhase: number;
	scale: number;
};

export const ARTIFACTS: ArtifactMeta[] = [
	{
		id: 'broken-halo',
		name: 'Broken Halo',
		text: 'False holiness: a sacred shape with nothing at its center.',
		Component: BrokenHalo,
	},
	{
		id: 'black-thought-box',
		name: 'Black Thought Box',
		text: 'Comfort becomes containment when it protects people from the discomfort of thought.',
		Component: BlackThoughtBox,
	},
	{
		id: 'inverted-fountain',
		name: 'Inverted Fountain',
		text: 'A poisoned blessing: endless giving that creates dependence.',
		Component: InvertedFountain,
	},
	{
		id: 'infinite-conveyor',
		name: 'Infinite Conveyor',
		text: 'Desire becomes ritual when consumption is designed to repeat forever.',
		Component: InfiniteConveyor,
	},
	{
		id: 'misguiding-lantern',
		name: 'Misguiding Lantern',
		text: 'A false guide: moral light that hides the harm inside.',
		Component: MisguidingLantern,
	},
];

function ArtifactSlot({
	slot,
	artifact,
	selected,
	onSelect,
	far,
	near,
}: {
	slot: ProcessionSlot;
	artifact: ArtifactMeta;
	selected: boolean;
	onSelect: (artifact: ArtifactMeta) => void;
	far: number;
	near: number;
}) {
	const group = useRef<THREE.Group>(null);
	const [progress, setProgress] = useState(0);
	const [hovered, setHovered] = useState(false);
	const progressRef = useRef(0);
	const opacityRef = useRef(-1);
	const Component: ArtifactComponent = artifact.Component;

	useFrame((state) => {
		const g = group.current;
		if (!g) return;

		const t = state.clock.elapsedTime;
		g.position.set(slot.x, slot.y, slot.z);
		g.rotation.x = Math.sin(t * 0.45 + slot.wobblePhase) * 0.06;
		g.rotation.y = slot.spin + t * slot.spinSpeed * (hovered ? 0.36 : 1);
		g.rotation.z = Math.cos(t * 0.38 + slot.wobblePhase) * 0.042;

		const p = THREE.MathUtils.clamp((slot.z - far) / (near - far), 0, 1);
		if (Math.abs(p - progressRef.current) > 0.018) {
			progressRef.current = p;
			setProgress(p);
		}

		let opacity = 1;
		if (p < 0.12) opacity = p / 0.12;
		else if (p > 0.82) opacity = Math.max(0, (1 - p) / 0.18);

		if (Math.abs(opacity - opacityRef.current) <= 0.015) return;
		opacityRef.current = opacity;

		g.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (!mesh.isMesh) return;
			const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			mats.forEach((m) => {
				const mat = m as THREE.Material & { _baseOpacity?: number };
				if (mat._baseOpacity === undefined) {
					mat._baseOpacity = (mat as any).opacity ?? 1;
				}
				const baseOpacity = mat._baseOpacity ?? 1;
				mat.transparent = true;
				(mat as any).opacity = baseOpacity * opacity;
				mat.depthWrite = opacity > 0.85 && baseOpacity > 0.75;
			});
		});
	});

	return (
		<group
			ref={group}
			scale={0.85 * slot.scale}
			onPointerOver={(event) => {
				event.stopPropagation();
				setHovered(true);
				document.body.style.cursor = 'pointer';
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = '';
			}}
			onClick={(event) => {
				event.stopPropagation();
				onSelect(artifact);
			}}
		>
			<mesh name={`${artifact.id}-interaction-volume`}>
				<sphereGeometry args={[1.45, 16, 12]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
			{progress > 0.08 && progress < 0.9 && (
				<pointLight
					position={[0, 0, 0]}
					color="#ffe8a3"
					intensity={0.58 + (hovered || selected ? 0.55 : 0)}
					distance={2.1}
					decay={2}
				/>
			)}
			<Component progress={progress} hovered={hovered || selected} />
		</group>
	);
}

export default function FinalArtifacts({
	slots,
	selected,
	onSelect,
	far,
	near,
}: {
	slots: ProcessionSlot[];
	selected: ArtifactMeta | null;
	onSelect: (artifact: ArtifactMeta) => void;
	far: number;
	near: number;
}) {
	return (
		<>
			{slots.map((slot) => {
				const artifact = ARTIFACTS[slot.artifactIndex];
				return (
					<ArtifactSlot
						key={slot.id}
						slot={slot}
						artifact={artifact}
						selected={selected?.id === artifact.id}
						onSelect={onSelect}
						far={far}
						near={near}
					/>
				);
			})}
		</>
	);
}
