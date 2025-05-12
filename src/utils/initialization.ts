
import * as tf from '@tensorflow/tfjs';

export const initializeServices = async () => {
  try {
    // TensorFlow.js doesn't have a method like `setDebugMode`
    // Simply ensure TensorFlow is ready and use a backend (like WebGL)
    await tf.setBackend('webgl');
    await tf.ready();

    // Check WebGL support and capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    // Initialize speech synthesis
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }
    
    // Initialize speech recognition
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }
    
    return true;
  } catch (error) {
    console.error('Service initialization failed:', error);
    return false;
  }
};

