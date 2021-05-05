import React, { useState, useEffect, useReducer } from "react";

export default function ASR({ handleTrans }) {
    const [pcon, setPcon] = useState(null);
    const [dcha, setDcha] = useState(null);
    // eslint-disable-next-line
    const [dcInterval, setDcInterval] = useState(null);
    const [ui, setUi] = useReducer((os, s) => ({ ...os, ...s }), {
        buttonStarted: false,
        lastTransText: "",
        statusFieldText: "Press start",
        imcompleteTrans: "",
        transcriptionOutputs: [],
    });

    
    useEffect(() => {
        if (ui.buttonStarted === false) {
            handleTrans(ui.lastTransText);
            setUi({
                lastTransText: "💤",
                statusFieldText: "Press start",
            });
        }
        // eslint-disable-next-line
    }, [ui.buttonStarted]);

    const negotiate = (pc) => {
        return pc
            .createOffer()
            .then(function (offer) {
                return pc.setLocalDescription(offer);
            })
            .then(function () {
                return new Promise(function (resolve) {
                    if (pc.iceGatheringState === "complete") {
                        resolve();
                    } else {
                        function checkState() {
                            if (pc.iceGatheringState === "complete") {
                                pc.removeEventListener("icegatheringstatechange", checkState);
                                resolve();
                            }
                        }

                        pc.addEventListener("icegatheringstatechange", checkState);
                    }
                });
            })
            .then(function () {
                var offer = pc.localDescription;
                console.log(offer.sdp);
                return fetch("http://localhost:8080/offer", {
                    body: JSON.stringify({
                        sdp: offer.sdp,
                        type: offer.type,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                });
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (answer) {
                console.log(answer.sdp);
                return pc.setRemoteDescription(answer);
            })
            .catch(function (e) {
                console.log(e);
                setUi({ buttonStarted: false });
            });
    };

    const start = () => {
        setUi({
            buttonStarted: true,
            lastTransText: "💤",
            statusFieldText: "Connecting...",
        });

        var config = {
            sdpSemantics: "unified-plan",
        };

        const pc = new RTCPeerConnection(config);
        setPcon(pc);
        var parameters = {};

        const dc = pc.createDataChannel("chat", parameters);
        setDcha(dc);

        dc.onclose = () => {
            clearInterval(dcInterval);
            console.log("Closed data channel");
            setUi({ buttonStarted: false });
        };
        dc.onopen = () => {
            console.log("Opened data channel");
        };
        dc.onmessage = (evt) => {
            setUi({ statusFieldText: "Listening..." });
            var msg = evt.data;
            if (msg.endsWith("\n")) {
                setUi({
                    lastTransText: "...",
                    transcriptionOutputs: [
                        ...ui.transcriptionOutputs,
                        ui.imcompleteTrans + msg.substring(0, msg.length - 1),
                    ],
                    imcompleteTrans: "",
                });
            } else if (msg.endsWith("\r")) {
                setUi({
                    lastTransText: ui.imcompleteTrans + msg.substring(0, msg.length - 1) + "...",
                    imcompleteTrans: "",
                });
            } else {
                setUi({ imcompleteTrans: ui.imcompleteTrans + msg });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "disconnected") {
                console.log("Disconnected");
                setUi({ buttonStarted: false });
            }
        };

        var constraints = {
            audio: true,
            video: false,
        };

        navigator.mediaDevices.getUserMedia(constraints).then(
            (stream) => {
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });
                return negotiate(pc);
            },
            (err) => {
                console.log("Could not acquire media: " + err);
                setUi({ buttonStarted: false });
            }
        );
    };

    function stop() {
        // close data channel
        if (dcha) {
            dcha.close();
        }

        // close transceivers
        if (pcon.getTransceivers) {
            pcon.getTransceivers().forEach(function (transceiver) {
                if (transceiver.stop) {
                    transceiver.stop();
                }
            });
        }

        // close local audio / video
        pcon.getSenders().forEach(function (sender) {
            sender.track.stop();
        });

        // close peer connection
        setTimeout(function () {
            pcon.close();
        }, 500);
    }

    return (
        <>
            {/* <div class="jumbotron">
                <div class="container">
                    <img id="logo" class="display-4 float-left" src="/static/kaldi_logo.png" />
                    <div>
                        <h1 class="display-4">Kaldi live speech recognition demo</h1>
                        <p class="lead">
                            With WebRTC technology using <a href="https://github.com/aiortc/aiortc">aiortc</a> project
                        </p>
                    </div>
                </div>
            </div> */}
            <div className="container">
                <p>
                    <button className={`btn btn-success ${ui.buttonStarted && "d-none"}`} id="start" onClick={start}>
                        Start
                    </button>
                    <button
                        className={`btn btn-danger d-none ${ui.buttonStarted || "d-none"}`}
                        id="stop"
                        onClick={stop}
                    >
                        Stop
                    </button>
                    <span
                        id="status"
                        className="text-uppercase text-muted"
                        style={{
                            fontSize: "9pt",
                            marginLeft: "10px",
                        }}
                    >
                        {ui.statusFieldText}
                    </span>
                </p>

                <div
                    id="output"
                    style={{
                        backgroundColor: "#EEE",
                        height: 200,
                        overflow: "auto",
                        padding: 10,
                    }}
                >
                    {ui.transcriptionOutputs.map((trans, index) => (
                        <span key={index} style={{ marginLeft: "1em" }}>
                            {trans}
                        </span>
                    ))}
                    <span style={{ marginLeft: "1em" }}>{ui.lastTransText}</span>
                </div>
            </div>
        </>
    );
}
