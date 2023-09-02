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
import { Midi } from './midi.js';
import { NineOhGen, ThreeOhGen } from "./pattern.js";
import { UI } from "./ui.js";
import { genericParameter, parameter, trigger } from "./interface.js";
export const midiControlPresets = new Map([
    ["(Default)", {
            pitchOffset: 0,
            //absVolume:    63,
            //triggerCC:    -1,
            accentCC: -1,
            cutoffCC: -1,
            resonanceCC: -1,
            envModCC: -1,
            decayCC: -1,
            distortionCC: -1,
        }],
    ["Elektron - Digitakt", {
            pitchOffset: 0,
            //absVolume:    63,
            //triggerCC:    -1,
            accentCC: -1,
            cutoffCC: 74,
            resonanceCC: 75,
            envModCC: 77,
            decayCC: 80,
            distortionCC: 81, // Amp overdrive
        }],
    ["KORG - minilogue xd)", {
            // Values taken from the minilogue xd Owner's Manual, Version 1.00, page 61
            pitchOffset: 0,
            //absVolume:    63,
            //triggerCC:    39,  // Mixer VCO1
            accentCC: -1,
            cutoffCC: 43,
            resonanceCC: 44,
            envModCC: 22,
            decayCC: 17,
            distortionCC: -1,
        }],
    ["Behringer - TD-3-MO", {
            // Values taken from trial & error, only two CC's are supported
            pitchOffset: 12,
            //absVolume:    63,
            //triggerCC:    -1,
            accentCC: 120,
            cutoffCC: 74,
            resonanceCC: -1,
            envModCC: -1,
            decayCC: -1,
            distortionCC: -1,
        }],
]);
// Drum MIDI notes relative to middle c (C4 = 60)
export const midiDrumPresets = new Map([
    ["(Default)", {
            //absVolume:  63,
            //triggerCC:  -1,
            pitchBD: 0,
            pitchOH: 0,
            pitchCH: 0,
            pitchSD: 0,
            pitchCP: 0,
            channelBD: -1,
            channelOH: -1,
            channelCH: -1,
            channelSD: -1,
            channelCP: -1,
        }],
    ["Elektron - Digitakt", {
            //absVolume:  63,
            //triggerCC:  -1,
            pitchBD: 0,
            pitchOH: 0,
            pitchCH: 0,
            pitchSD: 0,
            pitchCP: 0,
            channelBD: 0,
            channelOH: 6,
            channelCH: 5,
            channelSD: 1,
            channelCP: 3, // Track 4 (Clap)
        }],
]);
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
function ThreeOhUnit(audio, midi, waveform, output, bpm, gen, patternLength = 16) {
    const synth = audio.ThreeOh(waveform, output);
    const midiDevice = parameter("Device", [0, Infinity], 0);
    const midiChannel = parameter("MIDI Channel", [0, 15], 0);
    const midiPreset = parameter("Preset", [0, Infinity], 0);
    const pattern = genericParameter("Pattern", []);
    const savedPattern = genericParameter("Pattern", []);
    const newPattern = trigger("New Pattern Trigger", true);
    const restorePattern = trigger("Restore Pattern Trigger", false);
    const parameters = {
        cutoff: parameter("Cutoff", [30, 700], 400),
        resonance: parameter("Resonance", [1, 30], 15),
        envMod: parameter("Env Mod", [0, 8000], 4000),
        decay: parameter("Decay", [0.1, 0.9], 0.5),
        distortion: parameter("Dist", [0, 80], 0)
    };
    const midiControls = {
        //absVolume: parameter("Volume", [0,127], 63),
        //triggerCC: parameter("Trig CC", [-1,127], -1),
        accentCC: parameter("Acc CC", [-1, 127], -1),
        cutoffCC: parameter("Cutoff CC", [-1, 127], -1),
        resonanceCC: parameter("Reso CC", [-1, 127], -1),
        envModCC: parameter("EnvMod CC", [-1, 127], -1),
        decayCC: parameter("Decay CC", [-1, 127], -1),
        distortionCC: parameter("Dist CC", [-1, 127], -1),
        pitchOffset: parameter("Pitch", [-48, 48], 0),
    };
    gen.newNotes.subscribe(newNotes => {
        if (newNotes == true)
            newPattern.value = true;
    });
    function step(index) {
        if ((index === 0 && newPattern.value == true) || pattern.value.length == 0) {
            savedPattern.value = pattern.value;
            pattern.value = gen.createPattern();
            newPattern.value = false;
        }
        if (index === 0 && restorePattern.value == true && savedPattern.value.length > 0) {
            const tempPattern = pattern.value;
            pattern.value = savedPattern.value;
            savedPattern.value = tempPattern;
            restorePattern.value = false;
            newPattern.value = false;
        }
        else if (restorePattern.value == true && savedPattern.value.length == 0) {
            restorePattern.value = false;
        }
        // if (midi) {
        //     // send 6 clock pulses per 4 steps (24 per quarter note)
        //     const device = midi.OutputDevice(midiDevice.value, midiChannel.value);
        //     for (let i = 0; i < 6; i++)
        //         window.setTimeout(() => { device.clockPulse(); }, (60000/bpm.value)*(i/24));
        // }
        const slot = pattern.value[index % patternLength];
        if (slot.note != "-") {
            synth.noteOn(slot.note, slot.accent, slot.glide);
            if (midi) {
                const device = midi.OutputDevice(midiDevice.value, midiChannel.value);
                //device.controlChange(midiControls.triggerCC.value, midiControls.absVolume.value);
                const velocity = slot.accent ? 127 : 100;
                const length = slot.glide ? 100 : 50;
                if (slot.accent) {
                    device.controlChange(midiControls.accentCC.value, slot.accent ? 127 : 0);
                    setTimeout(() => { device.controlChange(midiControls.accentCC.value, 0); }, 100); // reset after 100 ms, mainly for TD-3-MO (accent = CC change)
                }
                device.noteOn(slot.note, velocity, length, midiControls.pitchOffset.value);
            }
        }
        else {
            synth.noteOff();
            if (midi) {
                const device = midi.OutputDevice(midiDevice.value, midiChannel.value);
                //device.noteOff();
                //device.controlChange(midiControls.triggerCC.value, 0x00);
            }
        }
    }
    parameters.cutoff.subscribe(v => synth.params.cutoff.value = v);
    parameters.resonance.subscribe(v => synth.params.resonance.value = v);
    parameters.envMod.subscribe(v => synth.params.envMod.value = v);
    parameters.decay.subscribe(v => synth.params.decay.value = v);
    parameters.distortion.subscribe(v => synth.params.distortion.value = v);
    if (midi) {
        midiDevice.subscribe(d => {
            var output = midi.getOutput(d);
            if (output) {
                const deviceName = output.manufacturer + " " + output.name;
                console.log("MIDI output device: " + deviceName);
                for (let channel = 0; channel < 16; channel++) {
                    const device = midi.OutputDevice(midiDevice.value, channel);
                    device.allNotesOff();
                }
            }
        });
        midiChannel.subscribe(c => {
        });
        midiPreset.subscribe(d => {
            const presetName = Array.from(midiControlPresets.keys())[midiPreset.value];
            console.log("MIDI control preset: " + presetName);
            const preset = midiControlPresets.get(presetName);
            if (preset) {
                //midiControls.absVolume.value = preset.absVolume;
                //midiControls.triggerCC.value = preset.triggerCC;
                midiControls.accentCC.value = preset.accentCC;
                midiControls.cutoffCC.value = preset.cutoffCC;
                midiControls.resonanceCC.value = preset.resonanceCC;
                midiControls.decayCC.value = preset.decayCC;
                midiControls.envModCC.value = preset.envModCC;
                midiControls.distortionCC.value = preset.distortionCC;
                midiControls.pitchOffset.value = preset.pitchOffset;
            }
        });
        function sendMidiControl(param, control) {
            const v = Math.trunc((param.value - param.bounds[0]) / (param.bounds[1] - param.bounds[0]) * 127); // convert to MIDI range
            if (midi && control.value >= 0) {
                const device = midi.OutputDevice(midiDevice.value, midiChannel.value);
                device.controlChange(control.value, v);
            }
        }
        parameters.cutoff.subscribe(v => sendMidiControl(parameters.cutoff, midiControls.cutoffCC));
        parameters.resonance.subscribe(v => sendMidiControl(parameters.resonance, midiControls.resonanceCC));
        parameters.envMod.subscribe(v => sendMidiControl(parameters.envMod, midiControls.envModCC));
        parameters.decay.subscribe(v => sendMidiControl(parameters.decay, midiControls.decayCC));
        parameters.distortion.subscribe(v => sendMidiControl(parameters.distortion, midiControls.distortionCC));
    }
    return {
        step,
        pattern,
        parameters,
        midiDevice,
        midiChannel,
        midiPreset,
        midiControls,
        newPattern,
        restorePattern
    };
}
function NineOhUnit(audio, midi, bpm) {
    return __awaiter(this, void 0, void 0, function* () {
        const drums = yield audio.SamplerDrumMachine(["samples/bd01.mp4", "samples/oh01.mp4", "samples/hh01.mp4", "samples/sd02.mp4", "samples/cp01.mp4"]);
        const midiDevice = parameter("MIDI Device", [0, Infinity], 0);
        const midiChannel = parameter("MIDI Channel", [0, 15], 0);
        const midiPreset = parameter("Preset", [0, Infinity], 0);
        const pattern = genericParameter("Drum Pattern", []);
        const savedPattern = genericParameter("Drum Pattern", []);
        const mutes = [
            genericParameter("Mute BD", false),
            genericParameter("Mute OH", false),
            genericParameter("Mute CH", false),
            genericParameter("Mute SD", false),
            genericParameter("Mute CP", false)
        ];
        const middleC = 60;
        const midiNotes = [
            parameter("BD Pitch", [0, 48], 0),
            parameter("OH Pitch", [0, 48], 0),
            parameter("CH Pitch", [0, 48], 0),
            parameter("SD Pitch", [0, 48], 0),
            parameter("CP Pitch", [0, 48], 0),
        ];
        const midiChannels = [
            parameter("BD Channel", [-1, 15], 0),
            parameter("OH Channel", [-1, 15], 0),
            parameter("CH Channel", [-1, 15], 0),
            parameter("SD Channel", [-1, 15], 0),
            parameter("CP Channel", [-1, 15], 0),
        ];
        const midiControls = {
            //absVolume: parameter("Volume", [0,127], 63),
            //triggerCC: parameter("Trigger CC", [-1,127], -1),
            pitchBD: midiNotes[0],
            channelBD: midiChannels[0],
            pitchOH: midiNotes[1],
            channelOH: midiChannels[1],
            pitchCH: midiNotes[2],
            channelCH: midiChannels[2],
            pitchSD: midiNotes[3],
            channelSD: midiChannels[3],
            pitchCP: midiNotes[4],
            channelCP: midiChannels[4],
        };
        const newPattern = trigger("New Pattern Trigger", true);
        const restorePattern = trigger("Restore Pattern Trigger", false);
        const gen = NineOhGen();
        function step(index) {
            if ((index == 0 && newPattern.value == true) || pattern.value.length == 0) {
                savedPattern.value = pattern.value;
                pattern.value = gen.createPatterns(true);
                newPattern.value = false;
            }
            if (index === 0 && restorePattern.value == true && savedPattern.value.length > 0) {
                const tempPattern = pattern.value;
                pattern.value = savedPattern.value;
                savedPattern.value = tempPattern;
                restorePattern.value = false;
                newPattern.value = false;
            }
            else if (restorePattern.value == true && savedPattern.value.length == 0) {
                restorePattern.value = false;
            }
            // if (midi) {
            //     // send 6 clock pulses per step (24 per quarter note)
            //     const device = midi.OutputDevice(midiDevice.value, midiChannel.value);
            //     for (let i = 0; i < 6; i++)
            //         window.setTimeout(() => { device.clockPulse(); }, (60000/bpm.value)*(i/24));
            // }
            var hasNotes = false;
            for (let i in pattern.value) {
                const entry = pattern.value[i][index % pattern.value[i].length];
                if (entry && !mutes[i].value) {
                    drums.triggers[i].play(entry);
                    hasNotes = true;
                    if (midi) {
                        const channel = midiChannels[i].value >= 0 ? midiChannels[i].value : midiChannel.value;
                        const device = midi.OutputDevice(midiDevice.value, channel);
                        const velocity = Math.floor(entry * 127);
                        //device.controlChange(midiControls.triggerCC.value, midiControls.absVolume.value);
                        device.noteOn(midiNotes[i].value, velocity);
                    }
                }
            }
            if (midi) {
                const channel = /* midiChannels[i].value >= 0 ? midiChannels[i].value : */ midiChannel.value;
                const device = midi.OutputDevice(midiDevice.value, channel);
                //if (! hasNotes)
                //    device.controlChange(midiControls.triggerCC.value, 0x00);
            }
        }
        if (midi) {
            midiDevice.subscribe(d => {
                const output = midi.getOutput(d);
                if (output) {
                    const deviceName = output.manufacturer + " " + output.name;
                    console.log("MIDI output device: " + deviceName);
                    for (let channel = 0; channel < 16; channel++) {
                        const device = midi.OutputDevice(midiDevice.value, channel);
                        device.allNotesOff();
                    }
                }
            });
            midiChannel.subscribe(c => {
            });
            midiPreset.subscribe(d => {
                const presetName = Array.from(midiDrumPresets.keys())[midiPreset.value];
                console.log("MIDI control preset: " + presetName);
                const preset = midiDrumPresets.get(presetName);
                if (preset) {
                    //midiControls.absVolume.value = preset.absVolume;
                    //midiControls.triggerCC.value = preset.triggerCC;
                    midiControls.pitchBD.value = preset.pitchBD;
                    midiControls.pitchOH.value = preset.pitchOH;
                    midiControls.pitchCH.value = preset.pitchCH;
                    midiControls.pitchSD.value = preset.pitchSD;
                    midiControls.pitchCP.value = preset.pitchCP;
                    midiControls.channelBD.value = preset.channelBD;
                    midiControls.channelOH.value = preset.channelOH;
                    midiControls.channelCH.value = preset.channelCH;
                    midiControls.channelSD.value = preset.channelSD;
                    midiControls.channelCP.value = preset.channelCP;
                }
            });
        }
        return {
            step,
            pattern,
            mutes,
            midiDevice,
            midiChannel,
            midiPreset,
            midiControls,
            newPattern,
            restorePattern
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
            const numActive = state.drums.mutes.reduce((sum, current) => !current.value ? sum + 1 : sum, 0);
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
            else if (measure % 2 === 0) {
                console.log("measure #%d: may unmute drum parts", measure);
                state.drums.mutes.forEach((m, i) => {
                    if (Math.random() < 1. / (numActive + 1)) {
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
                ThreeOhUnit(audio, midi, "sawtooth", delay.inputNode, clock.bpm, gen),
                ThreeOhUnit(audio, midi, "square", delay.inputNode, clock.bpm, gen)
            ],
            drums: yield NineOhUnit(audio, midi, clock.bpm),
            gen,
            delay,
            clock,
            masterVolume: parameter("Volume", [0, 1], 0.5)
        };
        if (midi) {
            console.log("MIDI output enabled");
            clock.bpm.subscribe(b => midi.noteLength = (1 / 4) * (60000 / b));
            midi.startClock(clock.bpm);
        }
        programState.masterVolume.subscribe(newVolume => { audio.master.in.gain.value = newVolume; });
        clock.currentStep.subscribe(step => [...programState.notes, programState.drums].forEach(d => d.step(step)));
        const autoPilot = AutoPilot(programState);
        const ui = UI(programState, autoPilot, audio.master.analyser, midi);
        document.body.append(ui);
    });
}
var midi = null;
try {
    window.navigator.requestMIDIAccess()
        .then((midiAccess) => {
        console.log("MIDI Ready!");
        midi = Midi(midiAccess);
        midi.listInputsAndOutputs();
    })
        .catch((error) => {
        console.log("Error accessing MIDI devices: " + error);
    });
}
catch (error) {
    console.log("Error accessing MIDI devices: " + error);
}
pressToStart(start, "Spicy Endless Acid Banger", "A collaboration between human and algorithm by Vitling, spiced up by Zykure");
//# sourceMappingURL=app.js.map