/* Hero 3D: a procedural case-file opening, rendered on load.

   Self-contained - no external 3D model, so it has no dependency on the
   Higgsfield imagery work planned for a later phase. Only runs if
   #hero-3d-canvas exists, has a real size, and the visitor hasn't asked
   for reduced motion.

   Two things worth knowing before changing the numbers below:

   1. The canvas is PORTRAIT (a ~320px-wide column running the height of
      the hero), so the lid is hinged on the TOP edge and opens upward.
      A side-hinged lid needs landscape space and swings straight out of
      frame in a column this shape.

   2. The camera is FITTED to the geometry at runtime rather than placed
      at a hardcoded distance - see fitCamera(). Hardcoding a distance
      means guessing the canvas aspect, and the guess breaks the moment
      the hero changes height or the panel is resized. */
import * as THREE from './Assets/vendor/three.module.min.js';

var reduceMotion = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var canvas = document.getElementById('hero-3d-canvas');

/* clientWidth/Height are 0 while the panel is display:none (below 1151px).
   Building a WebGL context for a zero-size canvas gives a NaN aspect ratio
   and wastes a context on something nobody can see. */
if (canvas && !reduceMotion && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
  var PANEL_W = 3;
  var PANEL_H = 4;
  var OPEN_ANGLE = Math.PI * 0.64;   /* ~115deg: open and clearly 3D, but
                                        still reading as a folder rather
                                        than two flat panels end to end */
  var OPEN_DURATION_MS = 1100;
  var FIT_MARGIN = 1.18;             /* breathing room around the geometry */

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var folderColor = new THREE.Color(0xD9D2BC);
  var edgeColor = new THREE.Color(0x1C1A15);

  function panel() {
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshBasicMaterial({ color: folderColor, side: THREE.DoubleSide })
    );
    mesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: edgeColor })
    ));
    return mesh;
  }

  /* Back page, centred on the origin. */
  var back = panel();
  scene.add(back);

  /* Lid, hinged on the shared top edge. The pivot sits at that edge and the
     lid hangs down from it, so at rotation 0 the lid covers the back page
     exactly (the closed folder) and rotating opens it upward and away. */
  var lidPivot = new THREE.Group();
  lidPivot.position.y = PANEL_H / 2;
  var lid = panel();
  lid.position.y = -PANEL_H / 2;
  lidPivot.add(lid);
  scene.add(lidPivot);

  /* Frame the camera on the geometry's OPEN state (its widest extent), so
     the finished, resting composition is what fits - not the closed state
     it only passes through for a moment on the way there. */
  function fitCamera() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return false;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    var resting = lidPivot.rotation.x;
    lidPivot.rotation.x = OPEN_ANGLE;
    scene.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(scene);
    lidPivot.rotation.x = resting;
    scene.updateMatrixWorld(true);

    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());

    var halfFov = (camera.fov * Math.PI / 180) / 2;
    var distForHeight = (size.y * FIT_MARGIN / 2) / Math.tan(halfFov);
    var distForWidth = (size.x * FIT_MARGIN / 2) / (Math.tan(halfFov) * camera.aspect);
    var dist = Math.max(distForHeight, distForWidth) + size.z / 2;

    camera.position.set(center.x, center.y, center.z + dist);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    return true;
  }

  lidPivot.rotation.x = 0;
  fitCamera();

  var startTime = null;
  var running = true;
  function tick(now) {
    if (startTime === null) startTime = now;
    var t = Math.min(1, (now - startTime) / OPEN_DURATION_MS);
    var eased = 1 - Math.pow(1 - t, 3);
    lidPivot.rotation.x = OPEN_ANGLE * eased;
    renderer.render(scene, camera);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
  requestAnimationFrame(tick);

  /* Without this the single rendered frame is just stretched by CSS after a
     resize, and the fit computed for the old size no longer holds. */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (fitCamera() && !running) renderer.render(scene, camera);
    }, 150);
  });
}
