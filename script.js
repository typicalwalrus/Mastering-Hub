const audioAlpha = new (AudioContext || webkitURL.AudioContext())();

// Connecting the file upload to the ID from the HTML file.
const fileUpload = document.getElementById("fileToUpload");
// creating buffer node
const bufferNode = audioAlpha.createBufferSource();
bufferNode.connect(audioAlpha.destination);

// Just a placeholder, will work out a way to update the sample rate based on the sample rate of the file.
let sampleRate = 44100;

// this is going to be an array value of the loudness values of the file once I work out the hosting system.
let loudnessArray = [];

/**
 * function to calculate intergrated LUFS
 * @param {Array} loudnessArray
 * @param {Number} sampleRate
 * @returns {Number} intergrated LUFS Value
 */
const calcLUFS = function (loudnessArray, sampleRate) {
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
