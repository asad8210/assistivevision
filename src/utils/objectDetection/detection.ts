import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';

interface DetectionOptions {
  runGarbageCollection?: boolean;
  isProcessing?: boolean;
  detectionThreshold?: number;
  inputSize?: number;
}

export const detectObjects = async (
  model: cocossd.ObjectDetection,
  video: HTMLVideoElement,
  options: DetectionOptions = {}
): Promise<cocossd.DetectedObject[]> => {
  const {
    runGarbageCollection = true,
    isProcessing = false,
    detectionThreshold = 0.5,
    inputSize = 640,
  } = options;

  if (isProcessing) {
    console.log('Detection is already in progress...');
    return [];
  }

  try {
    options.isProcessing = true;

    const processedVideo = await preprocessVideo(video, inputSize);

    // Perform the detection without wrapping in tf.tidy()
    const predictions = await model.detect(processedVideo);

    // Filter detections based on the confidence threshold
    const filteredPredictions = predictions.filter(
      (detection) => detection.score >= detectionThreshold
    );

    return filteredPredictions;
  } catch (error) {
    console.error('Error during object detection:', error);
    return [];
  } finally {
    options.isProcessing = false;

    if (runGarbageCollection) {
      tf.disposeVariables();
    }
  }
};

/**
 * Preprocesses the video frame for consistent input size and normalization.
 */
const preprocessVideo = async (video: HTMLVideoElement, inputSize: number): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get canvas context.');

  canvas.width = inputSize;
  canvas.height = inputSize;

  ctx.drawImage(video, 0, 0, inputSize, inputSize);

  return canvas;
};
