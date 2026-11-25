import * as THREE from 'three';

export type StudioMaterialFinish = 'gold' | 'platinum' | 'obsidian' | 'bronze';

export interface Foundry3DArtifactSpec {
  kind: 'token' | 'nft';
  title: string;
  subtitle: string;
  contractId: string;
  contractAddress: string;
  pageIndex: string;
  badgeText: string;
  collection?: string;
  accentHex: string;
  secondaryHex: string;
  rarityTier?: string;
  enhancementTier?: string;
  iridescence?: number;
  emissiveBoost?: number;
  anisotropyBoost?: number;
  enhancementsEnabled?: boolean;
}

export interface StudioFinishPalette {
  id: StudioMaterialFinish;
  label: string;
  swatchHex: string;
  primaryHex: number;
  trimHex: number;
  crystalHex: number;
  roughness: number;
  metalness: number;
}

export const STUDIO_FINISH_PALETTES: Record<StudioMaterialFinish, StudioFinishPalette> = {
  gold: {
    id: 'gold',
    label: 'Champagne Gold',
    swatchHex: '#D4B475',
    primaryHex: 0xd4b475,
    trimHex: 0xcbd5e1,
    crystalHex: 0x38bdf8,
    roughness: 0.18,
    metalness: 0.94,
  },
  platinum: {
    id: 'platinum',
    label: 'Starforged Platinum',
    swatchHex: '#CBD5E1',
    primaryHex: 0xdbe4ee,
    trimHex: 0xd4b475,
    crystalHex: 0xa78bfa,
    roughness: 0.16,
    metalness: 0.96,
  },
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian Titanium',
    swatchHex: '#334155',
    primaryHex: 0x263142,
    trimHex: 0xd4b475,
    crystalHex: 0x10b981,
    roughness: 0.28,
    metalness: 0.88,
  },
  bronze: {
    id: 'bronze',
    label: 'Sovereign Bronze',
    swatchHex: '#B87333',
    primaryHex: 0xc87d44,
    trimHex: 0xf6e6c2,
    crystalHex: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.92,
  },
};

const _dummy = new THREE.Object3D();
const _tempColor = new THREE.Color();

/**
 * Probes WebGL2 renderer string to detect software rasterizers (SwiftShader, llvmpipe, WARP)
 * and immediately releases the probe context.
 */
export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Procedural linear-space brushed-metal roughness micro-streak map.
 */
