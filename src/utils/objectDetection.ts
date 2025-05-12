import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';

// Initialize TensorFlow.js
export const initTensorFlow = async () => {
  try {
    // Ensure TensorFlow.js is properly initialized
    await tf.ready();
    
    // Load COCO-SSD model with explicit configuration
    const model = await cocossd.load({
      base: 'lite_mobilenet_v2', // Use a lighter model for better performance
    });
    
    return model;
  } catch (error) {
    console.error('Error initializing TensorFlow.js:', error);
    throw new Error('Failed to initialize object detection model');
  }
};

// Perform object detection on video frame
export const detectObjects = async (
  model: cocossd.ObjectDetection,
  video: HTMLVideoElement
) => {
  try {
    const predictions = await model.detect(video);
    return predictions;
  } catch (error) {
    console.error('Error detecting objects:', error);
    return [];
  }
};