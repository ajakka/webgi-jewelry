import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

const BACKGROUND_COLOR = "#FFFFFF";
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 2.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -5 * t)),
  direction: "vertical",
  gestureDirection: "vertical",
  mouseMultiplier: 1,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

const diamondsObjectNames = [
  "diamonds",
  "diamonds001",
  "diamonds002",
  "diamonds003",
  "diamonds004",
  "diamonds005",
];

const diamondsObjectNames2 = ["Object"];

class RingConfigurator {
  constructor() {
    this.init();
    this.setupViewer();
  }

  init() {
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    this.nightMode = false;
    this.firstLoad = true;
    this.ringModel = 1;
    this.usingCustomColors = false;
    this.colorLerpValue = { x: 0 };
    this.colorLerpValue2 = { x: 0 };
    this.needsUpdate = false;

    // DOM Elements
    this.canvas = document.getElementById("webgi-canvas");
    this.exploreView = document.querySelector(".cam-view-3");
    this.canvasView = document.getElementById("webgi-canvas");
    this.canvasContainer = document.getElementById("webgi-canvas-container");
    this.exitContainer = document.querySelector(".exit--container");
    this.loaderElement = document.querySelector(".loader");
    this.header = document.querySelector(".header");
    this.camView1 = document.querySelector(".cam-view-1");
    this.camView2 = document.querySelector(".cam-view-2");
    this.camView3 = document.querySelector(".cam-view-3");
    this.gemMenu = document.querySelector(".gem--menu");
    this.footerContainer = document.querySelector(".footer--container");
    this.footerMenu = document.querySelector(".footer--menu");
    this.materialsMenu = document.querySelector(".materials--menu");
    this.configMaterial = document.querySelector(".config--material");
    this.configGem = document.querySelector(".config--gem");
    this.closeConfigMaterial = document.querySelector(".close-materials");
    this.configRing = document.querySelector(".config--ring");
    this.closeConfigGem = document.querySelector(".close-gems");
    this.sidebar = document.querySelector(".side-bar");
  }

  async setupViewer() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(3, -0.8, 1.2);
    this.camera.lookAt(2.5, -0.07, -0.1);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Post-processing setup
    this.setupPostProcessing();

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lighting setup
    this.setupLighting();

    // Load model
    await this.loadModel();

    // Event listeners
    this.setupEventListeners();

    // Start animation loop
    this.animate();

    // Initial setup
    window.scrollTo(0, 0);
    if (this.firstLoad) {
      this.introAnimation();
    }
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    // SSAO pass
    this.ssaoPass = new SSAOPass(this.scene, this.camera);
    this.ssaoPass.kernelRadius = 16;
    this.composer.addPass(this.ssaoPass);

    // SMAA pass
    if (!this.isMobile) {
      const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
      this.composer.addPass(smaaPass);
    }

