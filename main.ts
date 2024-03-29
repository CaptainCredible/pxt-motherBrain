
/**
*motherBarn
*moved some stuff around
 */
//
let interruptPin = DigitalPin.P0
let radioSlowDown = 0
let trackReceived = 0
let column = 0
let row = 0
let myOnTime = 20
let myOnTimer = 20
let bufferCounter = 0
let isPolyByte: boolean[] = [true, true, true, true, true, true, true, true]
let dataReceived = 0
let index3 = 0
let noteReceived = 0
let ledTimer = 0
let ledsAreOn = false
let readTimer = 0
let sendClock = true
let tracksBuffer: number[] = [0, 0, 0, 0, 0, 0, 0, 0]
let targetNames: string[] = ["BobP", "TimP", "TedP", "PatP", "CatP", "DadP", "MumP", "Zim"]
let altTargetNames: string[] = ["BobP", "TimP", "TedP", "PatP", "CatP", "DadP", "MumP", "Zim"]
//defl//["BobP", "TimP", "TedP", "PatP", "CatP", "DadP", "MumP", "Zim"]
let debug = false
let muteThumpers = false
let numberOfTracks = 8
let currentStep = 0
let mutes = 0
let step2send = 0
let subDiv = 2
let allowNameSwitch = false
let soloingState = false
let musSelect = 0
let oldSoloingState = false;
/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon=""
namespace motherBrain {
    /**
     * TODO: describe your function here
     * @param n describe parameter here, eg: 5
     * @param s describe parameter here, eg: "Hello"
     * @param e describe parameter here 
     */
    //%blockId="makeMotherBrain" block="motherBrain"
    export function makeMotherBrain() {
        basic.showLeds(`
    # . # . #
    . # # # .
    . . # . .
    . # # # .
    . . # . .
    `)
        led.toggle(1, 0)
        led.toggle(3, 0)
        led.toggle(1, 1)
        led.toggle(3, 1)
        radio.setGroup(83)
        radio.setTransmitPower(7)

        input.onButtonPressed(Button.A, function () {
            if (soloingState) {
                musSelect--
                soloAMusician(musSelect)
                basic.showNumber(musSelect, 50)
            }
            else {
                allowNameSwitch = !allowNameSwitch
                led.toggle(0, 4)
            }
        })

        input.onButtonPressed(Button.B, function () {
            if (soloingState) {
                musSelect++
                soloAMusician(musSelect)
                basic.showNumber(musSelect, 50)
            } else {
                muteThumpers = !muteThumpers
                led.toggle(4, 4)
                sendMutes()
            }

        })
        input.onButtonPressed(Button.AB, function () {
            soloingState = !soloingState
            if (soloingState) {
                soloAMusician(musSelect)
                basic.showNumber(musSelect, 100)
            }
            if (!soloingState) {
                unMuteAllMusicians()
                basic.showLeds(`
    . . # . .
    . . # . .
    . . # . .
    . . # . .
    . # # # .
    `, 0)
                if (muteThumpers) {
                    led.plot(4, 4)
                }
                if (allowNameSwitch) {
                    led.plot(0, 4)
                }
            }

        })

        function serialDebug() {
            /*
            for (let serialDebugIndex = 0; serialDebugIndex <= numberOfTracks - 1; serialDebugIndex++) {
                serial.writeValue(targetNames[serialDebugIndex], tracksBuffer[serialDebugIndex])
            }
            */
        }

        function sendClockTick() {
            if(currentStep != 200){
                if (step2send != Math.trunc(currentStep / subDiv)) {
                
                    radio.setGroup(84)
                    step2send = Math.trunc(currentStep / subDiv)
                    radio.sendValue("t", step2send)
                    radio.setGroup(83)
                }
            }
        }
/*
        
        function sendClockTick() {
            radio.setGroup(84)
            radio.sendValue("t", currentStep)
            serial.writeValue("step", currentStep)
            radio.setGroup(83)
        }
*/        
        
        function sendMutes() {
            if (muteThumpers) {
                mutes = mutes | 0b100000000
            } else {
                mutes = mutes & 0b011111111
            }
            radio.sendValue("m", mutes)
        }

        pins.onPulsed(interruptPin, PulseValue.High, function () {
            let dataBuffer = pins.i2cReadBuffer(8, (numberOfTracks + 2) * 2, false)
            led.toggle(2,2)
            for (let tracksBufferFillIndex = 0; tracksBufferFillIndex <= numberOfTracks - 1; tracksBufferFillIndex++) {
                tracksBuffer[tracksBufferFillIndex] = dataBuffer.getNumber(NumberFormat.UInt16LE, tracksBufferFillIndex * 2)
            }
           currentStep = dataBuffer.getNumber(NumberFormat.Int16LE, 16)
            mutes = dataBuffer.getNumber(NumberFormat.Int16LE, 18)
            let detect = false
            let originalSendIndex = [0,1,2,3,4,5,6,7];
            let remapSendIndex = [7,4,6,0,1,2,3,5]; // send to receivers that are probably running synth code first

            for (let sendIndex = 0; sendIndex <= numberOfTracks - 1; sendIndex++) {
                if (tracksBuffer[remapSendIndex[sendIndex]] > 0) {
                    detect = true
                    if (radioSlowDown > 0) {
                        control.waitMicros(radioSlowDown); // ATTEMPT TO SLOW DOWN RADIO MESSAGES
                    }
                    if (!allowNameSwitch) {
                        radio.sendValue(targetNames[remapSendIndex[sendIndex]], tracksBuffer[remapSendIndex[sendIndex]])
                    } else {
                        radio.sendValue(altTargetNames[remapSendIndex[sendIndex]], tracksBuffer[remapSendIndex[sendIndex]])
                    }
                    if(radioSlowDown > 0){
                        control.waitMicros(radioSlowDown); // ATTEMPT TO SLOW DOWN RADIO MESSAGES
                    }
                    

                }
            }
            if (detect) {
                if (!soloingState) {
                    led.toggle(1, 0)
                    led.toggle(3, 0)
                    led.toggle(1, 1)
                    led.toggle(3, 1)
                } else {
                    led.toggle(4, 4)
                }
            }
            sendMutes()
            if (sendClock) {
                sendClockTick()
            }
            // led.toggleAll()
            if (debug) {
                serialDebug()
            }
        })

    }

