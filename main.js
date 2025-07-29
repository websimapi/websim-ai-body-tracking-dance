import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Pose } from '@mediapipe/pose';
import * as CameraUtils from '@mediapipe/camera_utils';
import { AvatarController } from './AvatarController.js';

class DanceApp {
    constructor() {
        this.container = document.getElementById('container');
        this.canvas = document.getElementById('c');
        this.videoElement = document.getElementById('input-video');
        this.audioElement = document.getElementById('audio-player');
        this.startButton = document.getElementById('startButton');
        this.audioControls = document.getElementById('audio-controls');
        this.audioFileInput = document.getElementById('audioFile');
        this.loadingText = document.getElementById('loading-text');

        this.avatarController = null;
        this.isExperienceStarted = false;

        this.setupScene();
        this.setupLights();
        this.loadModel();
        this.bindEvents();
    }

    setupScene() {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 3);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 2, 3);
        this.scene.add(directionalLight);
    }

    loadModel() {
        this.loadingText.classList.remove('hidden');
        const loader = new GLTFLoader();
        loader.load('https://cdn.jsdelivr.net/npm/three@0.138/examples/models/gltf/RobotExpressive.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(0.8, 0.8, 0.8);
            this.model.position.y = -1.2;
            this.scene.add(this.model);

            // Hide loading text and enable start button
            this.loadingText.classList.add('hidden');
            this.startButton.disabled = false;
            
            this.avatarController = new AvatarController(this.model);
        }, undefined, (error) => {
            console.error(error);
            this.loadingText.textContent = "Failed to load model.";
        });
    }

    setupMediaPipe() {
        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            selfieMode: true,
        });

        pose.onResults(this.onPoseResults.bind(this));

        this.cameraHelper = new CameraUtils.Camera(this.videoElement, {
            onFrame: async () => {
                await pose.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });
        this.cameraHelper.start();
    }

    onPoseResults(results) {
        if (!results.poseWorldLandmarks || !this.avatarController) {
            return;
        }
        this.avatarController.update(results.poseWorldLandmarks);
    }
    
    startExperience() {
        if (this.isExperienceStarted) return;
        this.isExperienceStarted = true;

        this.startButton.style.display = 'none';
        this.audioControls.classList.remove('hidden');
        this.videoElement.classList.remove('hidden');

        // Check for camera permissions and start mediapipe
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(() => {
                    this.setupMediaPipe();
                })
                .catch(err => {
                    console.error("Error accessing webcam: ", err);
                    alert("Could not access webcam. Please allow camera access and refresh.");
                });
        } else {
            alert("Your browser does not support webcam access.");
        }
    }
    
    handleAudio() {
        const file = this.audioFileInput.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.audioElement.src = url;
            this.audioElement.play().catch(e => console.error("Audio playback failed:", e));
        }
    }

    bindEvents() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.startButton.addEventListener('click', this.startExperience.bind(this));
        this.audioFileInput.addEventListener('change', this.handleAudio.bind(this));
        this.startButton.disabled = true; // Disabled until model is loaded
        
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

new DanceApp();