    // Mobile optimizations
    if (this.isMobile) {
      this.bloomPass.strength = 0.5;
      this.ssaoPass.kernelRadius = 8;
    }
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 5, -5);
    this.scene.add(pointLight);
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    loader.setDRACOLoader(dracoLoader);

    const progressBar = document.querySelector(".progress");

    loader.onProgress = (url, loaded, total) => {
      const progress = loaded / total || 0;
      progressBar?.setAttribute("style", `transform: scaleX(${progress})`);
    };

    try {
      const gltf = await loader.loadAsync("./assets/ring_webgi.glb");
      this.ring = gltf.scene;
      this.scene.add(this.ring);

      // Get model components
      this.silver = this.ring.getObjectByName("silver");
      this.gold = this.ring.getObjectByName("gold");
      this.diamondObjects = [];

      // Setup materials
      const diamondMaterial = new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      });

      const metalMaterial = new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1,
      });

      // Apply materials
      this.silver.material = metalMaterial.clone();
      this.gold.material = metalMaterial.clone();
      this.gold.material.color.setHex(0xe2bf7f);

      // Setup diamonds
      const objectNames =
        this.ringModel === 1 ? diamondsObjectNames : diamondsObjectNames2;
      for (const name of objectNames) {
        const diamond = this.ring.getObjectByName(name);
        if (diamond) {
          diamond.material = diamondMaterial.clone();
          this.diamondObjects.push(diamond);
        }
      }

      gsap.to(this.loaderElement, {
        x: "100%",
        duration: 0.8,
        ease: "power4.inOut",
        delay: 1,
      });
    } catch (error) {
      console.error(error);
    }
  }

  setupEventListeners() {
    // Resize handler
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    // Customize button
    document.querySelector(".btn-customize")?.addEventListener("click", () => {
      this.enterCustomizeMode();
    });

    // Exit button
    document.querySelector(".button--exit")?.addEventListener("click", () => {
      this.exitCustomizeMode();
    });

    // Night mode
    document.querySelector(".night--mode")?.addEventListener("click", () => {
      this.toggleNightMode();
    });

    // Setup other event listeners from original code
    this.setupMaterialEventListeners();
    this.setupGemEventListeners();
    this.setupScrollListeners();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.controls.enabled) {
      this.controls.update();
    }

    if (this.needsUpdate) {
      this.camera.updateProjectionMatrix();
      this.needsUpdate = false;
    }

    this.composer.render();
  }

  introAnimation() {
    const introTL = gsap.timeline();
    introTL
      .to(this.loaderElement, {
        x: "100%",
        duration: 0.8,
        ease: "power4.inOut",
        delay: 1,
      })
      .fromTo(
        this.camera.position,
        {
          x: this.isMobile ? 3 : 3,
          y: this.isMobile ? -0.8 : -0.8,
          z: this.isMobile ? 1.2 : 1.2,
        },
        {
          x: this.isMobile ? 1.28 : 1.28,
          y: this.isMobile ? -1.7 : -1.7,
          z: this.isMobile ? 5.86 : 5.86,
          duration: 4,
          onUpdate: () => {
            this.needsUpdate = true;
          },
        },
        "-=0.8"
      )
      // Additional animations from original code...
      .fromTo(
        ".hero--container",
        { opacity: 0, x: "100%" },
        {
          opacity: 1,
          x: "0%",
          ease: "power4.inOut",
          duration: 1.8,
          onComplete: () => this.setupScrollAnimation(),
        },
        "-=1"
      );

    this.firstLoad = false;
  }

  setupScrollAnimation() {
    document.body.style.overflowY = "scroll";

    const tl = gsap.timeline({ default: { ease: "none" } });

    // Forever section
    tl.to(this.camera.position, {
      x: -1.83,
      y: -0.14,
      z: 6.15,
      scrollTrigger: {
        trigger: ".cam-view-2",
        start: "top bottom",
        end: "top top",
        scrub: true,
        immediateRender: false,
      },
      onUpdate: () => {
        this.needsUpdate = true;
      },
    })
      // Additional scroll animations from original code...
      .to(this.ring.rotation, {
        x: this.ringModel == 1 ? 0 : -Math.PI / 3,
        y: this.ringModel == 1 ? 0 : -0.92,
        z: this.ringModel == 1 ? Math.PI / 2 : 0,
        scrollTrigger: {
          trigger: ".cam-view-2",
          start: "top bottom",
          end: "top top",
          scrub: true,
          immediateRender: false,
        },
      });

    // Setup color transitions
    this.setupColorTransitions(tl);
  }

  setupColorTransitions(timeline) {
    timeline.fromTo(
      this.colorLerpValue,
      { x: 0 },
      {
        x: 1,
        scrollTrigger: {
          trigger: ".cam-view-2",
          start: "top bottom",
          end: "top top",
          scrub: true,
          immediateRender: false,
        },
        onUpdate: () => {
          if (!this.usingCustomColors) {
            this.silver.material.color.lerpColors(
              new THREE.Color(0xfefefe),
              new THREE.Color(0xd28b8b),
              this.colorLerpValue.x
            );
            this.gold.material.color.lerpColors(
              new THREE.Color(0xe2bf7f),
              new THREE.Color(0xd28b8b),
              this.colorLerpValue.x
            );
            this.diamondObjects.forEach((diamond) => {
              diamond.material.color.lerpColors(
                new THREE.Color(0xffffff),
                new THREE.Color(0x39cffe),
                this.colorLerpValue.x
              );
            });
          }
        },
      }
    );
  }

  changeDiamondColor(color) {
    this.diamondObjects.forEach((diamond) => {
      diamond.material.color.set(color);
    });
    this.usingCustomColors = true;
  }

  changeMaterialColor(silverColor, goldColor) {
    this.silver.material.color.set(silverColor);
    this.gold.material.color.set(goldColor);
    this.usingCustomColors = true;
  }

  async changeRingModel() {
    gsap.to(".loader", {
      x: "0%",
      duration: 0.8,
      ease: "power4.inOut",
      onComplete: async () => {
        // Remove current model
        this.scene.remove(this.ring);

        // Load new model
        const loader = new GLTFLoader();
        const modelPath =
          this.ringModel === 1
            ? "./assets/ring2_webgi.glb"
            : "./assets/ring_webgi.glb";

        try {
          const gltf = await loader.loadAsync(modelPath);
          this.ring = gltf.scene;
          this.scene.add(this.ring);

          // Update references and materials
          // Continuing from previous section...
          if (this.ringModel === 1) {
            this.silver = this.ring.getObjectByName("alliance");
            this.gold = this.ring.getObjectByName("entourage");
            this.diamondObjects = [];

            for (const obj of diamondsObjectNames2) {
              const diamond = this.ring.getObjectByName(obj);
              if (diamond) this.diamondObjects.push(diamond);
            }

            this.ring.rotation.set(Math.PI / 2, 0.92, 0);
            this.ringModel = 2;
          } else {
            this.silver = this.ring.getObjectByName("silver");
            this.gold = this.ring.getObjectByName("gold");
            this.diamondObjects = [];

            for (const obj of diamondsObjectNames) {
              const diamond = this.ring.getObjectByName(obj);
              if (diamond) this.diamondObjects.push(diamond);
            }

            this.ring.rotation.set(-Math.PI / 2, 0, 0);
            this.ringModel = 1;
          }

          // Reset materials
          const metalMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1,
          });

          const diamondMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
          });

          this.silver.material = metalMaterial.clone();
          this.gold.material = metalMaterial.clone();
          this.gold.material.color.setHex(0xe2bf7f);

          this.diamondObjects.forEach((diamond) => {
            diamond.material = diamondMaterial.clone();
          });

          // Reset camera and controls
          if (this.controls) {
            this.controls.autoRotate = true;
            this.controls.minDistance = 5;
            this.controls.maxDistance = 13;
            this.controls.enablePan = false;
            this.controls.screenSpacePanning = false;
          }

          gsap.to(this.loaderElement, {
            x: "100%",
            duration: 0.8,
            ease: "power4.inOut",
            delay: 1,
          });
        } catch (error) {
          console.error("Error loading new model:", error);
        }
      },
    });
  }

  toggleNightMode() {
    if (!this.nightMode) {
      this.header.classList.add("night--mode--filter");
      this.camView1.classList.add("night--mode--filter");
      this.camView2.classList.add("night--mode--filter");
      this.camView3.classList.add("night--mode--filter");
      this.exitContainer.classList.add("night--mode--filter");
      this.footerMenu.classList.add("night--mode--filter");
      this.scene.background = new THREE.Color("#22052F");
      this.nightMode = true;
    } else {
      this.header.classList.remove("night--mode--filter");
      this.camView1.classList.remove("night--mode--filter");
      this.camView2.classList.remove("night--mode--filter");
      this.camView3.classList.remove("night--mode--filter");
      this.exitContainer.classList.remove("night--mode--filter");
      this.footerMenu.classList.remove("night--mode--filter");
      this.scene.background = new THREE.Color(BACKGROUND_COLOR);
      this.nightMode = false;
    }
  }

  enterCustomizeMode() {
    this.exploreView.style.pointerEvents = "none";
    this.canvasView.style.pointerEvents = "all";
    this.canvasContainer.style.zIndex = "1";
    document.body.style.overflowY = "hidden";
    document.body.style.cursor = "grab";
    this.sidebar.style.display = "none";
    this.footerContainer.style.display = "flex";

    this.configAnimation();
  }

  exitCustomizeMode() {
    this.exploreView.style.pointerEvents = "all";
    this.canvasView.style.pointerEvents = "none";
    this.canvasContainer.style.zIndex = "unset";
    document.body.style.overflowY = "auto";
    this.exitContainer.style.display = "none";
    document.body.style.cursor = "auto";
    this.sidebar.style.display = "block";
    this.footerContainer.style.display = "none";

    this.exitConfigAnimation();
  }

  configAnimation() {
    lenis.stop();

    const tlExplore = gsap.timeline();
    tlExplore
      .to(this.camera.position, {
        x: -0.17,
        y: -0.25,
        z: 8.5,
        duration: 2.5,
        onUpdate: () => {
          this.needsUpdate = true;
        },
      })
      .to(
        this.camera.target,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: 2.5,
        },
        "-=2.5"
      )
      .to(
        this.ring.rotation,
        {
          x: this.ringModel == 1 ? -Math.PI / 2 : 0,
          y: 0,
          z: this.ringModel == 1 ? -Math.PI / 2 : 0,
          duration: 2.5,
        },
        "-=2.5"
      )
      .to(
        ".emotions--content",
        {
          opacity: 0,
          x: "130%",
          duration: 1.5,
          ease: "power4.out",
          onComplete: () => {
            this.exitContainer.style.display = "flex";
            if (this.controls) {
              this.controls.enabled = true;
              this.controls.autoRotate = true;
              this.controls.minDistance = 5;
              this.controls.maxDistance = 13;
              this.controls.enablePan = false;
              this.controls.screenSpacePanning = false;
            }
          },
        },
        "-=2.5"
      )
      .fromTo(
        ".footer--menu",
        { opacity: 0, y: "150%" },
        { opacity: 1, y: "0%", duration: 1.5 }
      );
  }

  exitConfigAnimation() {
    if (this.controls) {
      this.controls.enabled = true;
      this.controls.autoRotate = false;
      this.controls.minDistance = 0;
      this.controls.maxDistance = Infinity;
    }

    lenis.start();

    this.gemMenu.classList.remove("show");
    this.materialsMenu.classList.remove("show");
    if (document.querySelector(".footer--menu li.active")) {
      document
        .querySelector(".footer--menu li.active")
        ?.classList.remove("active");
    }

    const tlExit = gsap.timeline();
    tlExit
      .to(this.camera.position, {
        x: -0.06,
        y: -1.15,
        z: 4.42,
        duration: 1.2,
        ease: "power4.out",
        onUpdate: () => {
          this.needsUpdate = true;
        },
      })
      .to(
        this.camera.target,
        {
          x: -0.01,
          y: 0.9,
          z: 0.07,
          duration: 1.2,
          ease: "power4.out",
        },
        "-=1.2"
      )
      .to(
        this.ring.rotation,
        {
          x: this.ringModel == 1 ? 0 : 0.92,
          y: this.ringModel == 1 ? 0 : 0.92,
          z: this.ringModel == 1 ? -Math.PI / 2 : Math.PI / 3,
        },
        "-=1.2"
      )
      .to(".footer--menu", { opacity: 0, y: "150%" }, "-=1.2")
      .to(
        ".emotions--content",
        { opacity: 1, x: "0%", duration: 0.5, ease: "power4.out" },
        "-=1.2"
      );
  }

  setupMaterialEventListeners() {
    // Add material color change event listeners
    const materialButtons = {
      ".default": [0xfea04d, 0xffffff],
      ".silver-gold": [0xffffff, 0xfea04d],
      ".silver-silver": [0xffffff, 0xffffff],
      ".gold-gold": [0xfea04d, 0xfea04d],
      ".rose-silver": [0xfa8787, 0xffffff],
      ".gold-rose": [0xfea04d, 0xfa8787],
      ".rose-rose": [0xfa8787, 0xfa8787],
    };

    Object.entries(materialButtons).forEach(
      ([selector, [firstColor, secondColor]]) => {
        document.querySelector(selector)?.addEventListener("click", () => {
          this.changeMaterialColor(
            new THREE.Color(firstColor),
            new THREE.Color(secondColor)
          );
          document
            .querySelector(".materials--list li.active")
            ?.classList.remove("active");
          document.querySelector(selector)?.classList.add("active");
        });
      }
    );
  }

  setupGemEventListeners() {
    // Add gem color change event listeners
    const gemColors = {
      ".ruby": 0xf70db1,
      ".faint": 0xcfecec,
      ".fancy": 0xa9cbe2,
      ".aqua": 0x62cffe,
      ".swiss": 0x76dce4,
      ".yellow": 0xefe75b,
      ".orange": 0xeb8e17,
      ".green": 0x17ebb5,
      ".emerald": 0x5eca00,
      ".rose": 0xfa37d7,
      ".violet": 0xc200f2,
    };

    Object.entries(gemColors).forEach(([selector, color]) => {
      document.querySelector(selector)?.addEventListener("click", () => {
        this.changeDiamondColor(new THREE.Color(color));
        document
          .querySelector(".colors--list li.active")
          ?.classList.remove("active");
        document.querySelector(selector)?.classList.add("active");
      });
    });
  }
}

// Initialize the configurator
const ringConfigurator = new RingConfigurator();
