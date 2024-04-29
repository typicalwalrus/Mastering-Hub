const audioAlpha = new (AudioContext || webkitURL.AudioContext)();

// creating buffer node
const bufferNode = audioAlpha.createBufferSource();
bufferNode.connect(audioAlpha.destination);

// Just a placeholder, will work out a way to update the sample rate based on the sample rate of the file.
// let sampleRate = 44100;

// File Buffer
let fileBuffer = null;

let destinationBuffer = null;

// Function to load file into audio buffer
const loadFileIntoBuffer = function () {
  const fileUpload = document.getElementById("fileToUpload");
  let file = fileUpload.files[0];

  // Error throwing
  if (!file) {
    console.log("Error. No File Selected");
  }

  let fileReader = new FileReader();

  fileReader.onload = function (event) {
    fileBuffer = audioAlpha.createBufferSource();
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
};

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

/**
 * function to calculate intergrated RMS
 * @param {AudioBufferSourceNode}
 * @param {Number} sampleRate
 * @returns {Number} intergrated RMS Value
 */
const calcRMS = function (testBuffer) {
  let loudnessArray = testBuffer.buffer.getChannelData(0);
  let sumSquared = 0;
  for (let i = 0; i < loudnessArray.length; i++) {
    sumSquared += loudnessArray[i] * loudnessArray[i];
  }

  const rms = Math.sqrt(sumSquared / loudnessArray.length);
  const loudnessDB = 20 * Math.log10(rms);

  // Normalization
  let intergratedRMS = loudnessDB + 0;
  intergratedRMS = Math.round(intergratedRMS * 100) / 100;
  return intergratedRMS;
};
// const calculateSegmentLoudness = function (segmentData, numSamples) {
//   // Calculate the average loudness of the segment data
//   let sumSquared = 0;
//   // let numSamples = segmentData[0].length; // Assuming all channels have the same number of samples
//   for (let i = 0; i < numSamples; i++) {
//     let sumChannelsSquared = 0;
//     for (let channel = 0; channel < segmentData.length; channel++) {
//       sumChannelsSquared += segmentData[channel][i] * segmentData[channel][i];
//     }
//     sumSquared += sumChannelsSquared / segmentData.length;
//   }
//   const rms = Math.sqrt(sumSquared / numSamples);
//   const loudnessDB = 20 * Math.log10(rms);
//   return loudnessDB;
// };
// Updated Segment Loudness
const calculateSegmentLoudness = function (segmentData, sampleRate) {
  // Calculate the average loudness of the segment data
  let sumSquared = 0;
  let numSamples = segmentData[0].length; // Assuming all channels have the same number of samples
  for (let i = 0; i < numSamples; i++) {
    let sumChannelsSquared = 0;
    for (let channel = 0; channel < segmentData.length; channel++) {
      sumChannelsSquared += segmentData[channel][i] * segmentData[channel][i];
    }
    sumSquared += sumChannelsSquared / segmentData.length;
  }
  const rms = Math.sqrt(sumSquared / numSamples);
  const loudnessRMS = 20 * Math.log10(rms);
  const intervalDuration = numSamples / sampleRate;
  return { loudnessRMS, intervalDuration };
};
/**
 *
 * @param {AudioBuffer} testBuffer2 is a placeholder for the audio buffer you pass through the calc LUFS
 * @param {Number} segmentDuration probably 1, that's generally a good balance between accuracy and computational efficency.
 */
const extractLoudnessData = function (testBuffer2, segmentDuration) {
  // variable initalization
  // console.log(`extractLoudnessData input`, testBuffer2, segmentDuration);
  const momentary = [];
  const intervals = [];
  const numChannels = testBuffer2.buffer.numberOfChannels;
  const sampleRate = testBuffer2.buffer.sampleRate;
  const numSamples = testBuffer2.buffer.length;

  // calcs
  const samplesPerSegment = sampleRate * segmentDuration;
  const numSegments = Math.ceil(numSamples / samplesPerSegment);

  for (let i = 0; i < numSegments; i++) {
    const startSample = i * samplesPerSegment;
    const endSample = Math.min((i + 1) * samplesPerSegment, numSamples);

    const segmentData = [];
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = testBuffer2.buffer.getChannelData(channel);
      segmentData.push(channelData.slice(startSample, endSample));
    }
    // console.log(segmentData);
    const { loudnessRMS, intervalDuration } = calculateSegmentLoudness(
      segmentData,
      sampleRate
    );
    if (loudnessRMS > -70) {
      momentary.push(loudnessRMS);
      intervals.push(intervalDuration);
    }
  }
  // This is where calculate momentary average would theoretically happen.

  // console.log(`extractLoudnessData output`, momentary, intervals);
  return { momentary, intervals };
};

