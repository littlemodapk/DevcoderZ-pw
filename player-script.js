;(function(_0x10f278, _0x56a312) {
    const _0x4c2b9a = function(_0x221379) {
        while (--_0x221379) {
            _0x56a312['push'](_0x56a312['shift']());
        }
    };
    _0x4c2b9a(++_0x56a312);
}(['getElementById', 'player', 'video', 'play', 'back', 'fwd', 'fs', 'controls', 'centerPlay', 'progress', 'bar', 'thumb', 'tgPopup', 'continueBtn', 'time', 'settings', 'settingsBtn', 'speed', 'quality', 'status', 'dropdownMenu', 'sidebar', 'slideList', 'innerText', 'style', 'display', 'block', 'none', 'active', 'toggle', 'open', 'search', 'get', 'stringify', 'POST', 'application/json', 'ok', 'm3u8Url', 'url', 'notes', 'slides', 'createElement', 'className', 'slide-item', 'innerHTML', 'appendChild', 'currentTime', 'loadSource', 'attachMedia', 'on', 'Events', 'MANIFEST_PARSED', 'levels', 'height', 'LEVEL_SWITCHED', 'ERROR', 'ErrorTypes', 'NETWORK_ERROR', 'startLoad', 'MEDIA_ERROR', 'recoverMediaError', 'destroy', 'canPlayType', 'src', 'addEventListener', 'loadedmetadata', 'duration', 'playbackRate', 'currentLevel', 'requestFullscreen', 'exitFullscreen', 'getBoundingClientRect', 'touches', 'clientX', 'setPointerCapture', 'releasePointerCapture', 'ontimeupdate', 'onloadedmetadata', 'onplay', 'onpause', 'onclick', 'preventDefault', 'stopPropagation', 'paused', 'max', 'min', 'style.display'], 0x1b4));

const _0x289a = function(_0x43b216, _0x3bc181) {
    return _0x43b216;
};

const playerElem = document[_0x289a('getElementById')]('player');
const videoElem = document[_0x289a('getElementById')]('video');
const playButton = document[_0x289a('getElementById')]('play');
const backButton = document[_0x289a('getElementById')]('back');
const fwdButton = document[_0x289a('getElementById')]('fwd');
const fsButton = document[_0x289a('getElementById')]('fs');
const controlsElem = document[_0x289a('getElementById')]('controls');
const centerPlayElem = document[_0x289a('getElementById')]('centerPlay');
const progressElem = document[_0x289a('getElementById')]('progress');
const barElem = document[_0x289a('getElementById')]('bar');
const thumbElem = document[_0x289a('getElementById')]('thumb');
const tgPopupElem = document[_0x289a('getElementById')]('tgPopup');
const continueBtnElem = document[_0x289a('getElementById')]('continueBtn');
const timeDisplayElem = document[_0x289a('getElementById')]('time');
const settingsElem = document[_0x289a('getElementById')]('settings');
const settingsBtnElem = document[_0x289a('getElementById')]('settingsBtn');
const speedSelect = document[_0x289a('getElementById')]('speed');
const qualitySelect = document[_0x289a('getElementById')]('quality');
const statusElem = document[_0x289a('getElementById')]('status');
const dropdownMenuElem = document[_0x289a('getElementById')]('dropdownMenu');
const sidebarElem = document[_0x289a('getElementById')]('sidebar');
const slideListElem = document[_0x289a('getElementById')]('slideList');

let isDragging = false, hideTimeoutRef, hlsInstance, wasVideoPlaying = false;
let globalNotesUrl = "";
let globalSlidesArray = [];

function updateStatusText(_0x18a211, _0x599021 = 'info') {
    statusElem.innerText = _0x18a211;
    statusElem.style.display = "block";
    if(_0x599021 === 'success') {
        setTimeout(() => { statusElem.style.display = 'none'; }, 2500);
    }
}

function toggleMenu(_0x51c911) {
    _0x51c911.stopPropagation();
    dropdownMenuElem.classList.toggle('active');
}

function toggleSidebar(_0x12bb94) {
    _0x12bb94.stopPropagation();
    dropdownMenuElem.classList.remove('active');
    sidebarElem.classList.toggle('active');
}

function openNotes(_0x4421aa) {
    _0x4421aa.stopPropagation();
    dropdownMenuElem.classList.remove('active');
    if (globalNotesUrl) {
        window.open(globalNotesUrl, '_blank');
    } else {
        alert('Notes not available for this session.');
    }
}

window.addEventListener('click', () => { 
    dropdownMenuElem.classList.remove('active'); 
});

