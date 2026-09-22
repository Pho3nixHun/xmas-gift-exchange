import type { PerspectiveCamera } from 'three';
import { MathUtils } from 'three';

import type { HouseStage } from '../../core/house-scene';
import { V } from '../render/geometry';
import type { HouseModel } from '../render/house-model';

import type { SurfaceSize } from './projection';
import { skyPath } from './sky-path';

export const animateAtmosphere = (model: HouseModel, time: number) => {
    const progress = MathUtils.clamp(((time + 23) % 29) / 7, 0, 1),
        glow = Math.pow(Math.sin(progress * Math.PI), 2);
    model.windowMaterial.uniforms.time.value = time;
    model.windowMaterial.uniforms.passing.value = progress;
    model.windowMaterial.uniforms.glow.value = glow;
    model.windowLight.intensity = glow * 4;
    model.windowLight.position.x = 0.1 + progress - 0.5;
    model.flameMaterial.uniforms.time.value = time;
    model.snowMaterial.uniforms.time.value = time;
    model.warm.intensity =
        22 + Math.sin(time * 6) * 1.2 + Math.sin(time * 9) * 0.6;
    model.twinkles.forEach((s, i) => {
        s.material.opacity =
            s.userData['switchedOff'] === true
                ? 0
                : 0.16 + Math.sin(time * 1.5 + i * 2.6) * 0.055;
    });
    // Hidden props keep their last pose, so their clocks can wait until the room
    // or the chimney is on screen again.
    if (model.room.visible) animateRoom(model, time);
    if (model.smoke.visible) model.smokeClock.value = time;
};
const animateRoom = (model: HouseModel, time: number) => {
    // Embers and tea steam are instanced fields: one clock each replaces a walk
    // over every sprite in the group.
    model.emberClock.value = time;
    model.steamClock.value = time;
    model.fireParts.forEach((f, i) => {
        f.scale.y =
            0.09 *
            (1 +
                Math.sin(time * 7 + i) * 0.17 +
                Math.sin(time * 11 + i) * 0.09);
    });
    model.fireGlow.material.opacity = 0.3 + Math.sin(time * 4) * 0.025;
    // Aura opacity belongs to the scene component, which knows which slots are
    // still available; writing it here would only be overwritten in the same frame.
    model.baubles.forEach((b, i) => {
        b.group.rotation.z = Math.sin(time * 1.6 + i) * 0.07;
        b.group.position.y = b.homeY + Math.sin(time * 1.6 + i) * 0.025;
    });
};
export const animateVisitors = (
    model: HouseModel,
    camera: PerspectiveCamera,
    viewport: SurfaceSize,
    time: number,
    stage: HouseStage
) => {
    const mobile = viewport.width < 650,
        walk = (time + 60) % 64;
    model.snowman.visible = walk < 18;
    model.snowman.position.set(
        -12 + (24 * walk) / 18,
        Math.abs(Math.sin(time * 4)) * 0.065,
        model.room.visible ? -10 : 8.5
    );
    model.snowman.rotation.y = Math.PI / 2;
    model.snowman.rotation.z = Math.sin(time * 4) * 0.04;
    model.snowArms.forEach((arm, i) => {
        arm.rotation.x = Math.sin(time * 4 + i * Math.PI) * 0.3;
    });
    model.snowFeet.forEach((foot, i) => {
        foot.position.z = 0.12 + Math.sin(time * 4 + i * Math.PI) * 0.13;
    });
    const fight = (time + 45) % 71;
    model.flyingSnow.visible = fight < 7;
    model.flyingSnow.children.forEach((b, i) => {
        const t = MathUtils.clamp((fight - i * 0.9) / 5, 0, 1);
        b.visible = t > 0 && t < 1;
        b.position.set(
            MathUtils.lerp(i ? 13 : -14, i ? -14 : 13, t),
            1.7 + Math.sin(t * Math.PI) * 7,
            MathUtils.lerp(i ? -17 : -13, i ? -13 : -17, t)
        );
    });
    const open = stage === 'outside' || stage === 'room',
        lane = mobile
            ? viewport.height * (stage === 'room' ? 0.23 : 0.3)
            : stage === 'room'
              ? 85
              : Math.max(115, viewport.height * 0.15);
    const depth = 20,
        units =
            (2 * depth * Math.tan((camera.fov * Math.PI) / 360)) /
            viewport.height;
    const sky = (x: number, y: number, z: number) => {
        const height = 2 * z * Math.tan((camera.fov * Math.PI) / 360);
        return V(
            (x - 0.5) * height * camera.aspect,
            (0.5 - y / viewport.height) * height,
            -z
        ).applyMatrix4(camera.matrixWorld);
    };
    const fly = (time + 46) % 52,
        flight = fly / 14,
        santaPath = skyPath(Math.floor((time + 46) / 52), model.visitorSeed);
    model.sleigh.visible = open && fly < 14;
    model.sleigh.position.copy(
        sky(
            santaPath.direction > 0 ? -0.2 + 1.4 * flight : 1.2 - 1.4 * flight,
            lane +
                santaPath.height +
                santaPath.slope * (flight - 0.5) +
                Math.sin(flight * Math.PI * 2) * 5,
            depth
        )
    );
    model.sleigh.quaternion.copy(camera.quaternion);
    model.sleigh.rotateZ(Math.sin(flight * Math.PI * 2) * 0.025);
    model.sleigh.scale.setScalar(
        (units * Math.min(190, viewport.width * 0.29)) / 5.2
    );
    model.sleigh.scale.x *= -santaPath.direction;
    const shooting = (time + 25) % 28,
        pass = shooting / 3.6,
        starPath = skyPath(
            Math.floor((time + 25) / 28),
            model.visitorSeed + 83
        ),
        fade =
            MathUtils.smoothstep(pass, 0, 0.12) *
            (1 - MathUtils.smoothstep(pass, 0.88, 1));
    model.shootingStar.visible = stage === 'outside' && shooting < 3.6;
    model.shootingStar.position.copy(
        sky(
            starPath.direction > 0 ? -0.15 + 1.4 * pass : 1.15 - 1.4 * pass,
            lane + starPath.height + starPath.slope * (pass - 0.5),
            depth - 1
        )
    );
    model.shootingStar.quaternion.copy(camera.quaternion);
    model.shootingStar.rotateZ(
        -Math.atan2(starPath.slope, viewport.width * 1.4) * starPath.direction
    );
    model.shootingStar.scale.setScalar(units * (mobile ? 0.8 : 1));
    model.shootingStar.scale.x *= starPath.direction;
    model.starTrailMaterial.uniforms.opacity.value = fade * 0.9;
    model.starHalo.material.opacity = fade * 0.9;
    model.starCore.material.opacity = fade;
    model.starPoint.material.opacity = fade;
    model.starSparkles.forEach((spark, i) => {
        spark.material.opacity =
            fade * (0.3 + 0.25 * Math.sin(time * 7 + i * 2));
    });
};
export const lightDesk = (model: HouseModel, level: number) => {
    model.deskLampShade.emissiveIntensity = level * 0.65;
    model.deskLampBulb.emissiveIntensity = level * 2.4;
    model.deskLampGlow.material.opacity = level * 0.34;
    model.deskLampLight.intensity = level * 3.2;
    model.deskLampPoolMaterial.opacity = level * 0.58;
};
