'use strict';

const audioElement = document.querySelector('audio');
const audioInputSelect = document.createElement('audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const selectors = [audioInputSelect, audioOutputSelect];

// Set keyword of external speakers
const audioOutputExcludeKeys = ["display", "bluetooth"]

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);

var today = new Date();
var expiry = new Date(today.getTime() + 30 * 24 * 3600 * 1000); // plus 30 days

function setCookie(name, value) {
  document.cookie=name + "=" + escape(value) + "; path=/; expires=" + expiry.toGMTString();
}

function getCookie(name) {
  var re = new RegExp(name + "=([^;]+)");
  var value = re.exec(document.cookie);
  return (value != null) ? unescape(value[1]) : null;
}

function gotDevices(deviceInfos) {
  // console.log(deviceInfos);
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (select.id == "audioOutput") {
      console.log("Set audio output device");
      let selectOptionsArray = Array.from(select.options)
      let lastAudioOutputSelectedValue = getCookie("lastAudioOutputSelectedValue");
      // If user's last setting exists in the cookie and the devices list, use it as the audio output
      if (lastAudioOutputSelectedValue && selectOptionsArray.some(el => el.value == getCookie("lastAudioOutputSelectedValue"))) {
        console.log("Get lastAudioOutputSelectedValue(" + lastAudioOutputSelectedValue + ") in cookie");
        select.value = lastAudioOutputSelectedValue;
        attachSinkId(audioElement, lastAudioOutputSelectedValue);
      } else {
        for (let option_element of selectOptionsArray) {
          let option_value = option_element.value.toLowerCase();
          // Don't use deviceId is default and communications as the audio output, because these two options will change with the user's system settings
          if (option_value != "default" && option_value != "communications") {
            // Don't use device label contains the keyword in audioOutputExcludeKeys as the audio output
            if (!audioOutputExcludeKeys.some(key => option_element.text.toLowerCase().includes(key))) {
              console.log("Attach audio output device to " + option_element.text + "(" + option_element.value + ")")
              select.value = option_element.value;
              attachSinkId(audioElement, option_element.value);
              break;
            }
          }
        };
      }
    } else {
      if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
        select.value = values[selectorIndex];
      }
    }
  });
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        })
        .catch(error => {
          let errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          audioOutputSelect.selectedIndex = 0;
        });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(audioElement, audioDestination);
  // Save user's last setting in cookie
  setCookie("lastAudioOutputSelectedValue", audioDestination);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  audioElement.srcObject = stream;
  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const constraints = {
    audio: true
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
}

audioOutputSelect.onchange = changeAudioDestination;

start();
