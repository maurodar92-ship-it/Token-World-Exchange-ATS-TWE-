import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Camera, Eye, EyeOff, Network, RotateCcw, Shield, Volume2, VolumeX } from 'lucide-react';

export type GlobeMode = 'rwahubs' | 'containment';

export interface RwaHubNode {
  id: string;
  name: string;
  commodity: string;
  lat: number;
  lng: number;
  colorHex: number;
  accentClass: string;
  telemetry: string;
}

export const RWA_HUB_NODES: RwaHubNode[] = [
  {
    id: 'houston',
    name: 'Houston (WTI)',
    commodity: 'WTI Crude Bitmask',
    lat: 29.76,
    lng: -95.36,
    colorHex: 0xd4b475,
    accentClass: 'text-[#D4B475]',
    telemetry: '$78.42/bbl · Port 713',
  },
  {
    id: 'singapore',
    name: 'Singapore (LNG)',
    commodity: 'LNG Terminal Yield',
    lat: 1.35,
    lng: 103.81,
    colorHex: 0x06b6d4,
    accentClass: 'text-cyan-400',
    telemetry: '12.4% APY · SGX Node',
  },
  {
    id: 'rotterdam',
    name: 'Rotterdam (Port)',
    commodity: 'North Sea Wind & Carbon',
    lat: 51.92,
    lng: 4.47,
    colorHex: 0x10b981,
    accentClass: 'text-emerald-400',
    telemetry: '4.82 Mt tCO2e · Vaulted',
  },
  {
    id: 'dubai',
    name: 'Dubai (Gold)',
    commodity: 'Physical Gold Bullion',
    lat: 25.2,
    lng: 55.27,
    colorHex: 0x8b5cf6,
    accentClass: 'text-violet-400',
    telemetry: '$4.2B Vault Reserve',
  },
];

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoft = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return isSoft;
  } catch {
    return false;
  }
}

