var pc = null;

function negotiate() {
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    return pc.createOffer().then((offer) => {
        return pc.setLocalDescription(offer);
    }).then(() => {
        // wait for ICE gathering to complete
        return new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                const checkState = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                };
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(() => {
        var offer = pc.localDescription;
        var serverUrl = document.getElementById('server-url').value || ''; // Get custom URL
        var apiUrl = serverUrl ? (serverUrl + '/offer') : '/offer';
        
        return fetch(apiUrl, {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type,
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then((response) => {
        return response.json();
    }).then((answer) => {
        document.getElementById('sessionid').value = answer.sessionid;
        // Store the session ID in localStorage so control.html can access it
        localStorage.setItem('sessionId', answer.sessionid);
        return pc.setRemoteDescription(answer);
    }).catch((e) => {
        alert(e);
    });
}

function start() {
    var config = {
        sdpSemantics: 'unified-plan'
    };

    if (document.getElementById('use-stun').checked) {
        config.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];
    }

    pc = new RTCPeerConnection(config);

    // connect audio / video
    pc.addEventListener('track', (evt) => {
        if (evt.track.kind == 'video') {
            document.getElementById('video').srcObject = evt.streams[0];
            document.getElementById('video-debug').textContent = 'Received ('+evt.track.id+')';
            
            // Log video track details
            console.log('Video track received:', evt.track);
            console.log('Video stream:', evt.streams[0]);
            
            // Make sure video is visible and properly sized
            document.getElementById('video').style.display = 'block';
            
            // Add event listeners to debug video element
            const videoElement = document.getElementById('video');
            videoElement.onloadedmetadata = () => {
                console.log('Video metadata loaded, dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
            };
            videoElement.onplay = () => {
                console.log('Video started playing');
            };
            videoElement.onerror = (e) => {
                console.error('Video error:', videoElement.error);
            };
        } else {
            document.getElementById('audio').srcObject = evt.streams[0];
        }
    });

    // Add this to the start() function after creating the RTCPeerConnection
    pc.addEventListener('connectionstatechange', () => {
        console.log('Connection state changed to:', pc.connectionState);
        document.getElementById('connection-debug').textContent = pc.connectionState;
        
        if (pc.connectionState === 'connected') {
            // Connection established, hide the server URL container if it's still visible
            document.getElementById('server-url-container').classList.add('hidden');
        }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
        console.log('ICE connection state:', pc.iceConnectionState);
    });

    negotiate();
}

function stop() {
    // document.getElementById('stop').style.display = 'none';

    // close peer connection
    setTimeout(() => {
        pc.close();
    }, 500);
}

window.onunload = function(event) {
    // 在这里执行你想要的操作
    setTimeout(() => {
        pc.close();
    }, 500);
};

window.onbeforeunload = function (e) {
        setTimeout(() => {
                pc.close();
            }, 500);
        e = e || window.event
        // 兼容IE8和Firefox 4之前的版本
        if (e) {
          e.returnValue = '关闭提示'
        }
        // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
        return '关闭提示'
      }