function createBrushedRoughnessMap(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#383838';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const lum = 44 + ((y * 37) % 38);
      ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural sRGB dial/engraving plaque texture with high grazing-angle anisotropy.
 */
function createEngravedDialTexture(
  spec: Foundry3DArtifactSpec,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(256, 236, 24, 256, 256, 256);
    grad.addColorStop(0, '#182230');
    grad.addColorStop(1, '#080b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Concentric precision chapter rings
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 256, 198, 0, Math.PI * 2);
    ctx.stroke();

    // 60 radial calibration ticks
    for (let i = 0; i < 60; i += 1) {
      const angle = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const r0 = major ? 202 : 212;
      const r1 = 224;
      ctx.strokeStyle = major ? accentHex : 'rgba(203, 213, 225, 0.5)';
      ctx.lineWidth = major ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(angle) * r0, 256 + Math.sin(angle) * r0);
      ctx.lineTo(256 + Math.cos(angle) * r1, 256 + Math.sin(angle) * r1);
      ctx.stroke();
    }

    // Center typography
    ctx.textAlign = 'center';
    ctx.fillStyle = accentHex;
    ctx.font = '700 20px monospace';
    ctx.fillText(spec.kind === 'token' ? 'TWE SOVEREIGN TOKEN' : 'SUPER NFT FOUNDRY', 256, 148);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 44px monospace';
    ctx.fillText(spec.badgeText.slice(0, 14), 256, 270);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 18px monospace';
    ctx.fillText(spec.contractId.slice(0, 22), 256, 326);

    ctx.fillStyle = accentHex;
    ctx.font = '500 14px monospace';
    const shortAddr = `${spec.contractAddress.slice(0, 12)}...${spec.contractAddress.slice(-8)}`;
    ctx.fillText(shortAddr, 256, 360);

    if (spec.enhancementTier && spec.enhancementsEnabled !== false) {
      ctx.fillStyle = '#E8C26A';
      ctx.font = '700 13px monospace';
      ctx.fillText(`PBR: ${spec.enhancementTier.toUpperCase()}`, 256, 392);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural soft radial contact shadow plane texture to ground hero models flush on the studio floor.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRegularPolygonShape(sides: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i <= sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2 + Math.PI / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

function createShieldShape(width: number, height: number): THREE.Shape {
  const hw = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 0.55);
  shape.lineTo(hw, height * 0.34);
  shape.lineTo(hw * 0.86, -height * 0.16);
  shape.lineTo(0, -height * 0.55);
  shape.lineTo(-hw * 0.86, -height * 0.16);
  shape.lineTo(-hw, height * 0.34);
  shape.closePath();
  return shape;
}

function tagExplodable(obj: THREE.Object3D, baseY: number, explodeOffsetY: number, spinSpeed = 0) {
  obj.position.y = baseY;
  obj.userData.baseY = baseY;
  obj.userData.explodeOffsetY = explodeOffsetY;
  obj.userData.spinSpeed = spinSpeed;
}

/**
 * Builds a composite 9-part procedural Three.js Group for either a Token Foundry contract
 * or an NFT Collection edition, pivoted at bottom-center flush at y = 0.
 */
export function buildFoundryArtifactGroup(params: {
  spec: Foundry3DArtifactSpec;
  finish: StudioMaterialFinish;
  isSoftwareGl: boolean;
  maxAnisotropy: number;
}): THREE.Group {
  const { spec, finish, isSoftwareGl, maxAnisotropy } = params;
  const palette = STUDIO_FINISH_PALETTES[finish];
  const root = new THREE.Group();
  root.name = 'FoundryArtifactRoot';

  const roughnessMap = createBrushedRoughnessMap(maxAnisotropy);
  const dialTexture = createEngravedDialTexture(spec, spec.accentHex || palette.swatchHex, maxAnisotropy);

  const enhanced = spec.enhancementsEnabled !== false;
  const appliedIridescence = enhanced ? Math.max(0, Math.min(1, spec.iridescence ?? 0)) : 0;
  const appliedEmissiveBoost = enhanced ? Math.max(0, Math.min(0.8, spec.emissiveBoost ?? 0)) : 0;
  const appliedAnisotropy = enhanced
    ? Math.max(0.55, Math.min(1, spec.anisotropyBoost ?? 0.8))
    : 0.65;

  // Material library with clear roughness contrast (>= 0.25 between adjacent surfaces)
  const mattePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x141922,
    roughness: 0.72,
    metalness: 0.14,
  });

  const primaryMetalMat = new THREE.MeshPhysicalMaterial({
    color: palette.primaryHex,
    roughness: palette.roughness,
    metalness: palette.metalness,
    roughnessMap,
    anisotropy: appliedAnisotropy,
    anisotropyRotation: Math.PI * 0.25,
    clearcoat: enhanced ? Math.min(1, 0.35 + appliedIridescence * 0.55) : 0.35,
    clearcoatRoughness: 0.18,
    iridescence: appliedIridescence,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [140, 480],
  });

  const trimMetalMat = new THREE.MeshPhysicalMaterial({
    color: palette.trimHex,
    roughness: Math.min(0.45, palette.roughness + 0.12),
    metalness: 0.94,
    anisotropy: Math.min(1, appliedAnisotropy * 0.85),
    iridescence: appliedIridescence * 0.5,
    iridescenceIOR: 1.38,
  });

  const accentEmissiveColor = new THREE.Color(spec.accentHex || '#D4B475');
  const secondaryColor = new THREE.Color(spec.secondaryHex || '#38BDF8');

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: accentEmissiveColor,
    emissive: accentEmissiveColor,
    emissiveIntensity: 0.22 + appliedEmissiveBoost,
    roughness: 0.06,
    metalness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.9,
    transparent: true,
    opacity: isSoftwareGl ? 0.56 : 1.0,
    ior: 1.78,
    thickness: 1.4,
    attenuationColor: secondaryColor,
    attenuationDistance: 1.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    iridescence: appliedIridescence * 0.6,
  });

  const sapphireDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    roughness: 0.05,
    metalness: 0.0,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.16 : 0.26,
    ior: 1.52,
    clearcoat: 1.0,
    depthWrite: false,
  });

  const dialMat = new THREE.MeshStandardMaterial({
    map: dialTexture,
    roughness: 0.36,
    metalness: 0.45,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // 1. Stepped architectural obsidian plinth (LatheGeometry, flush at y = 0)
  const plinthPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.92, 0.0),
    new THREE.Vector2(1.92, 0.14),
    new THREE.Vector2(1.74, 0.22),
    new THREE.Vector2(1.74, 0.34),
    new THREE.Vector2(1.48, 0.42),
    new THREE.Vector2(0.0, 0.42),
  ];
  const plinthGeo = new THREE.LatheGeometry(plinthPoints, 48);
  const plinthMesh = new THREE.Mesh(plinthGeo, mattePlinthMat);
  plinthMesh.castShadow = !isSoftwareGl;
  plinthMesh.receiveShadow = true;
  tagExplodable(plinthMesh, 0, 0);
  root.add(plinthMesh);

  // 2. Chamfered brushed metallic calibration bezel collar
  const bezelPoints = [
    new THREE.Vector2(1.44, 0.0),
    new THREE.Vector2(1.66, 0.0),
    new THREE.Vector2(1.72, 0.06),
    new THREE.Vector2(1.62, 0.14),
    new THREE.Vector2(1.44, 0.14),
  ];
  const bezelGeo = new THREE.LatheGeometry(bezelPoints, 48);
  const bezelMesh = new THREE.Mesh(bezelGeo, primaryMetalMat);
  bezelMesh.castShadow = !isSoftwareGl;
  bezelMesh.receiveShadow = true;
  tagExplodable(bezelMesh, 0.36, 0.18);
  root.add(bezelMesh);

  // 3. 36 Instanced micro-calibration index ticks around the plinth bezel
  const tickGeo = new THREE.BoxGeometry(0.03, 0.045, 0.11);
  const tickCount = 36;
  const ticksMesh = new THREE.InstancedMesh(tickGeo, trimMetalMat, tickCount);
  for (let i = 0; i < tickCount; i += 1) {
    const angle = (i / tickCount) * Math.PI * 2;
    const major = i % 3 === 0;
    const radius = 1.56;
    _dummy.position.set(Math.cos(angle) * radius, 0.025, Math.sin(angle) * radius);
    _dummy.rotation.set(0, -angle + Math.PI / 2, 0);
    _dummy.scale.set(major ? 1.25 : 0.85, major ? 1.35 : 0.85, major ? 1.3 : 0.85);
    _dummy.updateMatrix();
    ticksMesh.setMatrixAt(i, _dummy.matrix);
    _tempColor.setHex(major ? palette.primaryHex : palette.trimHex);
    ticksMesh.setColorAt(i, _tempColor);
  }
  ticksMesh.instanceMatrix.needsUpdate = true;
  if (ticksMesh.instanceColor) ticksMesh.instanceColor.needsUpdate = true;
  ticksMesh.computeBoundingSphere();
  tagExplodable(ticksMesh, 0.49, 0.28);
  root.add(ticksMesh);

  // 4. Engraved circular telemetry dial inlaid on the plinth deck
  const dialGeo = new THREE.CylinderGeometry(1.36, 1.36, 0.03, 48);
  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.receiveShadow = true;
  tagExplodable(dialMesh, 0.435, 0.36);
  root.add(dialMesh);

  if (spec.kind === 'token') {
    // 5. Primary beveled hexagonal security-token chassis (ExtrudeGeometry)
    const hexShape = createRegularPolygonShape(6, 0.94);
    const hexHole = new THREE.Path();
    hexHole.absarc(0, 0, 0.46, 0, Math.PI * 2, true);
    hexShape.holes.push(hexHole);

    const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.055,
      bevelSegments: 4,
    });
    hexGeo.center();
    const hexMesh = new THREE.Mesh(hexGeo, primaryMetalMat);
    hexMesh.castShadow = !isSoftwareGl;
    hexMesh.receiveShadow = true;
    tagExplodable(hexMesh, 1.62, 0.72, 0.28);
    root.add(hexMesh);

    // 6. Recessed brushed platinum containment ring
    const innerRingGeo = new THREE.TorusGeometry(0.56, 0.06, 20, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, trimMetalMat);
    innerRingMesh.castShadow = !isSoftwareGl;
    tagExplodable(innerRingMesh, 1.62, 0.95, -0.45);
    root.add(innerRingMesh);

    // 7. Suspended optical sapphire octahedral core crystal
    const coreGeo = new THREE.OctahedronGeometry(0.36, 0);
    const coreMesh = new THREE.Mesh(coreGeo, crystalMat);
    coreMesh.scale.set(0.86, 1.28, 0.86);
    coreMesh.castShadow = !isSoftwareGl;
    tagExplodable(coreMesh, 1.62, 1.24, 0.65);
    root.add(coreMesh);

    // 8. Dual gyroscopic orbital stabilizer rings + 6 telemetry nodes
    const gyroGroup = new THREE.Group();
    const orbitRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.028, 16, 72),
      primaryMetalMat
    );
    orbitRingA.rotation.x = Math.PI * 0.34;
    gyroGroup.add(orbitRingA);

    const orbitRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.06, 0.022, 16, 72),
      trimMetalMat
    );
    orbitRingB.rotation.y = Math.PI * 0.25;
    orbitRingB.rotation.x = -Math.PI * 0.28;
    gyroGroup.add(orbitRingB);

    const nodeMat = new THREE.MeshStandardMaterial({
      color: accentEmissiveColor,
      emissive: accentEmissiveColor,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
    });
    const nodeGeo = new THREE.SphereGeometry(0.055, 16, 16);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(Math.cos(a) * 1.18, Math.sin(a) * 0.52, Math.sin(a) * 1.04);
      gyroGroup.add(node);
    }
    tagExplodable(gyroGroup, 1.62, 1.48, -0.22);
    root.add(gyroGroup);

    // 9. Protective optical sapphire display dome (lifts during exploded view)
    const domeGeo = new THREE.SphereGeometry(1.42, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const domeMesh = new THREE.Mesh(domeGeo, sapphireDomeMat);
    domeMesh.renderOrder = 4;
    tagExplodable(domeMesh, 1.46, 1.95);
    root.add(domeMesh);
  } else {
    // NFT Collection-Specific Composite Sculptures (Cosmic Nexus / Matrix Heroes / Mythic Titans)
    const colName = (spec.collection || '').toLowerCase();

    // 5. Lower sculpted pedestal riser
    const riserGeo = new THREE.CylinderGeometry(0.62, 0.84, 0.38, 8);
    const riserMesh = new THREE.Mesh(riserGeo, primaryMetalMat);
    riserMesh.castShadow = !isSoftwareGl;
    riserMesh.receiveShadow = true;
    tagExplodable(riserMesh, 0.64, 0.45);
    root.add(riserMesh);

    if (colName.includes('matrix')) {
      // Matrix Heroes: Armored Sentinel Torso + Visor Crest + Plasma Lance
      const chestShape = createShieldShape(1.32, 1.24);
      const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 3,
      });
      chestGeo.center();
      const chestMesh = new THREE.Mesh(chestGeo, mattePlinthMat);
      chestMesh.castShadow = !isSoftwareGl;
      chestMesh.receiveShadow = true;
      tagExplodable(chestMesh, 1.54, 0.78);
      root.add(chestMesh);

      // Pauldron armor wings
      const pauldronGroup = new THREE.Group();
      const pauldronGeo = new THREE.ExtrudeGeometry(createRegularPolygonShape(5, 0.42), {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      });
      pauldronGeo.center();
      const leftP = new THREE.Mesh(pauldronGeo, primaryMetalMat);
      leftP.position.set(-0.78, 0.28, 0);
      leftP.rotation.z = 0.32;
      leftP.castShadow = !isSoftwareGl;
      const rightP = new THREE.Mesh(pauldronGeo, primaryMetalMat);
      rightP.position.set(0.78, 0.28, 0);
      rightP.rotation.z = -0.32;
      rightP.castShadow = !isSoftwareGl;
      pauldronGroup.add(leftP, rightP);
      tagExplodable(pauldronGroup, 1.54, 1.05);
      root.add(pauldronGroup);

      // Visor Helm assembly
      const helmGroup = new THREE.Group();
      const cranium = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 1), primaryMetalMat);
      cranium.scale.set(0.95, 1.12, 1.0);
      cranium.castShadow = !isSoftwareGl;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.36), crystalMat);
      visor.position.set(0, 0.04, 0.22);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), trimMetalMat);
      crest.position.set(0, 0.5, 0);
      helmGroup.add(cranium, visor, crest);
      tagExplodable(helmGroup, 2.48, 1.55);
      root.add(helmGroup);

      // Chest reactor crystal
      const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalMat);
      coreMesh.position.set(0, 0, 0.24);
      tagExplodable(coreMesh, 1.58, 1.24, 0.8);
      root.add(coreMesh);

      // Vertical ceremonial Matrix Lance relic
      const lanceGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 2.3, 12), trimMetalMat);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 6), crystalMat);
      tip.position.y = 1.32;
      lanceGroup.position.set(1.06, 0, 0.14);
      lanceGroup.add(shaft, tip);
      tagExplodable(lanceGroup, 1.72, 1.42);
      root.add(lanceGroup);
    } else if (colName.includes('titan')) {
      // Mythic Titans: Crowned Bullion Aegis Monolith + Starheart Core + Twin Halos
      const aegisShape = createShieldShape(1.5, 1.56);
      const aegisGeo = new THREE.ExtrudeGeometry(aegisShape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.09,
        bevelSize: 0.07,
        bevelSegments: 4,
      });
      aegisGeo.center();
      const aegisMesh = new THREE.Mesh(aegisGeo, primaryMetalMat);
      aegisMesh.castShadow = !isSoftwareGl;
      aegisMesh.receiveShadow = true;
      tagExplodable(aegisMesh, 1.66, 0.82);
      root.add(aegisMesh);

      // Recessed matte obsidian core housing
      const housingMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.52, 0.44, 8),
        mattePlinthMat
      );
      housingMesh.rotation.x = Math.PI / 2;
      tagExplodable(housingMesh, 1.66, 1.05);
      root.add(housingMesh);

      // Starheart crystal singularity
      const heartMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), crystalMat);
      heartMesh.castShadow = !isSoftwareGl;
      tagExplodable(heartMesh, 1.66, 1.32, 0.6);
      root.add(heartMesh);

      // Sovereign Crown Diadem
      const crownGroup = new THREE.Group();
      const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.055, 16, 48), trimMetalMat);
      crownBand.rotation.x = Math.PI / 2;
      crownGroup.add(crownBand);
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 4), primaryMetalMat);
        spire.position.set(Math.cos(angle) * 0.56, 0.22, Math.sin(angle) * 0.56);
        crownGroup.add(spire);
      }
      tagExplodable(crownGroup, 2.58, 1.68, 0.25);
      root.add(crownGroup);

      // Twin Titan Sigil Halo Rings
      const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.032, 16, 72), trimMetalMat);
      haloMesh.rotation.y = Math.PI * 0.16;
      tagExplodable(haloMesh, 1.72, 1.46, -0.35);
      root.add(haloMesh);
    } else {
      // Infinite Horizon Cosmic Nexus: Astral Astrolabe Crystal Monolith
      const prismGeo = new THREE.CylinderGeometry(0.46, 0.54, 1.48, 6);
      const prismMesh = new THREE.Mesh(prismGeo, crystalMat);
      prismMesh.castShadow = !isSoftwareGl;
      tagExplodable(prismMesh, 1.68, 0.88, 0.22);
      root.add(prismMesh);

      // Upper & lower metallic crystalline endcaps
      const capGeo = new THREE.ConeGeometry(0.54, 0.46, 6);
      const topCap = new THREE.Mesh(capGeo, primaryMetalMat);
      topCap.castShadow = !isSoftwareGl;
      tagExplodable(topCap, 2.64, 1.45, 0.22);
      root.add(topCap);

      const botCap = new THREE.Mesh(capGeo, primaryMetalMat);
      botCap.rotation.x = Math.PI;
      tagExplodable(botCap, 0.92, 0.58, 0.22);
      root.add(botCap);

      // Triple precision astrolabe gimbal rings
      const gimbalGroup = new THREE.Group();
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.032, 16, 80), primaryMetalMat);
      ring1.rotation.x = Math.PI * 0.32;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.024, 16, 72), trimMetalMat);
      ring2.rotation.y = Math.PI * 0.4;
      ring2.rotation.x = -Math.PI * 0.25;
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.018, 12, 80), trimMetalMat);
      ring3.rotation.z = Math.PI * 0.18;
      gimbalGroup.add(ring1, ring2, ring3);
      tagExplodable(gimbalGroup, 1.72, 1.25, -0.32);
      root.add(gimbalGroup);

      // 24 Instanced orbital star-nodes encircling the nexus
      const starGeo = new THREE.OctahedronGeometry(0.042, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: accentEmissiveColor,
        emissive: accentEmissiveColor,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.7,
      });
      const starCount = 24;
      const starsMesh = new THREE.InstancedMesh(starGeo, starMat, starCount);
      for (let i = 0; i < starCount; i += 1) {
        const a = (i / starCount) * Math.PI * 2;
        const r = 1.24 + (i % 3) * 0.12;
        const y = Math.sin(a * 3) * 0.42;
        _dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _dummy.rotation.set(a, a * 0.5, 0);
        const s = 0.8 + ((i * 7) % 5) * 0.12;
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        starsMesh.setMatrixAt(i, _dummy.matrix);
      }
      starsMesh.instanceMatrix.needsUpdate = true;
      starsMesh.computeBoundingSphere();
      tagExplodable(starsMesh, 1.72, 1.62, 0.18);
      root.add(starsMesh);
    }

    // Frequency-driven Celestial Foil / Chromatic Rim halo geometry for rare-frequency layers
    if (
      enhanced &&
      (spec.enhancementTier === 'Mythic Foil' || spec.enhancementTier === 'Chromatic Rim')
    ) {
      const foilHaloMat = new THREE.MeshPhysicalMaterial({
        color: spec.enhancementTier === 'Mythic Foil' ? 0xff7be5 : 0xe8c26a,
        emissive: spec.enhancementTier === 'Mythic Foil' ? 0xff7be5 : 0xe8c26a,
        emissiveIntensity: spec.enhancementTier === 'Mythic Foil' ? 0.55 : 0.3,
        roughness: 0.14,
        metalness: 0.92,
        iridescence: spec.enhancementTier === 'Mythic Foil' ? 1.0 : 0.5,
        iridescenceIOR: 1.48,
      });
      const auraRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.42, spec.enhancementTier === 'Mythic Foil' ? 0.028 : 0.02, 16, 96),
        foilHaloMat
      );
      auraRing.rotation.x = Math.PI * 0.42;
      tagExplodable(auraRing, 1.72, 1.78, spec.enhancementTier === 'Mythic Foil' ? 0.48 : 0.24);
      root.add(auraRing);
    }

    // Protective outer sapphire containment dome for all NFT editions
    const domeGeo = new THREE.SphereGeometry(1.52, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const domeMesh = new THREE.Mesh(domeGeo, sapphireDomeMat);
    domeMesh.renderOrder = 4;
    tagExplodable(domeMesh, 1.62, 2.02);
    root.add(domeMesh);
  }

  return root;
}

/**
 * Recursively disposes geometries, materials, and textures attached to a Three.js Object3D tree.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.roughnessMap?.dispose();
        std.normalMap?.dispose();
        std.metalnessMap?.dispose();
        std.emissiveMap?.dispose();
        m.dispose();
      }
    }
  });
}
