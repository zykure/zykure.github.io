/*
  Copyright 2021 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Clock, pressToStart } from "./boilerplate.js";
import { Audio } from './audio.js';
import { NineOhGen, ThreeOhGen } from "./pattern.js";
import { UI } from "./ui.js";
import { genericParameter, parameter, trigger } from "./interface.js";
function WanderingParameter(param, scaleFactor = 1 / 400) {
    const [min, max] = param.bounds;
    let diff = 0.0;
    let scale = scaleFactor * (max - min);
    let touchCountdown = 0;
    let previousValue = (min + max) / 2;
    const step = () => {
        if (previousValue != param.value) {
            // Something else has touched this parameter
            diff = 0;
            previousValue = param.value;
            touchCountdown = 200;
        }
        else {
            if (touchCountdown > 0) {
                touchCountdown--;
            }
            if (touchCountdown < 100) {
                diff *= touchCountdown > 0 ? 0.8 : 0.98;
                diff += (Math.random() - 0.5) * scale;
                param.value += diff;
                previousValue = param.value;
                if (param.value > min + 0.8 * (max - min)) {
                    diff -= Math.random() * scale;
                }
                else if (param.value < min + 0.2 * (max - min)) {
                    diff += Math.random() * scale;
                }
            }
        }
    };
    return {
        step
    };
}
function ThreeOhUnit(audio, waveform, output, gen, patternLength = 16) {
    const synth = audio.ThreeOh(waveform, output);
    const pattern = genericParameter("Pattern", []);
    const newPattern = trigger("New Pattern Trigger", true);
    gen.newNotes.subscribe(newNotes => {
        if (newNotes == true)
            newPattern.value = true;
    });
    function step(index) {
        if ((index === 0 && newPattern.value == true) || pattern.value.length == 0) {
            pattern.value = gen.createPattern();
            newPattern.value = false;
        }
        const slot = pattern.value[index % patternLength];
        if (slot.note != "-") {
            synth.noteOn(slot.note, slot.accent, slot.glide);
        }
        else {
            synth.noteOff();
        }
    }
    const parameters = {
        cutoff: parameter("Cutoff", [30, 700], 400),
        resonance: parameter("Resonance", [1, 30], 15),
        envMod: parameter("Env Mod", [0, 8000], 4000),
        decay: parameter("Decay", [0.1, 0.9], 0.5),
        distortion: parameter("Dist", [0, 80], 0)
    };
    parameters.cutoff.subscribe(v => synth.params.cutoff.value = v);
    parameters.resonance.subscribe(v => synth.params.resonance.value = v);
    parameters.envMod.subscribe(v => synth.params.envMod.value = v);
    parameters.decay.subscribe(v => synth.params.decay.value = v);
    parameters.distortion.subscribe(v => synth.params.distortion.value = v);
    return {
        step,
        pattern,
        parameters,
        newPattern
    };
}
function NineOhUnit(audio) {
    return __awaiter(this, void 0, void 0, function* () {
        const drums = yield audio.SamplerDrumMachine(["samples/bd01.mp4", "samples/oh01.mp4", "samples/hh01.mp4", "samples/sd02.mp4", "samples/cp01.mp4"]);
        const pattern = genericParameter("Drum Pattern", []);
        const mutes = [
            genericParameter("Mute BD", false),
            genericParameter("Mute OH", false),
            genericParameter("Mute CH", false),
            genericParameter("Mute SD", false),
            genericParameter("Mute CP", false)
        ];
        const newPattern = trigger("New Pattern Trigger", true);
        const gen = NineOhGen();
        function step(index) {
            if ((index == 0 && newPattern.value == true) || pattern.value.length == 0) {
                pattern.value = gen.createPatterns(true);
                newPattern.value = false;
            }
            for (let i in pattern.value) {
                const entry = pattern.value[i][index % pattern.value[i].length];
                if (entry && !mutes[i].value) {
                    drums.triggers[i].play(entry);
                }
            }
        }
        return {
            step,
            pattern,
            mutes,
            newPattern
        };
    });
}
function DelayUnit(audio) {
    const dryWet = parameter("Dry/Wet", [0, 0.5], 0.5);
    const feedback = parameter("Feedback", [0, 0.9], 0.3);
    const delayTime = parameter("Time", [0, 2], 0.3);
    const delay = audio.DelayInsert(delayTime.value, dryWet.value, feedback.value);
    dryWet.subscribe(w => delay.wet.value = w);
    feedback.subscribe(f => delay.feedback.value = f);
    delayTime.subscribe(t => delay.delayTime.value = t);
    return {
        dryWet,
        feedback,
        delayTime,
        inputNode: delay.in,
    };
}
function AutoPilot(state) {
    const nextMeasure = parameter("upcomingMeasure", [0, Infinity], 0);
    const currentMeasure = parameter("measure", [0, Infinity], 0);
    const patternEnabled = genericParameter("Alter Patterns", true);
    const dialsEnabled = genericParameter("Twiddle With Knobs", true);
    const mutesEnabled = genericParameter("Mute Drum Parts", true);
    var lastDrumChange = 0;
    var lastNoteChange = [0, 0];
    state.clock.currentStep.subscribe(step => {
        if (step === 4) {
            nextMeasure.value = nextMeasure.value + 1;
        }
        else if (step === 15) { // slight hack to get mutes functioning as expected
            currentMeasure.value = currentMeasure.value + 1;
        }
    });
    nextMeasure.subscribe(measure => {
        if (patternEnabled.value) {
            if (measure % 64 === 0) {
                if (Math.random() < 0.2) {
                    console.log("measure #%d: will generate new notes", measure);
                    state.gen.newNotes.value = true;
                    lastNoteChange[0] = lastNoteChange[1] = measure;
                }
            }
            if (measure % 16 === 0) {
                state.notes.forEach((n, i) => {
                    if (Math.random() < 0.5) {
                        console.log("measure #%d: will generate new pattern for unit %d", measure, i);
                        n.newPattern.value = true;
                        lastNoteChange[i] = measure;
                    }
                });
                if (Math.random() < 0.3) {
                    console.log("measure #%d: will generate new pattern for drums", measure);
                    state.drums.newPattern.value = true;
                    lastDrumChange = measure;
                }
            }
            else if (measure % 16 === 4) {
                state.notes.every((n, i) => {
                    const age = measure - lastNoteChange[i];
                    if (age >= 20 && Math.random() < 0.5) {
                        console.log("measure #%d: will generate new pattern for unit %d (age %d)", measure, i, age);
                        n.newPattern.value = true;
                        lastNoteChange[i] = measure;
                        return;
                    }
                });
            }
        }
    });
    currentMeasure.subscribe(measure => {
        if (mutesEnabled.value) {
            const drumMutes = [Math.random() < 0.2, Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.8];
            if (measure % 8 === 0) {
                console.log("measure #%d: may mute drum parts", measure);
                state.drums.mutes.forEach((m, i) => {
                    m.value = drumMutes[i];
                });
            }
            else if (measure % 8 === 7) {
                console.log("measure #%d: may mute drum parts", measure);
                state.drums.mutes.forEach((m, i) => {
                    if (Math.random() < 0.5) {
                        m.value || (m.value = drumMutes[i]);
                    }
                });
            }
            else if (measure % 4 === 0) {
                console.log("measure #%d: may unmute drum parts", measure);
                state.drums.mutes.forEach((m, i) => {
                    if (Math.random() < 0.5) {
                        m.value && (m.value = drumMutes[i]);
                    }
                });
            }
        }
    });
    const noteParams = state.notes.flatMap(x => Object.values(x.parameters));
    const delayParams = [state.delay.feedback, state.delay.dryWet];
    const wanderers = [...noteParams, ...delayParams].map(param => WanderingParameter(param));
    window.setInterval(() => { if (dialsEnabled.value)
        wanderers.forEach(w => w.step()); }, 100);
    return {
        switches: [
            patternEnabled,
            dialsEnabled,
            mutesEnabled
        ]
    };
}
function ClockUnit() {
    const bpm = parameter("BPM", [70, 200], 142);
    const currentStep = parameter("Current Step", [0, 15], 0);
    const clockImpl = Clock(bpm.value, 4, 0.0);
    bpm.subscribe(clockImpl.setBpm);
    clockImpl.bind((time, step) => {
        currentStep.value = step % 16;
    });
    return {
        bpm,
        currentStep
    };
}
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        const audio = Audio();
        const clock = ClockUnit();
        const delay = DelayUnit(audio);
        clock.bpm.subscribe(b => delay.delayTime.value = (3 / 4) * (60 / b));
        const gen = ThreeOhGen();
        const programState = {
            notes: [
                ThreeOhUnit(audio, "sawtooth", delay.inputNode, gen),
                ThreeOhUnit(audio, "square", delay.inputNode, gen)
            ],
            drums: yield NineOhUnit(audio),
            gen,
            delay,
            clock
        };
        clock.currentStep.subscribe(step => [...programState.notes, programState.drums].forEach(d => d.step(step)));
        const autoPilot = AutoPilot(programState);
        const ui = UI(programState, autoPilot, audio.master.analyser);
        document.body.append(ui);
    });
}
pressToStart(start, "Spicy Endless Acid Banger", "A collaboration between human and algorithm by Vitling, spiced up by Zykure");
//# sourceMappingURL=app.js.map