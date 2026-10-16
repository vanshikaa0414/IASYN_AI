import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VioletDigitalGlobeProps {
  className?: string;
  size?: number;
}

export const VioletDigitalGlobe: React.FC<VioletDigitalGlobeProps> = ({ 
  className = "w-[480px] h-[480px] md:w-[620px] md:h-[620px]",
  size = 600
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || size;
    const height = container.clientHeight || size;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Procedural Point Glow Texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(167, 139, 250, 0.95)');
    grad.addColorStop(0.5, 'rgba(124, 108, 245, 0.45)');
    grad.addColorStop(0.8, 'rgba(125, 232, 240, 0.15)');
    grad.addColorStop(1, 'rgba(5, 5, 9, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const pointTexture = new THREE.CanvasTexture(canvas);

    // 3. Globe Group
    const globeGroup = new THREE.Group();
    // Tilt slightly like Earth's axis
    globeGroup.rotation.z = 0.22;
    globeGroup.rotation.x = 0.18;
    scene.add(globeGroup);

    // 4. Digital Globe Point Matrix (Fibonacci Sphere)
    const POINT_COUNT = 3600;
    const sphereRadius = 1.6;
    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);

    const colorViolet = new THREE.Color(0xa78bfa);
    const colorDeepViolet = new THREE.Color(0x7c6cf5);
    const colorCyan = new THREE.Color(0x7de8f0);
    const colorWhite = new THREE.Color(0xffffff);

    const phi = Math.PI * (Math.sqrt(5) - 1); // Golden angle

    for (let i = 0; i < POINT_COUNT; i++) {
      const y = 1 - (i / (POINT_COUNT - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const i3 = i * 3;
      positions[i3] = x * sphereRadius;
      positions[i3 + 1] = y * sphereRadius;
      positions[i3 + 2] = z * sphereRadius;

      // Color variation
      const rand = Math.random();
      let c: THREE.Color;
      if (rand < 0.55) c = colorViolet;
      else if (rand < 0.85) c = colorDeepViolet;
      else if (rand < 0.96) c = colorCyan;
      else c = colorWhite;

      c.toArray(colors, i3);
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.055,
      map: pointTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(pointGeo, pointMat);
    globeGroup.add(pointCloud);

    // 5. Latitude and Longitude Grid Lines
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x7c6cf5,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });

    // Latitude rings
    const latRings: THREE.Line[] = [];
    const latitudes = [-1.1, -0.6, 0, 0.6, 1.1];
    latitudes.forEach((latY) => {
      const r = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - latY * latY));
      const segments = 96;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, latY, Math.sin(a) * r));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, gridMat);
      globeGroup.add(line);
      latRings.push(line);
    });

    // Longitude meridians
    const meridianCount = 8;
    for (let m = 0; m < meridianCount; m++) {
      const mAngle = (m / meridianCount) * Math.PI;
      const segments = 96;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const x = Math.sin(a) * sphereRadius * Math.cos(mAngle);
        const y = Math.cos(a) * sphereRadius;
        const z = Math.sin(a) * sphereRadius * Math.sin(mAngle);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, gridMat);
      globeGroup.add(line);
      latRings.push(line);
    }

    // 6. Glowing Orbital Equator Rings
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const orbitRadius = sphereRadius * 1.35;
    const orbitPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 128; s++) {
      const a = (s / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, Math.sin(a) * orbitRadius, 0));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitRing = new THREE.Line(orbitGeo, orbitMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    globeGroup.add(orbitRing);

    // 7. Atmospheric Backlight Glow Aura
    const glowGeo = new THREE.PlaneGeometry(sphereRadius * 3.2, sphereRadius * 3.2);
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gCtx = glowCanvas.getContext('2d')!;
    const gGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gGrad.addColorStop(0, 'rgba(167, 139, 250, 0.28)');
    gGrad.addColorStop(0.4, 'rgba(124, 108, 245, 0.12)');
    gGrad.addColorStop(0.8, 'rgba(125, 232, 240, 0.03)');
    gGrad.addColorStop(1, 'rgba(5, 5, 9, 0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = -0.3;
    scene.add(glowMesh);

    // 8. Mouse drag & pointer interaction
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      mouse.targetX = (clientX / width - 0.5) * 0.4;
      mouse.targetY = (clientY / height - 0.5) * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 9. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Smooth continuous rotation
      globeGroup.rotation.y += delta * 0.18;
      orbitRing.rotation.z -= delta * 0.08;

      // Mouse damping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x;
      camera.position.y = -mouse.y;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      pointGeo.dispose();
      pointMat.dispose();
      pointTexture.dispose();
      gridMat.dispose();
      orbitGeo.dispose();
      orbitMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      glowTexture.dispose();

      latRings.forEach((line) => {
        line.geometry.dispose();
      });

      renderer.dispose();
    };
  }, [size]);

  return (
    <div 
      ref={mountRef} 
      className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}
    />
  );
};
