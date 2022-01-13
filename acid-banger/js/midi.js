/*
  Copyright 2022 Jan Behrens
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
import { textNoteToNumber } from "./audio.js";
export function Midi(midiAccess, noteLength = 100) {
    function listInputsAndOutputs() {
        for (var entry of midiAccess.inputs) {
            var input = entry[1];
            console.log("Input port [type:'" + input.type + "'] id:'" + input.id +
                "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
                "' version:'" + input.version + "'");
        }
        for (var entry of midiAccess.outputs) {
            var output = entry[1];
            console.log("Output port [type:'" + output.type + "'] id:'" + output.id +
                "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
                "' version:'" + output.version + "'");
        }
    }
    function getOutputNames() {
        var devices = [];
        devices.push("(None)");
        for (var entry of midiAccess.outputs) {
            var output = entry[1];
            //devices.push(output.manufacturer + " " + output.name);
            devices.push(output.name);
        }
        return devices;
    }
    function getOutput(portID) {
        if (typeof (portID) === 'number') {
            if (portID == 0)
                return null;
            var key = Array.from(midiAccess.outputs.keys())[portID - 1];
            return midiAccess.outputs.get(key);
        }
        else {
            return midiAccess.outputs.get(portID);
        }
    }
    function startClock(bpm) {
        for (var entry of midiAccess.outputs) {
            var output = entry[1];
            output.send([0xF8]); // clock signal
        }
        window.setTimeout(startClock, (60000 / bpm.value) * (1 / 24));
    }
    function OutputDevice(portID) {
        function noteOn(note, accent = false, glide = false, offset = 0) {
            if (note < 0)
                return;
            var midiNote = typeof (note) === 'number' ? note : textNoteToNumber(note);
            midiNote += offset;
            var midiLength = glide ? noteLength : noteLength / 2;
            const noteOnMessage = [0x90, midiNote, accent ? 0x7f : 0x5f];
            const noteOffMessage = [0x80, midiNote, 0x40];
            var output = getOutput(portID);
            if (output) {
                //console.log("Sending MIDI message: ", noteOnMessage, noteOffMessage)
                output.send(noteOnMessage);
                output.send(noteOffMessage, window.performance.now() + midiLength);
            }
        }
        function noteOff(note, offset = 0) {
            if (note < 0)
                return;
            var midiNote = typeof (note) === 'number' ? note : textNoteToNumber(note);
            midiNote += offset;
            const noteOffMessage = [0x80, midiNote, 0x40];
            var output = getOutput(portID);
            if (output) {
                //console.log("Sending MIDI message: ", noteOffMessage)
                output.send(noteOffMessage);
            }
        }
        function allNotesOff() {
            const notesOffMessage = [0x07B, 0];
            var output = getOutput(portID);
            if (output) {
                //console.log("Sending MIDI message: ", allNotesOff)
                output.send(allNotesOff);
            }
        }
        function controlChange(control, value) {
            if (control < 0)
                return;
            const controlChangeMessage = [0xB0, control, value];
            var output = getOutput(portID);
            if (output) {
                //console.log("Sending MIDI message: ", controlChangeMessage)
                output.send(controlChangeMessage);
            }
        }
        // function clockPulse() {
        //     const clockMessage = [0xF8];
        //     var output = getOutput(portID);
        //     if (output) {
        //         //console.log("Sending MIDI message: ", clockMessage)
        //         output.send(clockMessage);
        //     }
        // }
        return {
            noteOn,
            noteOff,
            allNotesOff,
            controlChange,
            // clockPulse
        };
    }
    return {
        noteLength,
        listInputsAndOutputs,
        getOutputNames,
        getOutput,
        OutputDevice,
        startClock,
    };
}
//# sourceMappingURL=midi.js.map