const calcIntLUFS = function (momentary, intervals) {
  // Calculate integrated loudness
  // console.log(`calcIntLUFS Input`, momentary, intervals);
  let integratedLoudness = 0;
  // console.log(`momentary.length`, momentary.length);
  for (let i = 0; i < momentary.length; i++) {
    integratedLoudness += momentary[i] * intervals[i];

    console.log(`arrays`, momentary[i], intervals[i]);
  }
  console.log(`calcIntLUFS step 1`, integratedLoudness);
  // Normalize by total duration
  const totalDuration = intervals.reduce((acc, val) => acc + val, 0);
  // console.log(`calcIntLUFS Step 2 `, totalDuration);
  integratedLoudness /= totalDuration;
  // console.log(`calcIntLUFS Step 3`, integratedLoudness);
  integratedLoudness = Math.round(integratedLoudness * 100) / 100;
  // console.log(`calcIntLUFS Step 4`, integratedLoudness);
  return integratedLoudness;
};

/**
 * function to make the appropriate K weighted Filters to calculate the LUFS numbers
 */
const makeKWeight = function () {
  const LUFSBuffer = fileBuffer.buffer;
  const sampleRate = LUFSBuffer.sampleRate;
  const length = LUFSBuffer.length;
  const numChannels = LUFSBuffer.numberOfChannels;

  // Creating offline audio context to apply a K weighted filter to the audio buffer.
  const offlineContext = new OfflineAudioContext(
    numChannels,
    length,
    sampleRate
  );
  const filterBuffer = offlineContext.createBufferSource();
  filterBuffer.buffer = LUFSBuffer;

  // Create a high-pass filter
  const highPassFilter = offlineContext.createBiquadFilter();
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 80; // Cutoff frequency at 80 Hz
  highPassFilter.Q.value = 0.707; // Quality factor

  // Create a high-shelf filter
  const highShelfFilter = offlineContext.createBiquadFilter();
  highShelfFilter.type = "highshelf";
  highShelfFilter.frequency.value = 2000; // Frequency above which to boost/cut
  highShelfFilter.gain.value = 1.585; // + 4 dB boost shelving above 2kHz

  // Connecting the Nodes
  // filterBuffer.connect(highPassFilter);
  // highPassFilter.connect(highShelfFilter);
  // highShelfFilter.connect(offlineContext.destination);

  // Node.v2
  filterBuffer.connect(highShelfFilter);
  highShelfFilter.connect(highPassFilter);
  highPassFilter.connect(offlineContext.destination);

  // Rendering
  filterBuffer.start(0);

  offlineContext.startRendering().then((renderedBuffer) => {
    console.log("rendering completed succesfully.");
    destinationBuffer = audioAlpha.createBufferSource();
    destinationBuffer.buffer = renderedBuffer;
  });
};
// Event Listener for RMS and LUFS
document.getElementById("Calculate RMS").addEventListener("click", function () {
  document.getElementById("RMS Result").innerText = `${calcRMS(
    fileBuffer
  )} DBFS`;
});
document.getElementById("LUFS Timing").addEventListener("click", function () {
  makeKWeight();
});
document
  .getElementById("Calculate LUFS")
  .addEventListener("click", function () {
    // makeKWeight();
    const { momentary, intervals } = extractLoudnessData(
      destinationBuffer,
      0.4
    );
    document.getElementById("LUFS Result").innerText = `${calcIntLUFS(
      momentary,
      intervals
    )} LUFS`;
  });
