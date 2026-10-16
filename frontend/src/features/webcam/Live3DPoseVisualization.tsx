import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Landmark } from '@mediapipe/tasks-vision';
import { RotateCcw, Box, ShieldCheck, AlertCircle } from 'lucide-react';

interface Live3DPoseVisualizationProps {
  worldLandmarks: Landmark[] | null;
  monitoredSide?: 'right' | 'left';
  isTracking: boolean;
}

// MediaPipe anatomical bone connections
const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso & Pelvis
  [11, 12], // shoulder to shoulder
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  [23, 24], // hip to hip
  // Left Arm
  [11, 13], // left shoulder to elbow
  [13, 15], // left elbow to wrist
  // Right Arm
  [12, 14], // right shoulder to elbow
  [14, 16], // right elbow to wrist
  // Left Leg
  [23, 25], // left hip to knee
  [25, 27], // left knee to ankle
  [27, 31], // left ankle to foot
  // Right Leg
  [24, 26], // right hip to knee
  [26, 28], // right knee to ankle
  [28, 32], // right ankle to foot
  // Head / Neck
  [11, 0],
  [12, 0],
];

// Relevant landmarks to render as joint spheres
const TRACKED_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];

export const Live3DPoseVisualization: React.FC<Live3DPoseVisualizationProps> = ({
  worldLandmarks,
  monitoredSide = 'right',
  isTracking,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mesh refs for updating geometry in place
  const jointMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const lineSegmentsRef = useRef<THREE.LineSegments | null>(null);
  const monitoredKneeMeshRef = useRef<THREE.Mesh | null>(null);

  // Camera Orbit state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.6, phi: 0.25, radius: 1.8 });

  const monitoredKneeIndex = monitoredSide === 'right' ? 26 : 25;

  // Reset Camera View to optimal default angled side profile
  const resetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.7, phi: 0.2, radius: 1.7 };
    updateCameraPosition();
  }, []);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const clampedPhi = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, phi));
    cameraRef.current.position.x = radius * Math.cos(clampedPhi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.sin(clampedPhi);
    cameraRef.current.position.z = radius * Math.cos(clampedPhi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 320;
    const height = containerRef.current.clientHeight || 280;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep clinical slate
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    // Append canvas
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x5eead4, 1.2);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    // 5. Floor Reference Grid
    const grid = new THREE.GridHelper(1.8, 12, 0x14b8a6, 0x1e293b);
    grid.position.y = -0.75;
    scene.add(grid);

    // 6. Joint Spheres
    const jointGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const standardJointMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Sky blue
      roughness: 0.3,
      metalness: 0.2,
    });

    const highlightKneeGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const highlightKneeMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6, // Bright clinical teal
      emissive: 0x0d9488,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    TRACKED_JOINTS.forEach((idx) => {
      const isMonitored = idx === monitoredKneeIndex;
      const mesh = new THREE.Mesh(
        isMonitored ? highlightKneeGeo : jointGeo,
        isMonitored ? highlightKneeMat : standardJointMat
      );
      mesh.visible = false;
      scene.add(mesh);
      jointMeshesRef.current.set(idx, mesh);
      if (isMonitored) monitoredKneeMeshRef.current = mesh;
    });

    // 7. Bone Lines Geometry
    const linePositions = new Float32Array(SKELETON_CONNECTIONS.length * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2dd4bf, // Teal skeleton limbs
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });

    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);
    lineSegmentsRef.current = lines;

    // Mouse Drag Rotation and Zoom Handlers
    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta -= deltaX * 0.01;
      cameraAngleRef.current.phi += deltaY * 0.01;
      updateCameraPosition();

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(0.6, Math.min(3.5, cameraAngleRef.current.radius + e.deltaY * 0.002));
      updateCameraPosition();
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Touch support for mobile devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta -= deltaX * 0.01;
      cameraAngleRef.current.phi += deltaY * 0.01;
      updateCameraPosition();

      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleTouchEnd);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Render loop
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();

      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleTouchEnd);

      // Dispose Three.js objects
      jointGeo.dispose();
      highlightKneeGeo.dispose();
      standardJointMat.dispose();
      highlightKneeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();

      if (dom.parentNode) {
        dom.parentNode.removeChild(dom);
      }
    };
  }, []);

  // Update Joint and Line Positions when new worldLandmarks arrive
  useEffect(() => {
    if (!lineSegmentsRef.current) return;

    if (!worldLandmarks || worldLandmarks.length < 29 || !isTracking) {
      // Hide all meshes if tracking is lost or insufficient
      jointMeshesRef.current.forEach((mesh) => {
        mesh.visible = false;
      });
      lineSegmentsRef.current.visible = false;
      return;
    }

    // MediaPipe world landmarks are metric with origin near hips.
    // Let's compute pelvic center for relative stability
    const leftHip = worldLandmarks[23];
    const rightHip = worldLandmarks[24];
    const originX = (leftHip.x + rightHip.x) / 2;
    const originY = (leftHip.y + rightHip.y) / 2;
    const originZ = (leftHip.z + rightHip.z) / 2;

    // Helper: convert MediaPipe world coordinate to Three.js coordinate
    // MediaPipe: +X is right, +Y is down (invert to up in Three.js), +Z is towards camera (invert)
    const getPoint = (lm: Landmark) => {
      return {
        x: lm.x - originX,
        y: -(lm.y - originY),
        z: -(lm.z - originZ),
      };
    };

    // Update Joints
    TRACKED_JOINTS.forEach((idx) => {
      const mesh = jointMeshesRef.current.get(idx);
      const lm = worldLandmarks[idx];
      if (mesh && lm) {
        const pt = getPoint(lm);
        mesh.position.set(pt.x, pt.y, pt.z);
        mesh.visible = true;
      }
    });

    // Update Bone Lines
    const lineGeo = lineSegmentsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = lineGeo.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    let pIdx = 0;
    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const startLm = worldLandmarks[startIdx];
      const endLm = worldLandmarks[endIdx];

      if (startLm && endLm) {
        const p1 = getPoint(startLm);
        const p2 = getPoint(endLm);

        posArray[pIdx++] = p1.x;
        posArray[pIdx++] = p1.y;
        posArray[pIdx++] = p1.z;

        posArray[pIdx++] = p2.x;
        posArray[pIdx++] = p2.y;
        posArray[pIdx++] = p2.z;
      } else {
        pIdx += 6;
      }
    });

    posAttr.needsUpdate = true;
    lineSegmentsRef.current.visible = true;
  }, [worldLandmarks, isTracking, monitoredKneeIndex]);

  const hasValidPose = isTracking && worldLandmarks && worldLandmarks.length >= 29;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
      {/* 3D Header Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-slate-200">Live 3D Pose Visualization</span>
          {hasValidPose ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-[10px] font-semibold text-teal-300">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Tracking Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800/80 text-[10px] font-semibold text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Insufficient Tracking
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={resetCamera}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
          title="Reset 3D Camera Orbit"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset View</span>
        </button>
      </div>

      {/* 3D Canvas Container */}
      <div className="relative flex-1 min-h-[260px] w-full" ref={containerRef}>
        {!hasValidPose && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-xs z-10 pointer-events-none">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
            <p className="text-slate-200 font-semibold text-sm mb-1">
              3D pose unavailable — insufficient tracking.
            </p>
            <p className="text-slate-400 text-xs max-w-xs">
              Position webcam to capture your side profile (hip, knee, and ankle visible).
            </p>
          </div>
        )}

        {/* Orbit Helper Tip */}
        {hasValidPose && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="text-[10px] bg-slate-900/80 backdrop-blur-xs text-slate-400 px-2 py-0.5 rounded-md border border-slate-800">
              Drag to rotate • Scroll to zoom
            </span>
          </div>
        )}
      </div>

      {/* 3D Footer Clinical Disclaimer */}
      <div className="bg-slate-950 px-3.5 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>Active Joint: <strong className="text-teal-400 capitalize">{monitoredSide} Knee</strong></span>
        <span>Estimated monocular metric pose</span>
      </div>
    </div>
  );
};
