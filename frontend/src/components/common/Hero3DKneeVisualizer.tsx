import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Play, Pause, Activity, Eye } from 'lucide-react';

export const Hero3DKneeVisualizer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentAngle, setCurrentAngle] = useState(135);
  const [activePreset, setActivePreset] = useState<'cycle' | '90' | '140' | '175'>('cycle');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tibiaGroupRef = useRef<THREE.Group | null>(null);
  const angleLabelRef = useRef<number>(135);
  const isPlayingRef = useRef<boolean>(true);
  const animationFrameRef = useRef<number | null>(null);
  const cycleTimeRef = useRef<number>(0);

  // Mouse orbit
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraOrbitRef = useRef({ theta: 0.5, phi: 0.25, radius: 4.8 });

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraOrbitRef.current;
    const clampedPhi = Math.max(-0.6, Math.min(0.8, phi));
    cameraRef.current.position.x = radius * Math.cos(clampedPhi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.sin(clampedPhi);
    cameraRef.current.position.z = radius * Math.cos(clampedPhi) * Math.cos(theta);
    cameraRef.current.lookAt(0, -0.3, 0);
  };

  const resetView = () => {
    cameraOrbitRef.current = { theta: 0.55, phi: 0.2, radius: 4.6 };
    updateCameraPosition();
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 360;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer with antialiasing and alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x0d9488, 1.8);
    mainLight.position.set(5, 8, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x14b8a6, 2.5, 10);
    rimLight.position.set(0, 0, -3);
    scene.add(rimLight);

    // 5. Stylized Holographic Ground Grid
    const gridHelper = new THREE.GridHelper(6, 12, 0x0d9488, 0x1e293b);
    gridHelper.position.y = -2.2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    scene.add(gridHelper);

    // 6. Materials
    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const glowTealMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      emissive: 0x0d9488,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.9,
    });

    const cyanAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      wireframe: true,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });

    // 7. Anatomical Model Assembly
    // Root Knee Pivot at (0, 0, 0)
    const kneePivot = new THREE.Group();
    scene.add(kneePivot);

    // Knee Joint Condyle Sphere & Ring
    const condyleGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const condyleMesh = new THREE.Mesh(condyleGeo, jointMaterial);
    kneePivot.add(condyleMesh);

    const jointRingGeo = new THREE.TorusGeometry(0.42, 0.035, 16, 48);
    const jointRing = new THREE.Mesh(jointRingGeo, cyanAccentMaterial);
    jointRing.rotation.x = Math.PI / 2;
    kneePivot.add(jointRing);

    // Patella (Knee Cap)
    const patellaGeo = new THREE.SphereGeometry(0.16, 16, 16);
    patellaGeo.scale(1, 1.3, 0.7);
    const patellaMesh = new THREE.Mesh(patellaGeo, glowTealMaterial);
    patellaMesh.position.set(0, 0.05, 0.38);
    kneePivot.add(patellaMesh);

    // Upper Segment: Femur (Fixed in seated horizontal posture extending back)
    const femurGroup = new THREE.Group();
    const femurLength = 1.6;
    const femurGeo = new THREE.CylinderGeometry(0.18, 0.22, femurLength, 20);
    const femurMesh = new THREE.Mesh(femurGeo, boneMaterial);
    femurMesh.position.y = femurLength / 2;
    femurGroup.add(femurMesh);

    // Femur Wireframe Overlay
    const femurWire = new THREE.Mesh(femurGeo, cyanAccentMaterial);
    femurWire.position.y = femurLength / 2;
    femurWire.scale.set(1.04, 1, 1.04);
    femurGroup.add(femurWire);

    // Femur head / hip marker
    const hipMarker = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), glowTealMaterial);
    hipMarker.position.y = femurLength;
    femurGroup.add(hipMarker);

    // Orient Femur seated horizontally (pointing towards -Z or -Y)
    femurGroup.rotation.z = Math.PI / 2; // Horizontal femur
    kneePivot.add(femurGroup);

    // Lower Segment: Tibia Group (Articulates around Knee Pivot)
    const tibiaGroup = new THREE.Group();
    tibiaGroupRef.current = tibiaGroup;

    const tibiaLength = 1.6;
    const tibiaGeo = new THREE.CylinderGeometry(0.18, 0.14, tibiaLength, 20);
    const tibiaMesh = new THREE.Mesh(tibiaGeo, boneMaterial);
    tibiaMesh.position.y = -tibiaLength / 2;
    tibiaGroup.add(tibiaMesh);

    const tibiaWire = new THREE.Mesh(tibiaGeo, cyanAccentMaterial);
    tibiaWire.position.y = -tibiaLength / 2;
    tibiaWire.scale.set(1.04, 1, 1.04);
    tibiaGroup.add(tibiaWire);

    // Ankle / Foot Marker
    const ankleGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const ankleMesh = new THREE.Mesh(ankleGeo, glowTealMaterial);
    ankleMesh.position.y = -tibiaLength;
    tibiaGroup.add(ankleMesh);

    // Foot segment
    const footGeo = new THREE.BoxGeometry(0.18, 0.12, 0.45);
    const footMesh = new THREE.Mesh(footGeo, boneMaterial);
    footMesh.position.set(0, -tibiaLength - 0.08, 0.15);
    tibiaGroup.add(footMesh);

    kneePivot.add(tibiaGroup);

    // 8. Dynamic Arc Line for Range of Motion Indicator
    const arcPoints: THREE.Vector3[] = [];
    const arcRadius = 0.85;
    for (let i = 0; i <= 36; i++) {
      const rad = (i / 36) * (Math.PI / 2);
      arcPoints.push(new THREE.Vector3(0, -arcRadius * Math.cos(rad), arcRadius * Math.sin(rad)));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0x14b8a6,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    arcLine.computeLineDistances();
    kneePivot.add(arcLine);

    // 9. Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (isPlayingRef.current) {
        cycleTimeRef.current += 0.024;
        // Smooth sine oscillation between 90° (bent, y=-tibiaLength) and 172° (nearly straight)
        const progress = (Math.sin(cycleTimeRef.current) + 1) / 2; // 0 to 1
        const targetDeg = 90 + progress * 82; // 90° to 172°
        angleLabelRef.current = Math.round(targetDeg);

        // Convert angle to rotation on Tibia:
        // At 90°, tibia hangs down (rotation.x = 0)
        // At 180°, tibia extends forward horizontal (rotation.x = -PI/2)
        const rotX = -((targetDeg - 90) * Math.PI) / 180;
        if (tibiaGroupRef.current) {
          tibiaGroupRef.current.rotation.x = rotX;
        }

        // Slowly update React state for angle display
        if (Math.floor(cycleTimeRef.current * 10) % 3 === 0) {
          setCurrentAngle(Math.round(targetDeg));
        }
      }

      // Slowly rotate knee condo ring
      jointRing.rotation.z += 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize Listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Handle Preset Clicks
  const handleSetPreset = (preset: 'cycle' | '90' | '140' | '175') => {
    setActivePreset(preset);
    if (preset === 'cycle') {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      const angle = parseInt(preset, 10);
      setCurrentAngle(angle);
      if (tibiaGroupRef.current) {
        const rotX = -((angle - 90) * Math.PI) / 180;
        tibiaGroupRef.current.rotation.x = rotX;
      }
    }
  };

  // Mouse drag orbit
  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    cameraOrbitRef.current.theta += deltaX * 0.008;
    cameraOrbitRef.current.phi -= deltaY * 0.008;
    updateCameraPosition();
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden card-3d">
      {/* 3D Ambient Glowing Mesh Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Overlay Badge & Telemetry */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/30 text-teal-300 text-xs font-bold backdrop-blur-md shadow-xs">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            3D Biomechanical Kinematics
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[11px] backdrop-blur-md">
            <Eye className="w-3 h-3 text-teal-400" />
            Interactive Orbit
          </span>
        </div>

        {/* Live Floating Angle HUD Card */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/70 px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-lg">
          <Activity className="w-4 h-4 text-teal-400 animate-bounce" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Articulating Angle</span>
            <span className="text-lg font-black text-white font-mono tracking-tight">
              {currentAngle}°
            </span>
          </div>
        </div>
      </div>

      {/* Three.js Canvas Container with Drag-to-Orbit */}
      <div
        ref={mountRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Bottom Floating Controls Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Playback Controls & Presets */}
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-lg">
          <button
            type="button"
            onClick={() => handleSetPreset('cycle')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'cycle'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Motion' : 'Auto Cycle'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('90')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === '90'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            90° (Rest)
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('140')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === '140'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            140° (Mid)
          </button>

          <button
            type="button"
            onClick={() => handleSetPreset('175')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === '175'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            175° (Ext)
          </button>
        </div>

        {/* Reset Camera View */}
        <button
          type="button"
          onClick={resetView}
          className="p-2 rounded-xl bg-slate-900/85 backdrop-blur-md text-slate-400 hover:text-white border border-slate-700/60 shadow-lg hover:bg-slate-800 transition-colors"
          title="Reset 3D camera angle"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