    /**
 * TODO: describe your function here
 * @param value describe value here, eg: 5
 */
    //% blockID="enable touch mutes" block="touchMute"
    export function accelMute() {
        
        input.onLogoEvent(TouchButtonEvent.Pressed, function() {
            soloingState = !soloingState
            if(soloingState){
                soloAMusician(musSelect)
                basic.showNumber(musSelect, 100)
            } else {
                soloingState = false
                unMuteAllMusicians()
                basic.showLeds(`
    . . # . .
    . . # . .
    . . # . .
    . . # . .
    . # # # .
    `, 0)
                if (muteThumpers) {
                    led.plot(4, 4)
                }
                if (allowNameSwitch) {
                    led.plot(0, 4)
                }
            }
        })
        

        
    }


    /**
     * TODO: describe your function here
     * @param value describe value here, eg: 5
     */
    //% blockID="changeName" block="change name number $nameNumber| to $newName"
    export function changeName(nameNumber: number, newName: string) {
        altTargetNames[nameNumber] = newName + "P"
    }

    /**
     * TODO: describe your function here
     * @param value describe value here, eg: 5
     */
    //% blockID="slowDownRadioMessages" block="slow down messages by $delayAmount"
    export function slowDownRadio(delayAmount: number) {
        radioSlowDown = delayAmount;
    }

    /**
 * TODO: describe your function here
 * @param value describe value here, eg: 5
 */
    //% blockID="muteAllMusicians" block="mute all musicians"
    export function muteAllMusicians() {
        radio.setGroup(84)
        radio.sendValue("ma", 0)
        basic.pause(10)
        radio.sendValue("ma", 0)
        basic.pause(10)
        radio.sendValue("ma", 0)
        radio.setGroup(83)
    }

    /**
 * TODO: describe your function here
 * @param value describe value here, eg: 5
 */
    //% blockID="muteOneMusician" block="mute one musician"
    export function muteOneMusicians(thisOne: number) {
        radio.setGroup(84)
        radio.sendValue("m", thisOne)
        basic.pause(10)
        radio.sendValue("m", thisOne)
        basic.pause(10)
        radio.sendValue("m", thisOne)
        radio.setGroup(83)
    }

    /**
* TODO: describe your function here
* @param value describe value here, eg: 5
*/
    //% blockID="unMuteAllMusicians" block="unmute all musicians"
    export function unMuteAllMusicians() {
        radio.setGroup(84)
        radio.sendValue("uma",1337)
        basic.pause(10)
        radio.sendValue("uma", 1337)
        basic.pause(10)
        radio.sendValue("uma", 1337)
        radio.setGroup(83)
    }

    /**
* TODO: describe your function here
* @param value describe value here, eg: 5
*/
    //% blockID="unMuteOneMusician" block="unmute one musician"
    export function unMuteOneMusician(thisOne: number) {
        radio.setGroup(84)
        radio.sendValue("mum", thisOne)
        basic.pause(10)
        radio.sendValue("mum", thisOne)
        basic.pause(10)
        radio.sendValue("mum", thisOne)
        radio.setGroup(83)
    }

    /**
* TODO: describe your function here
* @param value describe value here, eg: 5
*/
    //% blockID="soloAMusician" block="solo a musician"
    export function soloAMusician(thisOne: number) {
        radio.setGroup(84)
        radio.sendValue("ms", thisOne)
        basic.pause(10)
        radio.sendValue("ms", thisOne)
        basic.pause(10)
        radio.sendValue("ms", thisOne)
        radio.setGroup(83)
    }
    /**
    * TODO: describe your function here
    * @param value describe value here, eg: 5
    */
    //% blockID="setSubdivTo" block="set clock subdivision to $subD "
    export function setSubdivTo(subD: number) {
        subDiv = subD
        subDiv = Math.constrain(subDiv, 1, 8)
    }

    /**
* TODO: describe your function here
* @param value describe value here, eg: 5
*/
    //% blockID="alwaysUseAltNames" block="allways use alternate names"
    export function alwaysUseAltNames() {
        allowNameSwitch = true
    }
}

