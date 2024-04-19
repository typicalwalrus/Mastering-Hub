await WebAudio.enable();

const audioAlpha = new (AudioContext || webkitURL.AudioContext)();

// creating buffer node
const bufferNode = audioAlpha.createBufferSource();
bufferNode.connect(audioAlpha.destination);

// Just a placeholder, will work out a way to update the sample rate based on the sample rate of the file.
let sampleRate = 44100;

// File Buffer
let fileBuffer = null;

const loadFileIntoBuffer = function () {
  const fileUpload = document.getElementById("fileToUpload");
  let file = fileUpload.files[0];

  // Error throwing
  if (!file) {
    console.log("Error. No File Selected");
  }

  let fileReader = new FileReader();

  audioAlpha.decodeAudioData(
    event.target.result,
    function (buffer) {
      // If successful, the decoded audio data is placed into our buffer.
      fileBuffer.buffer = buffer;
      console.log("Buffer loaded into fileBuffer");

      // If the decoding fails, an error message will be logged.
    },
    function (err) {
      console.error("Error decoding audio data", err);
    }
  );
};
fileReader.readAsArrayBuffer(file);
document.getElementById("Upload File").addEventListener("click", (event) => {
  // Resume the audio context.
  // The Web Audio API requires us to call resume() on a user gesture,
  // like a click or a key press, before we can start outputting sound.
  event.preventDefault();
  audioAlpha.resume();

  // Call the function to load a file into the audio buffer.
  // This will prompt the user to select a file, and then load that file into an AudioBuffer for playback.
  loadFileIntoBuffer();
});
let loudnessArray = audioBuffer.buffer.getChannelData(0);
/**
 * function to calculate intergrated LUFS
 * @param {AudioBufferSourceNode}
 * @param {Number} sampleRate
 * @returns {Number} intergrated LUFS Value
 */
const calcLUFS = function (loudnessArray) {
  let sumSquared = 0;
  for (let i = 0; i < loudnessArray.length; i++) {
    sumSquared += loudnessArray[i] * loudnessArray[i];
  }

  const rms = Math.sqrt(sumSquared / loudnessArray.length);
  const loudnessDB = 20 * Math.log10(rms);

  // Normalization
  const intergratedLUFS = loudnessDB + 0;
  return intergratedLUFS;
};

// I don't really fully understand this math, but it seemed right.

document.getElementById("LUFS Result").innerText = `${Math.floor(
  intergratedLUFS
)}`;