function latLngToVector3(lat: number, lng: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  out.set(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

export interface PlanetaryMapMeta {
  hubLabel: string;
  styleLabel: string;
  accentHex: number;
}

interface PlanetaryGlobeCanvasProps {
  globeMode: GlobeMode;
  onChangeMode: (mode: GlobeMode) => void;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onPlayTone: (freq?: number, type?: OscillatorType, duration?: number) => void;
  albedoCanvas?: HTMLCanvasElement | null;
  emissiveCanvas?: HTMLCanvasElement | null;
  activeMapMeta?: PlanetaryMapMeta | null;
  onRegisterSnapshotFn?: (fn: (() => void) | null) => void;
}

export const PlanetaryGlobeCanvas: React.FC<PlanetaryGlobeCanvasProps> = ({
  globeMode,
  onChangeMode,
  selectedNodeId,
  onSelectNode,
  audioEnabled,
  onToggleAudio,
  onPlayTone,
  albedoCanvas,
  emissiveCanvas,
  activeMapMeta,
  onRegisterSnapshotFn,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  const globeModeRef = useRef<GlobeMode>(globeMode);
  const selectedNodeRef = useRef<string>(selectedNodeId);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const containmentGroupRef = useRef<THREE.Group | null>(null);
  const atmosphereMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const eqMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const albedoTexRef = useRef<THREE.CanvasTexture | null>(null);
  const emissiveTexRef = useRef<THREE.CanvasTexture | null>(null);
  const markerMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    globeModeRef.current = globeMode;
    if (containmentGroupRef.current) {
      containmentGroupRef.current.visible = globeMode === 'containment';
    }
    if (atmosphereMatRef.current) {
      atmosphereMatRef.current.opacity = globeMode === 'containment' ? 0.22 : 0.08;
    }
  }, [globeMode]);

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId;
    markerMeshesRef.current.forEach((mesh, id) => {
      const targetScale = id === selectedNodeId ? 1.55 : 1.0;
      mesh.scale.setScalar(targetScale);
    });
  }, [selectedNodeId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const initW = Math.max(container.clientWidth, 320);
    const initH = Math.max(container.clientHeight, 320);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      });
    } catch {
      setWebglError('WebGL context unavailable in this browser.');
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initW, initH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080c);
    sceneRef.current = scene;

    // RoomEnvironment PMREM for crisp Champagne-Gold & Platinum reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.5, 1200);
    camera.position.set(0, 32, 205);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 120;
    controls.maxDistance = 320;
    controlsRef.current = controls;

    // Three-point + hemisphere studio lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x111827, 0.9);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xf6e6c2, 1.8);
    keyLight.position.set(140, 120, 160);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-140, -60, -120);
    scene.add(rimLight);

    const disposables: Array<{ dispose: () => void }> = [];

    // Subtle deep-space starfield
    const starCount = 450;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 280 + ((i * 73) % 240);
      const theta = (i * 2.39996) % (Math.PI * 2);
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.4, transparent: true, opacity: 0.55 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // Main rotating globe assembly
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Inner planetary core (accepts dynamic equirectangular Nano Banana CanvasTexture)
    const coreGeo = new THREE.SphereGeometry(58.2, 48, 48);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0b1018,
      roughness: 0.42,
      metalness: 0.55,
    });
    coreMatRef.current = coreMat;
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);
    disposables.push(coreGeo, coreMat);

    // Geodesic Earth holographic wireframe
    const wireGeo = new THREE.SphereGeometry(60, 42, 42);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    wireMatRef.current = wireMat;
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);
    disposables.push(wireGeo, wireMat);

    // Champagne-gold equatorial collar ring
    const eqGeo = new THREE.TorusGeometry(61.5, 0.35, 12, 96);
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xd4b475,
      metalness: 0.85,
      roughness: 0.25,
    });
    eqMatRef.current = eqMat;
    const eqRing = new THREE.Mesh(eqGeo, eqMat);
    eqRing.rotation.x = Math.PI / 2;
    globeGroup.add(eqRing);
    disposables.push(eqGeo, eqMat);

    // Outer atmosphere containment shell
    const atmoGeo = new THREE.SphereGeometry(65.5, 28, 28);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: globeModeRef.current === 'containment' ? 0.22 : 0.08,
    });
    atmosphereMatRef.current = atmoMat;
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);
    disposables.push(atmoGeo, atmoMat);

    // RWA Hub Nodes + Orbital Arcs
    const originVec = new THREE.Vector3(0, 0, 0);
    const markerGeo = new THREE.SphereGeometry(2.1, 18, 18);
    const haloGeo = new THREE.RingGeometry(2.8, 3.6, 28);
    disposables.push(markerGeo, haloGeo);

    const markerMap = new Map<string, THREE.Mesh>();
    const nodePositions: THREE.Vector3[] = [];

    RWA_HUB_NODES.forEach((hub) => {
      const pos = latLngToVector3(hub.lat, hub.lng, 60.8);
      nodePositions.push(pos);

      const mMat = new THREE.MeshStandardMaterial({
        color: hub.colorHex,
        emissive: hub.colorHex,
        emissiveIntensity: 0.45,
        metalness: 0.65,
        roughness: 0.2,
      });
      const marker = new THREE.Mesh(markerGeo, mMat);
      marker.position.copy(pos);
      marker.userData = { hubId: hub.id };
      if (hub.id === selectedNodeRef.current) {
        marker.scale.setScalar(1.55);
      }
      globeGroup.add(marker);
      markerMap.set(hub.id, marker);
      disposables.push(mMat);

      // Surface ring oriented tangentially to the globe normal
      const haloMat = new THREE.MeshBasicMaterial({
        color: hub.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      halo.lookAt(pos.clone().multiplyScalar(2));
      globeGroup.add(halo);
      disposables.push(haloMat);

      // Core telemetry spoke
      const lineGeo = new THREE.BufferGeometry().setFromPoints([originVec, pos]);
      const lineMat = new THREE.LineBasicMaterial({
        color: hub.colorHex,
        transparent: true,
        opacity: 0.25,
      });
      globeGroup.add(new THREE.Line(lineGeo, lineMat));
      disposables.push(lineGeo, lineMat);
    });
    markerMeshesRef.current = markerMap;

    // Inter-hub great-circle Bezier liquidity arcs
    const arcMid = new THREE.Vector3();
    for (let i = 0; i < nodePositions.length; i++) {
      const a = nodePositions[i];
      const b = nodePositions[(i + 1) % nodePositions.length];
      arcMid.copy(a).add(b).multiplyScalar(0.5).normalize().multiplyScalar(82);
      const curve = new THREE.QuadraticBezierCurve3(a, arcMid, b);
      const arcPoints = curve.getPoints(36);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0xd4b475,
        transparent: true,
        opacity: 0.35,
      });
      globeGroup.add(new THREE.Line(arcGeo, arcMat));
      disposables.push(arcGeo, arcMat);
    }

    // Earth Containment Grid (8 angled concentric rings)
    const containmentGroup = new THREE.Group();
    containmentGroup.visible = globeModeRef.current === 'containment';
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.2,
      metalness: 0.75,
      roughness: 0.3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    disposables.push(ringMat);
    for (let i = 0; i < 8; i++) {
      const rGeo = new THREE.RingGeometry(68 + i * 2.2, 68.45 + i * 2.2, 72);
      const ring = new THREE.Mesh(rGeo, ringMat);
      ring.rotation.x = Math.PI / (i + 1);
      ring.rotation.y = Math.PI / (i + 2);
      containmentGroup.add(ring);
      disposables.push(rGeo);
    }
    globeGroup.add(containmentGroup);
    containmentGroupRef.current = containmentGroup;

    // ResizeObserver for crisp container fitting
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Raycast click selection on RWA Hub markers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(markerMap.values()), false);
      if (hits.length > 0) {
        const hubId = hits[0].object.userData?.hubId as string | undefined;
        if (hubId) {
          onSelectNode(hubId);
          onPlayTone(620, 'sine', 0.12);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Render loop with software-WebGL afterDraw pacing
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    const glCtx = renderer.getContext();

    const afterDraw = (next: () => void) => {
      const sync = (glCtx as WebGL2RenderingContext).fenceSync?.(
        (glCtx as WebGL2RenderingContext).SYNC_GPU_COMMANDS_COMPLETE,
        0
      );
      glCtx.flush();
      const poll = () => {
        if (disposed) return;
        if (sync && (glCtx as WebGL2RenderingContext).clientWaitSync?.(sync, 0, 0) === (glCtx as WebGL2RenderingContext).TIMEOUT_EXPIRED) {
          timerId = window.setTimeout(poll, 8);
          return;
        }
        if (sync) (glCtx as WebGL2RenderingContext).deleteSync?.(sync);
        timerId = window.setTimeout(next, 80);
      };
      timerId = window.setTimeout(poll, 8);
    };

    const tick = () => {
      if (disposed) return;
      globeGroup.rotation.y += isSoftwareGl ? 0.004 : 0.0014;
      atmoMesh.rotation.y -= 0.0009;
      if (containmentGroup.visible) {
        containmentGroup.rotation.z += 0.0008;
      }
      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      albedoTexRef.current?.dispose();
      emissiveTexRef.current?.dispose();
      envTarget.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onPlayTone, onSelectNode]);

  // Project dynamically generated Nano Banana equirectangular map textures onto the central 3D globe
  useEffect(() => {
    const coreMat = coreMatRef.current;
    const renderer = rendererRef.current;
    if (!coreMat || !renderer) return;

    if (albedoCanvas) {
      albedoTexRef.current?.dispose();
      const mapTex = new THREE.CanvasTexture(albedoCanvas);
      mapTex.colorSpace = THREE.SRGBColorSpace;
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mapTex.needsUpdate = true;
      albedoTexRef.current = mapTex;

      coreMat.map = mapTex;
      coreMat.color.setHex(0xffffff);
      coreMat.roughness = 0.36;
      coreMat.metalness = 0.38;

      if (emissiveCanvas) {
        emissiveTexRef.current?.dispose();
        const emTex = new THREE.CanvasTexture(emissiveCanvas);
        emTex.colorSpace = THREE.SRGBColorSpace;
        emTex.wrapS = THREE.RepeatWrapping;
        emTex.needsUpdate = true;
        emissiveTexRef.current = emTex;

        coreMat.emissiveMap = emTex;
        coreMat.emissive.setHex(0xffffff);
        coreMat.emissiveIntensity = 0.88;
      }

      coreMat.needsUpdate = true;
      if (wireMatRef.current) wireMatRef.current.opacity = 0.08;
    }

    if (activeMapMeta && eqMatRef.current) {
      eqMatRef.current.color.setHex(activeMapMeta.accentHex);
      if (wireMatRef.current) {
        wireMatRef.current.color.setHex(activeMapMeta.accentHex);
      }
    }
  }, [albedoCanvas, emissiveCanvas, activeMapMeta]);

  const handleCaptureSnapshot = React.useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    const slug = (activeMapMeta?.hubLabel || 'planetary-globe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.download = `twe-3d-${slug}.png`;
    a.click();
    onPlayTone(780, 'sine', 0.12);
  }, [activeMapMeta?.hubLabel, onPlayTone]);

  useEffect(() => {
    if (onRegisterSnapshotFn) {
      onRegisterSnapshotFn(handleCaptureSnapshot);
      return () => onRegisterSnapshotFn(null);
    }
  }, [onRegisterSnapshotFn, handleCaptureSnapshot]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current && globeGroupRef.current) {
      cameraRef.current.position.set(0, 32, 205);
      globeGroupRef.current.rotation.set(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    onPlayTone(400, 'sine', 0.1);
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-[var(--twe-border)] bg-[#06080C]">
      {webglError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-300">
          <p className="font-semibold text-sm text-[#D4B475] mb-1">3D Viewport Unavailable</p>
          <p className="text-slate-400 max-w-sm">{webglError}</p>
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-full" />
      )}

      {/* Top-Left Compact Mode & Projected Map Indicator (Solid/Opaque - No backdrop-blur over WebGL) */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <span className="px-2.5 py-1 rounded-md bg-[#0E1117]/90 border border-[#262C37] font-mono text-[11px] text-[#CBD5E1]">
          {globeMode === 'rwahubs' ? 'MODE: RWA HUB NODES' : 'MODE: EARTH CONTAINMENT GRID'}
        </span>
        {activeMapMeta && (
          <span className="px-2.5 py-1 rounded-md bg-[#0E1117]/90 border border-[#D4B475]/50 font-mono text-[11px] text-[#F6E6C2]">
            {activeMapMeta.hubLabel.toUpperCase()} · {activeMapMeta.styleLabel.toUpperCase()}
          </span>
        )}
      </div>

      {/* Collapsible Bottom Control Dock (Keeps Center Unobstructed, No backdrop-blur) */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center gap-2 pointer-events-none">
        {controlsVisible && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#0E1117]/95 border border-[#2A3240]">
            <button
              type="button"
              onClick={() => {
                onChangeMode('rwahubs');
                onPlayTone(520, 'sine', 0.1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                globeMode === 'rwahubs'
                  ? 'bg-[#D4B475] text-[#0B0D10] font-semibold'
                  : 'bg-[#161B24] text-[#CBD5E1] hover:bg-[#1E2532]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>RWA Hub Nodes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeMode('containment');
                onPlayTone(520, 'sine', 0.1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                globeMode === 'containment'
                  ? 'bg-emerald-500 text-[#0B0D10] font-semibold'
                  : 'bg-[#161B24] text-[#CBD5E1] hover:bg-[#1E2532]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Earth Containment Grid</span>
            </button>

            <div className="h-4 w-px bg-[#2A3240] mx-0.5 hidden sm:block" />

            {RWA_HUB_NODES.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  onSelectNode(node.id);
                  onPlayTone(620, 'sine', 0.1);
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  selectedNodeId === node.id
                    ? 'bg-[#262E3D] text-[#D4B475] border border-[#D4B475]/60'
                    : 'bg-[#141821] text-[#94A3B8] border border-transparent hover:text-white'
                }`}
              >
                {node.name.split(' ')[0]}
              </button>
            ))}

            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset Globe Camera"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-[#161B24] text-[#CBD5E1] hover:text-white text-[11px] font-mono cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={handleCaptureSnapshot}
              title="Export 3D Globe PNG Snapshot"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-[#161B24] text-[#CBD5E1] hover:text-white text-[11px] font-mono cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#D4B475]" />
              <span className="hidden sm:inline">Snap</span>
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              title={audioEnabled ? 'Mute Synthesized Feedback' : 'Enable Synthesized Feedback'}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-[#161B24] text-[#CBD5E1] hover:text-white text-[11px] font-mono cursor-pointer"
            >
              {audioEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#D4B475]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setControlsVisible((v) => !v)}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1117]/90 border border-[#2A3240] text-[10px] font-mono text-[#94A3B8] hover:text-white cursor-pointer"
        >
          {controlsVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>{controlsVisible ? 'Hide Controls' : 'Show Controls'}</span>
        </button>
      </div>
    </div>
  );
};
