import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Landmark } from '@mediapipe/tasks-vision';
import { RotateCcw, Box, ShieldCheck, AlertCircle, Eye } from 'lucide-react';

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
  const boneMeshesRef = useRef<THREE.Mesh[]>([]);
  const monitoredKneeMeshRef = useRef<THREE.Mesh | null>(null);

  // Camera Orbit state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.55, phi: 0.15, radius: 2.1 });

  const monitoredKneeIndex = monitoredSide === 'right' ? 26 : 25;

  // Reset Camera View to optimal angled 3/4 profile
  const resetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0.55, phi: 0.15, radius: 2.1 };
    updateCameraPosition();
  }, []);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const clampedPhi = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, phi));
    cameraRef.current.position.x = radius * Math.cos(clampedPhi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.sin(clampedPhi);
    cameraRef.current.position.z = radius * Math.cos(clampedPhi) * Math.cos(theta);
    cameraRef.current.lookAt(0, -0.15, 0);
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d16); // Deep dark technology background
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

    container.appendChild(renderer.domElement);

    // 4. Lighting for rich 3D specular highlights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xa78bfa, 1.4);
    dirLight1.position.set(3, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7de8f0, 0.9);
    dirLight2.position.set(-3, 2, -2);
    scene.add(dirLight2);

    // 5. Floor Reference Grid with subtle violet/dark tones
    const grid = new THREE.GridHelper(2.4, 16, 0x7c6cf5, 0x171925);
    grid.position.y = -0.95;
    scene.add(grid);

    // 6. Joint Spheres with clearly visible dimensions
    // Standard joints: radius 0.038 (clearly visible, luminous cyan)
    const standardJointGeo = new THREE.SphereGeometry(0.038, 20, 20);
    const standardJointMat = new THREE.MeshStandardMaterial({
      color: 0x7de8f0,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.3,
    });

    // Hip joints: radius 0.044 (violet)
    const hipJointGeo = new THREE.SphereGeometry(0.044, 20, 20);
    const hipJointMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x7c6cf5,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Monitored Knee Joint: radius 0.062 (large beacon highlight)
    const highlightKneeGeo = new THREE.SphereGeometry(0.062, 24, 24);
    const highlightKneeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399, // Vibrant emerald/mint
      emissive: 0x059669,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.4,
    });

    TRACKED_JOINTS.forEach((idx) => {
      const isMonitored = idx === monitoredKneeIndex;
      const isHip = idx === 23 || idx === 24;

      let geo = standardJointGeo;
      let mat = standardJointMat;

      if (isMonitored) {
        geo = highlightKneeGeo;
        mat = highlightKneeMat;
      } else if (isHip) {
        geo = hipJointGeo;
        mat = hipJointMat;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      jointMeshesRef.current.set(idx, mesh);
      if (isMonitored) monitoredKneeMeshRef.current = mesh;
    });

    // 7. 3D Volumetric Cylinder Bones (Thick visible 3D limbs)
    const boneCylinderGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 12);
    // Rotate cylinder so its length aligns along Z axis for lookAt positioning
    boneCylinderGeo.rotateX(Math.PI / 2);

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x7c6cf5, // Deep violet
      emissive: 0x4f46e5,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.2,
    });

    const activeLegBoneMat = new THREE.MeshStandardMaterial({
      color: 0x7de8f0, // Cyan for monitored leg
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.3,
    });

    const boneMeshes: THREE.Mesh[] = [];
    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const isMonitoredLeg = 
        (startIdx === 24 && endIdx === 26) || (startIdx === 26 && endIdx === 28) || // right leg
        (startIdx === 23 && endIdx === 25) || (startIdx === 25 && endIdx === 27);    // left leg

      const mesh = new THREE.Mesh(
        boneCylinderGeo, 
        isMonitoredLeg ? activeLegBoneMat : boneMat
      );
      mesh.visible = false;
      scene.add(mesh);
      boneMeshes.push(mesh);
    });
    boneMeshesRef.current = boneMeshes;

    // 8. Mouse & Touch Drag Controls
    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta -= deltaX * 0.008;
      cameraAngleRef.current.phi += deltaY * 0.008;
      updateCameraPosition();

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(0.8, Math.min(3.8, cameraAngleRef.current.radius + e.deltaY * 0.002));
      updateCameraPosition();
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Touch controls
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

      cameraAngleRef.current.theta -= deltaX * 0.008;
      cameraAngleRef.current.phi += deltaY * 0.008;
      updateCameraPosition();

      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleTouchEnd);

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Animation Loop
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
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

      standardJointGeo.dispose();
      hipJointGeo.dispose();
      highlightKneeGeo.dispose();
      standardJointMat.dispose();
      hipJointMat.dispose();
      highlightKneeMat.dispose();
      boneCylinderGeo.dispose();
      boneMat.dispose();
      activeLegBoneMat.dispose();
      grid.geometry.dispose();

      renderer.dispose();
      if (dom.parentNode) {
        dom.parentNode.removeChild(dom);
      }
    };
  }, [monitoredKneeIndex]);

  // Update Joint and Volumetric Bone Positions when new worldLandmarks arrive
  useEffect(() => {
    if (!worldLandmarks || worldLandmarks.length < 29 || !isTracking) {
      // Hide all meshes if tracking is lost or insufficient
      jointMeshesRef.current.forEach((mesh) => {
        mesh.visible = false;
      });
      boneMeshesRef.current.forEach((mesh) => {
        mesh.visible = false;
      });
      return;
    }

    // MediaPipe world landmarks are metric with origin near hips.
    // Stable origin at pelvic midpoint
    const leftHip = worldLandmarks[23];
    const rightHip = worldLandmarks[24];
    const originX = (leftHip.x + rightHip.x) / 2;
    const originY = (leftHip.y + rightHip.y) / 2;
    const originZ = (leftHip.z + rightHip.z) / 2;

    const getVector3 = (lm: Landmark) => {
      return new THREE.Vector3(
        lm.x - originX,
        -(lm.y - originY), // Invert Y from MediaPipe down to Three.js up
        -(lm.z - originZ)  // Invert Z from camera-forward
      );
    };

    // 1. Update Joint Spheres
    const pointCache = new Map<number, THREE.Vector3>();

    TRACKED_JOINTS.forEach((idx) => {
      const mesh = jointMeshesRef.current.get(idx);
      const lm = worldLandmarks[idx];
      if (mesh && lm) {
        const pt = getVector3(lm);
        pointCache.set(idx, pt);
        mesh.position.copy(pt);
        mesh.visible = true;
      }
    });

    // 2. Update Thick 3D Bones
    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx], boneIdx) => {
      const boneMesh = boneMeshesRef.current[boneIdx];
      const p1 = pointCache.get(startIdx);
      const p2 = pointCache.get(endIdx);

      if (boneMesh && p1 && p2) {
        // Distance and midpoint
        const dist = p1.distanceTo(p2);
        if (dist > 0.01) {
          const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          boneMesh.position.copy(midpoint);

          // Scale length along Z axis
          boneMesh.scale.set(1, 1, dist);

          // Orient towards p2
          boneMesh.lookAt(p2);
          boneMesh.visible = true;
        } else {
          boneMesh.visible = false;
        }
      } else if (boneMesh) {
        boneMesh.visible = false;
      }
    });
  }, [worldLandmarks, isTracking]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden bg-[#0B0D16] border border-white/10 shadow-xl flex items-center justify-center">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-[#11131D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2 shadow-md">
          <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-[#7DE8F0] animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-bold text-[11px] tracking-wider uppercase font-mono">
            3D Biomechanical Skeleton
          </span>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={resetCamera}
          className="p-2 rounded-xl bg-[#11131D]/85 hover:bg-[#171925] border border-white/10 text-[#B7B8C8] hover:text-white transition-colors shadow-md"
          title="Reset 3D Camera Angle"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Status Tag */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none text-[11px] font-mono">
        <div className="bg-[#11131D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[#B7B8C8] flex items-center gap-2">
          <span>MONITORED:</span>
          <span className="text-[#34D399] font-bold uppercase">{monitoredSide} KNEE</span>
        </div>

        <div className="bg-[#11131D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[#85879C]">
          <span>DRAG TO ORBIT • SCROLL TO ZOOM</span>
        </div>
      </div>

      {/* Tracking Lost / Inactive Placeholder Overlay */}
      {(!isTracking || !worldLandmarks || worldLandmarks.length < 29) && (
        <div className="absolute inset-0 z-20 bg-[#0B0D16]/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#11131D] border border-white/10 flex items-center justify-center text-[#A78BFA] mb-3 shadow-inner">
            <Box className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Awaiting World Landmarks</h4>
          <p className="text-xs text-[#85879C] max-w-xs leading-relaxed">
            Position your entire lower limb inside the webcam view to project real-time 3D skeleton kinematics.
          </p>
        </div>
      )}
    </div>
  );
};
