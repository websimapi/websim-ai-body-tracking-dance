import * as THREE from 'three';

const landmarkToBoneMap = {
    // Arms
    'left_shoulder': { bone: 'mixamorigSpine2', landmark: 11 },
    'right_shoulder': { bone: 'mixamorigSpine2', landmark: 12 },
    'left_elbow': { bone: 'mixamorigLeftArm', landmark: 13 },
    'right_elbow': { bone: 'mixamorigRightArm', landmark: 14 },
    'left_wrist': { bone: 'mixamorigLeftForeArm', landmark: 15 },
    'right_wrist': { bone: 'mixamorigRightForeArm', landmark: 16 },
    
    // Legs (Simplified)
    'left_hip': { bone: 'mixamorigLeftUpLeg', landmark: 23 },
    'right_hip': { bone: 'mixamorigRightUpLeg', landmark: 24 },
    'left_knee': { bone: 'mixamorigLeftLeg', landmark: 25 },
    'right_knee': { bone: 'mixamorigRightLeg', landmark: 26 },
};


export class AvatarController {
    constructor(model) {
        this.model = model;
        this.bones = {};
        this.initialBonePositions = {};

        this.model.traverse(child => {
            if (child.isBone) {
                this.bones[child.name] = child;
                this.initialBonePositions[child.name] = child.position.clone();
            }
        });
    }

    update(landmarks) {
        const landmarkPositions = this.getLandmarkPositions(landmarks);
        this.updateBody(landmarkPositions);
    }

    getLandmarkPositions(landmarks) {
        const positions = {};
        for (const key in landmarkToBoneMap) {
            const landmarkIndex = landmarkToBoneMap[key].landmark;
            const pos = landmarks[landmarkIndex];
            // Mediapipe gives mirrored landmarks. We flip X. Also Y and Z seem to be inverted.
            positions[key] = new THREE.Vector3(-pos.x, -pos.y, -pos.z);
        }
        return positions;
    }

    updateBody(lm) {
        if (!lm.left_shoulder || !lm.right_shoulder) return;

        // --- Torso ---
        const shoulderCenter = new THREE.Vector3().addVectors(lm.left_shoulder, lm.right_shoulder).multiplyScalar(0.5);
        const hipCenter = new THREE.Vector3().addVectors(lm.left_hip, lm.right_hip).multiplyScalar(0.5);
        const spineDir = new THREE.Vector3().subVectors(shoulderCenter, hipCenter).normalize();
        
        // This is a simplified spine rotation.
        const spine = this.bones['mixamorigSpine'];
        if (spine) {
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spineDir);
            spine.quaternion.slerp(targetQuaternion, 0.3);
        }
        
        // --- Arms ---
        this.rotateLimb(this.bones.mixamorigLeftArm, lm.left_shoulder, lm.left_elbow, new THREE.Vector3(0, -1, 0));
        this.rotateLimb(this.bones.mixamorigLeftForeArm, lm.left_elbow, lm.left_wrist, new THREE.Vector3(0, -1, 0));
        this.rotateLimb(this.bones.mixamorigRightArm, lm.right_shoulder, lm.right_elbow, new THREE.Vector3(0, -1, 0));
        this.rotateLimb(this.bones.mixamorigRightForeArm, lm.right_elbow, lm.right_wrist, new THREE.Vector3(0, -1, 0));

        // --- Legs (simplified rotation) ---
        this.rotateLimb(this.bones.mixamorigLeftUpLeg, lm.left_hip, lm.left_knee, new THREE.Vector3(0, -1, 0));
        this.rotateLimb(this.bones.mixamorigLeftLeg, lm.left_knee, lm.left_hip, new THREE.Vector3(0, 1, 0)); // Simplified: points up from knee
        this.rotateLimb(this.bones.mixamorigRightUpLeg, lm.right_hip, lm.right_knee, new THREE.Vector3(0, -1, 0));
        this.rotateLimb(this.bones.mixamorigRightLeg, lm.right_knee, lm.right_hip, new THREE.Vector3(0, 1, 0)); // Simplified
    }

    rotateLimb(bone, p1, p2, defaultDirection) {
        if (!bone || !p1 || !p2) return;

        const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDirection, direction);
        
        // Convert to parent's space
        const parent = bone.parent;
        const parentInverse = new THREE.Quaternion().copy(parent.getWorldQuaternion(new THREE.Quaternion())).invert();
        quaternion.premultiply(parentInverse);

        bone.quaternion.slerp(quaternion, 0.5);
    }
}