const urlParamsExtractor = new URLSearchParams(location.search);
const bId = urlParamsExtractor.get("batchId");
const sId = urlParamsExtractor.get("subjectId");
const lId = urlParamsExtractor.get("lectureId");
const directStreamUrl = urlParamsExtractor.get("m3u8Url") || urlParamsExtractor.get("Url");

async function initializePlayerEngine() {
    let resolvedStreamUrl = "";
    
    if (directStreamUrl) {
        resolvedStreamUrl = decodeURIComponent(directStreamUrl);
    } else if (bId && sId && lId) {
        try {
            updateStatusText('🔄 Fetching secure configurations...');
            const endpointRoute = `https://devcoderz-backend.vercel.app/api/config`;
            
            const networkResponse = await fetch(endpointRoute, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ batchId: bId, subjectId: sId, lectureId: lId })
            });

            if (!networkResponse.ok) throw new Error(`Network failure code: ${networkResponse.status}`);
            const responsePayload = await networkResponse.json();
            
            if (responsePayload) {
                resolvedStreamUrl = responsePayload.m3u8Url || responsePayload.url;
                if (responsePayload.notes && responsePayload.notes.length > 0) {
                    globalNotesUrl = responsePayload.notes[0].url;
                }
                if (responsePayload.slides && responsePayload.slides.length > 0) {
                    globalSlidesArray = responsePayload.slides;
                    buildSlideItems();
                }
            }
        } catch (errCatch) {
            updateStatusText('❌ Error connecting to stream service', 'error');
            return;
        }
    } else {
        updateStatusText('❌ Required parameters missing!', 'error');
        return;
    }

    if (!resolvedStreamUrl) {
        updateStatusText('❌ Target stream source not found!', 'error');
        return;
    }

    setupHlsPlayer(resolvedStreamUrl);
}

function setupHlsPlayer(_0x33b110) {
    updateStatusText('🔄 Initializing stream buffer...');

    if (videoElem.canPlayType('application/vnd.apple.mpegurl')) {
        videoElem.src = _0x33b110;
        videoElem.addEventListener('loadedmetadata', () => {
            updateStatusText('✅ Playing natively via HLS', 'success');
        });
    } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        hlsInstance = new Hls({ 
            enableWorker: true, 
            lowLatencyMode: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60
        });
        hlsInstance.loadSource(_0x33b110);
        hlsInstance.attachMedia(videoElem);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_0x48bb1, _0x211ac) => {
            updateStatusText('✅ Stream ready!', 'success');
            qualitySelect.innerHTML = '<option value="-1">AUTO</option>';
            hlsInstance.levels.forEach((_0x33a1, _0x992b) => {
                let _0xopt = document.createElement("option");
                _0xopt.value = _0x992b;
                _0xopt.text = _0x33a1.height + "p";
                qualitySelect.appendChild(_0xopt);
            });
        });

        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_0x911, _0xdata) => {
            qualitySelect.value = _0xdata.level;
        });

        hlsInstance.on(Hls.Events.ERROR, function(_0xe1, _0xe2) {
            if (_0xe2.fatal) {
                switch (_0xe2.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        hlsInstance.destroy();
                        updateStatusText('❌ Fatal stream error encountered', 'error');
                        break;
                }
            }
        });
    } else {
        updateStatusText('❌ Unsupported browser configuration', 'error');
    }
}

function buildSlideItems() {
    slideListElem.innerHTML = "";
    globalSlidesArray.forEach((_0xslide) => {
        const _0xcard = document.createElement('div');
        _0xcard.className = 'slide-item';
        const _0xtimeStr = formatTimestamp(_0xslide.timestamp);
        
        _0xcard.innerHTML = `
            <img src="${_0xslide.image}" alt="Slide">
            <div class="slide-time">🕒 ${_0xtimeStr}</div>
        `;
        _0xcard.onclick = (_0xev) => {
            _0xev.stopPropagation();
            videoElem.currentTime = _0xslide.timestamp;
            videoElem.play();
            if(window.innerWidth < 600) sidebarElem.classList.remove('active');
        };
        slideListElem.appendChild(_0xcard);
    });
}

window.addEventListener('load', () => {
    setTimeout(initializePlayerEngine, 400);
});

function formatTimestamp(_0xsec) {
    if(!_0xsec || isNaN(_0xsec) || _0xsec === Infinity) return "00:00:00";
    let _0xh = Math.floor(_0xsec / 3600);
    let _0xm = Math.floor((_0xsec % 3600) / 60);
    let _0xs = Math.floor(_0xsec % 60);
    return [_0xh, _0xm, _0xs].map(_0xnum => String(_0xnum).padStart(2, "0")).join(":");
}

