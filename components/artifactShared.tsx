'use client';

import { type ReactElement, useMemo } from 'react';
import * as THREE from 'three';

export const PALETTE = {
	basalt: '#11100e',
	obsidian: '#090908',
	charcoal: '#1a1917',
	graphite: '#2a2a2b',
	ivory: '#ded5c0',
	pearl: '#eee7d8',
	gold: '#b8944a',
	amber: '#d39a45',
	bronze: '#735839',
	darkBronze: '#2b2118',
	smoke: '#8f928d',
	ash: '#66645f',
	paleGreen: '#cfe5cf',
} as const;

export type ArtifactProps = {
	progress?: number;
	hovered?: boolean;
};

export type ArtifactComponent = (props: ArtifactProps) => ReactElement;

export type ArtifactMeta = {
	id: string;
	name: string;
	text: string;
	Component: ArtifactComponent;
};

export const matteBasalt = {
	color: PALETTE.basalt,
	roughness: 0.92,
	metalness: 0.04,
};

export const obsidianStone = {
	color: PALETTE.obsidian,
	roughness: 0.84,
	metalness: 0.06,
};

export const agedBronze = {
	color: PALETTE.bronze,
	roughness: 0.62,
	metalness: 0.58,
};

export function hoverValue(hovered?: boolean) {
	return hovered ? 1 : 0;
}

export function CeremonyLight({
	color = PALETTE.amber,
	intensity = 0.5,
	distance = 2.4,
}: {
	color?: string;
	intensity?: number;
	distance?: number;
}) {
	return <pointLight color={color} intensity={intensity} distance={distance} decay={2} />;
}

export function makeRoundedBoxGeometry(
	width: number,
	height: number,
	depth: number,
	radius = 0.04,
	segments = 4
) {
	const w = Math.max(0.01, width - radius * 2);
	const h = Math.max(0.01, height - radius * 2);
	const shape = new THREE.Shape();

	shape.moveTo(-w / 2, -h / 2 - radius);
	shape.lineTo(w / 2, -h / 2 - radius);
	shape.quadraticCurveTo(w / 2 + radius, -h / 2 - radius, w / 2 + radius, -h / 2);
	shape.lineTo(w / 2 + radius, h / 2);
	shape.quadraticCurveTo(w / 2 + radius, h / 2 + radius, w / 2, h / 2 + radius);
	shape.lineTo(-w / 2, h / 2 + radius);
	shape.quadraticCurveTo(-w / 2 - radius, h / 2 + radius, -w / 2 - radius, h / 2);
	shape.lineTo(-w / 2 - radius, -h / 2);
	shape.quadraticCurveTo(-w / 2 - radius, -h / 2 - radius, -w / 2, -h / 2 - radius);

	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: Math.max(0.01, depth - radius * 2),
		bevelEnabled: true,
		bevelThickness: radius,
		bevelSize: radius,
		bevelSegments: segments,
		steps: 1,
	});
	geometry.center();
	geometry.computeVertexNormals();
	return geometry;
}

export function useRoundedBoxGeometry(
	width: number,
	height: number,
	depth: number,
	radius = 0.04,
	segments = 4
) {
	return useMemo(
		() => makeRoundedBoxGeometry(width, height, depth, radius, segments),
		[width, height, depth, radius, segments]
	);
}
