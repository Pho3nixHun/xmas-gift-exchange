import { MathUtils } from 'three';

import type { HouseStage, SceneCommand } from '../../core/house-scene';
import { V } from '../render/geometry';
import type { HouseModel } from '../render/house-model';

import { catWalk } from './cat-walk';
import { createMotion } from './motion';
import { ease } from './poses';

export const createCompanions = (
    model: HouseModel,
    sound: (
        action: 'cookie' | 'cat' | 'star' | 'bell' | 'glass'
    ) => void = () => undefined
) => {
    const motion = createMotion(),
        state = {
            resting: false,
            wandering: false,
            nextWalk: 5,
            activity: 0,
            time: 0,
        };
    const sparks = createMotion();
    const rest = (amount: number) => {
        model.cat.scale.set(
            1.15 - 0.15 * amount,
            1.15 - 0.23 * amount,
            1.15 - 0.08 * amount
        );
        model.catHead.position.set(
            0,
            0.46 - 0.1 * amount,
            0.38 - 0.03 * amount
        );
        model.catHead.rotation.set(0.18 * amount, 0, 0);
        model.catLegs.forEach((leg, i) => {
            leg.position.y = 0.18 - 0.055 * amount;
            leg.rotation.x = (i < 2 ? -1 : 1) * amount * 0.75;
        });
        model.catTail.rotation.set(
            -0.15 * amount,
            -1.1 * amount,
            -0.5 * amount
        );
        model.catEyes.forEach(eye => {
            eye.scale.y = 1 - 0.9 * amount;
        });
    };
    const nap = () => {
        const start = model.cat.position.clone(),
            seat = model.sofa.localToWorld(V(-0.1, 1.02, 0.13)),
            facing = model.cat.rotation.y,
            direction = Math.atan2(seat.x - start.x, seat.z - start.z);
        if (state.resting && start.distanceTo(seat) < 0.1) return;
        motion.run([
            {
                duration: 0.35,
                update: t => {
                    model.cat.rotation.y = MathUtils.lerp(
                        facing,
                        direction,
                        ease(t)
                    );
                    model.cat.scale.set(1.15, 1.15 - 0.3 * t, 1.15 + 0.12 * t);
                },
            },
            {
                duration: 0.85,
                update: t => {
                    model.cat.position.lerpVectors(start, seat, t);
                    model.cat.position.y += Math.sin(t * Math.PI) * 0.9;
                    model.cat.scale.setScalar(1.15);
                    model.cat.rotation.x = -Math.sin(t * Math.PI) * 0.3;
                    model.catLegs.forEach((leg, i) => {
                        leg.rotation.x =
                            Math.sin(t * Math.PI) * (i % 2 ? -0.65 : 0.8);
                    });
                },
            },
            {
                duration: 0.85,
                update: t => {
                    model.cat.rotation.x = 0;
                    model.cat.position.copy(seat);
                    rest(ease(t));
                    model.cat.rotation.y = MathUtils.lerp(
                        direction,
                        model.sofa.rotation.y + 0.9,
                        ease(t)
                    );
                    state.resting = t === 1;
                },
            },
        ]);
    };
    const pounce = (index: number) => {
        const bauble = model.baubles[index];
        if (!bauble) return;
        const start = model.cat.position.clone(),
            target = bauble.group.getWorldPosition(V());
        state.resting = false;
        const impact = { played: false };
        motion.run([
            {
                duration: 0.45,
                update: t => {
                    rest(0);
                    model.cat.rotation.y = Math.atan2(
                        target.x - start.x,
                        target.z - start.z
                    );
                    model.cat.scale.set(
                        1.15,
                        1.15 - 0.3 * Math.sin(t * Math.PI),
                        1.15 + 0.18 * Math.sin(t * Math.PI)
                    );
                },
            },
            {
                duration: 1.05,
                update: t => {
                    model.cat.position.lerpVectors(start, target, t);
                    model.cat.position.y += Math.sin(t * Math.PI) * 1.8;
                    model.cat.rotation.z = -Math.sin(t * Math.PI) * 0.3;
                    model.cat.rotation.x = -Math.sin(t * Math.PI) * 0.4;
                    model.catLegs.forEach((leg, i) => {
                        leg.rotation.x =
                            i % 2 === 0 ? -0.45 : 1.1 * Math.sin(t * Math.PI);
                    });
                },
            },
            {
                duration: 1.1,
                update: t => {
                    if (!impact.played) {
                        impact.played = true;
                        sound('glass');
                    }
                    bauble.group.visible = false;
                    model.tree.rotation.z = Math.sin(t * 22) * 0.045 * (1 - t);
                    model.cat.position.lerpVectors(
                        target,
                        V(1.35, 0.2, -0.1),
                        ease(t)
                    );
                    model.cat.rotation.set(
                        0,
                        -0.5,
                        Math.sin(t * 9) * 0.08 * (1 - t)
                    );
                    if (t === 1) {
                        rest(0);
                    }
                },
            },
        ]);
    };
    const cookie = () => {
        const item = model.cookies.find(c => c.visible);
        if (!item) return;
        sound('cookie');
        const start = item.position.clone();
        model.cookieCrumbs.visible = true;
        motion.run([
            {
                duration: 0.95,
                update: t => {
                    item.position.y = start.y + Math.sin(t * Math.PI) * 0.23;
                    item.rotation.z = Math.sin(t * Math.PI) * 0.35;
                    item.scale.setScalar(1 - ease(t));
                    model.cookieCrumbs.children.forEach((crumb, i) => {
                        const a = i * 2.4,
                            r = 0.025 + ease(t) * 0.055;
                        crumb.position.set(
                            start.x + Math.cos(a) * r,
                            0.008 + Math.sin(t * Math.PI) * (0.06 + i * 0.009),
                            start.z + Math.sin(a) * r
                        );
                    });
                    if (t === 1) {
                        item.visible = false;
                        model.cookieCrumbs.visible = false;
                    }
                },
            },
        ]);
    };
    const burst = () => {
        model.starBurst.position.copy(model.treeStar.getWorldPosition(V()));
        sparks.run([
            {
                duration: 1.25,
                update: t => {
                    model.starBurst.visible = t < 1;
                    model.starBurstMaterial.opacity = 1 - t;
                    model.starBurst.children.forEach((spike, i) => {
                        const angle = i * 2.39996,
                            elevation = (i / 23 - 0.5) * 1.4;
                        const direction = V(
                            Math.cos(angle),
                            elevation,
                            Math.sin(angle)
                        ).normalize();
                        spike.position
                            .copy(direction)
                            .multiplyScalar(t * (1.2 + (i % 4) * 0.2));
                        spike.position.y -= t * t * 0.5;
                        spike.quaternion.setFromUnitVectors(
                            V(0, 1, 0),
                            direction
                        );
                        spike.scale.setScalar(1 - t * 0.6);
                    });
                },
            },
        ]);
    };
    const wander = () => {
        const activity = state.activity++ % 3;
        const destination =
            [V(-2.05, 0.18, -1.55), V(1.95, 0.18, -0.65), V(0.9, 0.18, 0.15)][
                activity
            ] ?? V();
        state.wandering = true;
        state.resting = false;
        rest(0);
        motion.run([
            catWalk(model, destination),
            {
                duration: 8,
                update: t => {
                    model.cat.rotation.set(0, activity === 1 ? 2.5 : -0.8, 0);
                    if (activity === 0) rest(Math.min(1, t * 5));
                    else {
                        const play = Math.sin(t * Math.PI) * Math.sin(t * 60);
                        model.catHead.rotation.x = activity === 1 ? -0.25 : 0.3;
                        model.catLegs.slice(0, 2).forEach((leg, i) => {
                            leg.rotation.x =
                                (activity === 1 ? -0.7 : 0.3) +
                                play * (i ? 0.3 : -0.3);
                        });
                        model.cat.rotation.x =
                            activity === 2 ? 0.07 * Math.sin(t * 60) : -0.05;
                    }
                    if (t === 1) {
                        state.wandering = false;
                        state.resting = activity === 0;
                        state.nextWalk = state.time + 8;
                    }
                },
            },
        ]);
    };
    const run = (command: SceneCommand) => {
        if (command.action === 'star') {
            sound('star');
            burst();
            return;
        }
        if (
            motion.active() &&
            !state.wandering &&
            command.action !== 'ornament'
        )
            return;
        if (state.wandering) {
            motion.run([]);
            rest(0);
            model.cat.rotation.x = 0;
        }
        state.wandering = false;
        state.nextWalk = state.time + 25;
        if (command.action === 'sofa') nap();
        if (command.action === 'ornament') pounce(command.index ?? 0);
        if (command.action === 'cookie') cookie();
        if (command.action === 'bell') {
            sound('bell');
            motion.run([
                {
                    duration: 1,
                    update: t => {
                        model.bell.rotation.z =
                            Math.sin(t * 24) * 0.4 * (1 - t);
                    },
                },
            ]);
        }
        if (command.action === 'cat') {
            sound('cat');
            motion.run([
                {
                    duration: 2.4,
                    update: t => {
                        model.catHead.rotation.z =
                            Math.sin(t * Math.PI * 2) * 0.15;
                    },
                },
            ]);
        }
    };
    const tick = (
        delta: number,
        reduced: boolean,
        time: number,
        stage: HouseStage
    ) => {
        const ambientDelta = Math.max(0, time - state.time);
        state.time = time;
        sparks.tick(delta, reduced);
        motion.tick(
            state.wandering ? (stage === 'room' ? ambientDelta : 0) : delta,
            reduced
        );
        if (
            !motion.active() &&
            !reduced &&
            stage === 'room' &&
            time >= state.nextWalk
        )
            wander();
        if (motion.active()) return;
        model.catBody.scale.y =
            0.28 + Math.sin(time * (state.resting ? 1.7 : 2.2)) * 0.004;
        if (!state.resting) {
            model.catTail.rotation.y = Math.sin(time * 2) * 0.16;
            model.catHead.rotation.y = Math.sin(time * 0.5) * 0.12;
        }
    };
    return { run, tick, active: () => motion.active() || sparks.active() };
};