function refreshProgressBarUI(_0xpct, _0xcurr, _0xdur) {
    barElem.style.width = _0xpct + "%";
    thumbElem.style.left = _0xpct + "%";
    timeDisplayElem.innerText = `${formatTimestamp(_0xcurr)} / ${formatTimestamp(_0xdur)}`;
}

function triggerSafePlayback() {
    videoElem.play().catch(() => {
        videoElem.muted = true;
        videoElem.play();
    });
}

function handleControlVisibility(_0xpermanent = false) {
    controlsElem.classList.remove("hide");
    clearTimeout(hideTimeoutRef);
    if(!_0xpermanent) {
        hideTimeoutRef = setTimeout(() => controlsElem.classList.add("hide"), 3000);
    }
}

continueBtnElem.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    tgPopupElem.style.display = "none";
    centerPlayElem.classList.remove("hide");
    controlsElem.classList.remove("hide");
    handleControlVisibility();
};

centerPlayElem.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    triggerSafePlayback();
};

playButton.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    videoElem.paused ? triggerSafePlayback() : videoElem.pause();
};

backButton.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    videoElem.currentTime = Math.max(0, videoElem.currentTime - 10);
    handleControlVisibility(true);
};

fwdButton.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    videoElem.currentTime = Math.min(videoElem.duration, videoElem.currentTime + 10);
    handleControlVisibility(true);
};

settingsBtnElem.onclick = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    settingsElem.style.display = (settingsElem.style.display === "block" ? "none" : "block");
    handleControlVisibility(true);
};

speedSelect.onchange = _0xe => {
    videoElem.playbackRate = parseFloat(speedSelect.value);
};

qualitySelect.onchange = _0xe => {
    if(hlsInstance) hlsInstance.currentLevel = parseInt(qualitySelect.value);
};

fsButton.onclick = async _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    try {
        if (!document.fullscreenElement) {
            await playerElem.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(() => {});
            }
        } else {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
            await document.exitFullscreen();
        }
    } catch (_0xerr) {}
};

function extractPointerPosition(_0xe) {
    const _0xrect = progressElem.getBoundingClientRect();
    const _0xclientX = _0xe.touches ? _0xe.touches[0].clientX : _0xe.clientX;
    let _0xcalcPos = (_0xclientX - _0xrect.left) / _0xrect.width;
    return Math.max(0, Math.min(1, _0xcalcPos));
}

progressElem.onpointerdown = _0xe => {
    _0xe.preventDefault();
    _0xe.stopPropagation();
    isDragging = true;
    wasVideoPlaying = !videoElem.paused;
    videoElem.pause();
    progressElem.setPointerCapture(_0xe.pointerId);
    let _0xpos = extractPointerPosition(_0xe);
    if(videoElem.duration) {
        videoElem.currentTime = _0xpos * videoElem.duration;
        refreshProgressBarUI(_0xpos * 100, videoElem.currentTime, videoElem.duration);
    }
};

progressElem.onpointermove = _0xe => {
    if(!isDragging) return;
    _0xe.preventDefault();
    _0xe.stopPropagation();
    let _0xpos = extractPointerPosition(_0xe);
    if(videoElem.duration) {
        videoElem.currentTime = _0xpos * videoElem.duration;
        refreshProgressBarUI(_0xpos * 100, videoElem.currentTime, videoElem.duration);
    }
};

progressElem.onpointerup = _0xe => {
    if(!isDragging) return;
    _0xe.preventDefault();
    _0xe.stopPropagation();
    isDragging = false;
    try { progressElem.releasePointerCapture(_0xe.pointerId); } catch(_0xerr) {}
    if(wasVideoPlaying) { triggerSafePlayback(); }
};

videoElem.ontimeupdate = () => {
    if(!isDragging && videoElem.duration) {
        refreshProgressBarUI((videoElem.currentTime / videoElem.duration) * 100, videoElem.currentTime, videoElem.duration);
    }
};

videoElem.onloadedmetadata = () => {
    if(videoElem.duration) {
        refreshProgressBarUI(0, videoElem.currentTime, videoElem.duration);
    }
};

videoElem.onplay = () => {
    playButton.classList.add("pause");
    centerPlayElem.classList.add("hide");
    handleControlVisibility();
};

videoElem.onpause = () => {
    playButton.classList.remove("pause");
    centerPlayElem.classList.add("hide");
    handleControlVisibility(true);
};

playerElem.onclick = _0xe => {
    if(tgPopupElem.style.display !== "none") return;
    if(_0xe.target === videoElem || _0xe.target === playerElem) {
        sidebarElem.classList.remove('active');
        if(controlsElem.classList.contains("hide")) {
            handleControlVisibility();
        } else {
            controlsElem.classList.add("hide");
            settingsElem.style.display = "none";
        }
    }
};
