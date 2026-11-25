import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from 'lucide-react';
import {
  buildFoundryArtifactGroup,
  createContactShadowTexture,
  detectSoftwareWebGL,
  disposeObject3D,
  STUDIO_FINISH_PALETTES,
  type Foundry3DArtifactSpec,
  type StudioMaterialFinish,
} from '../lib/foundryThreeEngine';

interface FoundryThreeStudioProps {
  artifact: Foundry3DArtifactSpec;
  heightClassName?: string;
}

type CameraPresetId = 'hero' | 'top' | 'macro' | 'low';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'hero', label: 'Hero 3/4', position: [3.65, 2.75, 4.35], target: [0, 1.38, 0] },
  { id: 'top', label: 'Top Blueprint', position: [0.01, 5.9, 0.85], target: [0, 1.1, 0] },
  { id: 'macro', label: 'Macro Core', position: [1.95, 1.85, 2.35], target: [0, 1.62, 0] },
  { id: 'low', label: 'Monument Low', position: [-3.4, 1.25, 3.9], target: [0, 1.55, 0] },
];

// Reusable module-scope math objects (Zero GC inside render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

export const FoundryThreeStudio: React.FC<FoundryThreeStudioProps> = ({
  artifact,
  heightClassName = 'h-[540px]',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [finish, setFinish] = useState<StudioMaterialFinish>('gold');
  const [explodeTarget, setExplodeTarget] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('hero');
  const [turntable, setTurntable] = useState<boolean>(true);
  const [dockVisible, setDockVisible] = useState<boolean>(true);
  const [zenExpanded, setZenExpanded] = useState<boolean>(false);
  const [softwareMode, setSoftwareMode] = useState<boolean>(false);

  // Mutable scene state refs so React state changes never tear down the WebGLRenderer
  const explodeTargetRef = useRef<number>(0);
  const explodeCurrentRef = useRef<number>(0);
  const turntableRef = useRef<boolean>(true);
  const camTransitionRef = useRef<{ active: boolean; pos: THREE.Vector3; target: THREE.Vector3 }>({
    active: false,
    pos: new THREE.Vector3(3.65, 2.75, 4.35),
    target: new THREE.Vector3(0, 1.38, 0),
  });

  const sceneApiRef = useRef<{
    rebuildArtifact: (nextSpec: Foundry3DArtifactSpec, nextFinish: StudioMaterialFinish) => void;
    requestRender: () => void;
    captureSnapshot: () => void;
    handleResize: () => void;
  } | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeTarget;
    sceneApiRef.current?.requestRender();
  }, [explodeTarget]);

  useEffect(() => {
    turntableRef.current = turntable;
    sceneApiRef.current?.requestRender();
  }, [turntable]);

  const applyCameraPreset = useCallback((presetId: CameraPresetId) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId) ?? CAMERA_PRESETS[0];
    setCameraPreset(preset.id);
    _camGoalPos.set(preset.position[0], preset.position[1], preset.position[2]);
    _camGoalTarget.set(preset.target[0], preset.target[1], preset.target[2]);
    camTransitionRef.current.pos.copy(_camGoalPos);
    camTransitionRef.current.target.copy(_camGoalTarget);
    camTransitionRef.current.active = true;
    sceneApiRef.current?.requestRender();
  }, []);

  // Keyboard shortcut 'H' for Zen / Cinema HUD collapse
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockVisible((prev) => !prev);
      } else if (e.key === 'Escape' && zenExpanded) {
        setZenExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zenExpanded]);

  // Mount WebGLRenderer & Studio PBR Scene ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    setSoftwareMode(isSoftwareGl);
    if (isSoftwareGl) {
      turntableRef.current = false;
      setTurntable(false);
    }

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x090d14);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x090d14, 0.055);

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    camera.position.set(3.65, 2.75, 4.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // Mandatory Studio RoomEnvironment IBL on every device
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm/Cool 3-Point Studio Lighting Rig + Softbox RectAreaLights (GPU only)
    const hemiLight = new THREE.HemisphereLight(0x9cc8ff, 0x151922, 0.72);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.1);
    keyLight.position.set(5.2, 7.6, 4.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.05);
    rimLight.position.set(-5.5, 4.2, -5.2);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const topSoftbox = new THREE.RectAreaLight(0xfff4e0, 3.2, 5.2, 2.2);
      topSoftbox.position.set(0, 6.2, 2.2);
      topSoftbox.lookAt(0, 1.4, 0);
      scene.add(topSoftbox);

      const sideSoftbox = new THREE.RectAreaLight(0x7dd3fc, 1.8, 3.4, 3.4);
      sideSoftbox.position.set(-4.8, 2.6, 1.6);
      sideSoftbox.lookAt(0, 1.4, 0);
      scene.add(sideSoftbox);
    }

    // Grounded Architectural Cyclorama Floor (y = -0.02) + Radial Contact Shadow (y = 0.002)
    const floorGeo = new THREE.CircleGeometry(18, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d121b,
      roughness: 0.78,
      metalness: 0.16,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle concentric studio floor grid ring (offset at y = -0.014 with polygonOffset)
    const floorRingGeo = new THREE.RingGeometry(2.35, 2.38, 72);
    floorRingGeo.rotateX(-Math.PI / 2);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4b475,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorRingMesh = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRingMesh.position.y = -0.012;
    scene.add(floorRingMesh);

    const contactShadowTex = createContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(4.8, 4.8);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.position.y = 0.002;
    scene.add(contactShadowMesh);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.38, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.0;
    controls.maxDistance = 12.5;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.update();

    let activeArtifactGroup: THREE.Group | null = null;
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const mountArtifact = (nextSpec: Foundry3DArtifactSpec, nextFinish: StudioMaterialFinish) => {
      if (activeArtifactGroup) {
        scene.remove(activeArtifactGroup);
        disposeObject3D(activeArtifactGroup);
        activeArtifactGroup = null;
      }
      activeArtifactGroup = buildFoundryArtifactGroup({
        spec: nextSpec,
        finish: nextFinish,
        isSoftwareGl,
        maxAnisotropy,
      });
      scene.add(activeArtifactGroup);
    };

    mountArtifact(artifact, finish);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Software-WebGL-safe fence sync + coalesced requestRender()
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTimestamp = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const stepScene = (delta: number): boolean => {
      let needsAnotherFrame = false;

      // 1. Exponentially damped Exploded View separation
      const expTarget = explodeTargetRef.current;
      if (Math.abs(explodeCurrentRef.current - expTarget) > 0.001) {
        explodeCurrentRef.current = THREE.MathUtils.damp(
          explodeCurrentRef.current,
          expTarget,
          6.5,
          delta
        );
        needsAnotherFrame = true;
      } else {
        explodeCurrentRef.current = expTarget;
      }

      if (activeArtifactGroup) {
        const expVal = explodeCurrentRef.current;
        for (const child of activeArtifactGroup.children) {
          const baseY = typeof child.userData.baseY === 'number' ? child.userData.baseY : child.position.y;
          const offY = typeof child.userData.explodeOffsetY === 'number' ? child.userData.explodeOffsetY : 0;
          child.position.y = baseY + offY * expVal;

          if (turntableRef.current && typeof child.userData.spinSpeed === 'number' && child.userData.spinSpeed !== 0) {
            child.rotation.y += child.userData.spinSpeed * delta;
          }
        }
        if (turntableRef.current) {
          activeArtifactGroup.rotation.y += delta * 0.24;
          needsAnotherFrame = true;
        }
      }

      // 2. Exponentially damped Camera Preset transitions (cancelled on user drag)
      if (camTransitionRef.current.active) {
        const goalP = camTransitionRef.current.pos;
        const goalT = camTransitionRef.current.target;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, goalP.x, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, goalP.y, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, goalP.z, 6, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, goalT.x, 6, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, goalT.y, 6, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, goalT.z, 6, delta);
        if (
          camera.position.distanceTo(goalP) < 0.02 &&
          controls.target.distanceTo(goalT) < 0.02
        ) {
          camera.position.copy(goalP);
          controls.target.copy(goalT);
          camTransitionRef.current.active = false;
        } else {
          needsAnotherFrame = true;
        }
      }

      const dampingMoved = controls.update();
      if (dampingMoved && !isSoftwareGl) {
        needsAnotherFrame = true;
      }
      return needsAnotherFrame;
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = window.requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const delta = Math.min(0.08, Math.max(0.001, (now - lastTimestamp) / 1000));
        lastTimestamp = now;

        const keepGoing = stepScene(delta);
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || keepGoing)) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const onControlStart = () => {
      camTransitionRef.current.active = false;
      requestRender();
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    const handleResize = () => {
      if (!container || disposed) return;
      const nextW = Math.max(container.clientWidth, 300);
      const nextH = Math.max(container.clientHeight, 300);
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const captureSnapshot = () => {
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${artifact.contractId.toLowerCase()}-3d-studio.png`;
      link.click();
    };

    sceneApiRef.current = {
      rebuildArtifact: (nextSpec, nextFinish) => {
        mountArtifact(nextSpec, nextFinish);
        requestRender();
      },
      requestRender,
      captureSnapshot,
      handleResize,
    };

    requestRender();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      if (activeArtifactGroup) {
        scene.remove(activeArtifactGroup);
        disposeObject3D(activeArtifactGroup);
      }
      floorGeo.dispose();
      floorMat.dispose();
      floorRingGeo.dispose();
      floorRingMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      contactShadowTex.dispose();
      envRenderTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild only the procedural 3D group when artifact spec or finish changes
  useEffect(() => {
    sceneApiRef.current?.rebuildArtifact(artifact, finish);
  }, [artifact, finish]);

  // Trigger resize when toggling fullscreen Zen expansion
  useEffect(() => {
    const id = window.setTimeout(() => {
      sceneApiRef.current?.handleResize();
    }, 30);
    return () => window.clearTimeout(id);
  }, [zenExpanded]);

  const wrapperClass = zenExpanded
    ? 'fixed inset-0 z-50 bg-[#090d14]'
    : `relative w-full ${heightClassName} rounded-lg overflow-hidden border border-[var(--twe-border)] bg-[#090d14]`;

  return (
    <div className={wrapperClass}>
      {/* Isolated WebGL canvas mount container (zero sibling React HUD elements inside) */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Static Spec Badge (Zero pulsating dots, zero backdrop-filter) */}
      <div
        className="pointer-events-none absolute top-3.5 left-3.5 max-w-[300px] rounded-lg border border-white/15 px-3 py-2"
        style={{ backgroundColor: 'rgba(11, 13, 16, 0.88)' }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#D4B475]">
          {artifact.kind === 'token'
            ? '3D STUDIO PBR · TOKEN ARTIFACT'
            : `3D STUDIO PBR · ${artifact.collection ?? 'NFT EDITION'}`}
        </div>
        <div className="text-xs font-display font-semibold text-slate-100 truncate mt-0.5">
          {artifact.title}
        </div>
        <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
          {artifact.contractId} ·{' '}
          {artifact.enhancementTier && artifact.enhancementsEnabled !== false
            ? artifact.enhancementTier
            : softwareMode
              ? 'Software WebGL'
              : 'Hardware PBR'}
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ width: 'min(900px, calc(100% - 24px))' }}
      >
        <button
          type="button"
          onClick={() => setDockVisible((v) => !v)}
          title="Toggle HUD controls (H)"
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-md border border-b-0 border-white/15 text-[11px] font-mono text-slate-200 hover:text-[#D4B475] transition-colors cursor-pointer"
          style={{ backgroundColor: 'rgba(11, 13, 16, 0.90)' }}
        >
          {dockVisible ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls (H)</span>
            </>
          )}
        </button>

        {dockVisible && (
          <div
            className="pointer-events-auto w-full rounded-xl border border-white/15 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-200"
            style={{ backgroundColor: 'rgba(11, 13, 16, 0.92)' }}
          >
            {/* Exploded View Smooth Slider */}
            <label className="inline-flex items-center gap-2 min-w-[165px]">
              <Layers className="w-3.5 h-3.5 text-[#D4B475] shrink-0" />
              <span className="text-[11px] font-mono text-slate-300 whitespace-nowrap">
                Explode {Math.round(explodeTarget * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodeTarget}
                onChange={(e) => setExplodeTarget(Number(e.target.value))}
                aria-label="Exploded view separation"
                className="w-20 accent-[#D4B475] cursor-pointer"
              />
            </label>

            {/* Material Finish Swatches */}
            <div className="inline-flex items-center gap-1.5" role="group" aria-label="Material finish">
              {(Object.keys(STUDIO_FINISH_PALETTES) as StudioMaterialFinish[]).map((key) => {
                const pal = STUDIO_FINISH_PALETTES[key];
                const active = finish === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={pal.label}
                    onClick={() => setFinish(key)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-mono transition-colors cursor-pointer ${
                      active
                        ? 'border-[#D4B475] text-white bg-white/10'
                        : 'border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: pal.swatchHex }}
                    />
                    <span className="hidden sm:inline">{pal.label.split(' ')[1] || pal.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Camera View Presets */}
            <div className="inline-flex items-center gap-1" role="group" aria-label="Camera presets">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyCameraPreset(preset.id)}
                  className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    cameraPreset === preset.id
                      ? 'border-[#D4B475] text-[#D4B475] bg-white/10'
                      : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Turntable, Snapshot & Zen Fullscreen */}
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTurntable((t) => !t)}
                title={turntable ? 'Pause turntable' : 'Start turntable'}
                className="p-1.5 rounded border border-white/15 text-slate-200 hover:border-[#D4B475] hover:text-[#D4B475] cursor-pointer"
              >
                {turntable ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => sceneApiRef.current?.captureSnapshot()}
                title="Capture PNG studio render"
                className="p-1.5 rounded border border-white/15 text-slate-200 hover:border-[#D4B475] hover:text-[#D4B475] cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZenExpanded((z) => !z)}
                title={zenExpanded ? 'Exit full viewport (Esc)' : 'Expand full viewport'}
                className="p-1.5 rounded border border-white/15 text-slate-200 hover:border-[#D4B475] hover:text-[#D4B475] cursor-pointer"
              >
                {zenExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
