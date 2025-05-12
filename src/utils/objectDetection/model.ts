import * as tf from '@tensorflow/tfjs';
import { speak } from '../speech';




// Initialize model and class names
let model: tf.GraphModel | null = null;
const modelPath = 'yolov8n.onnx'; // Your model path
const classNames = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];


// Initialize the TensorFlow.js model
export const initTensorFlow = async () =>{
  try {
    // Load the ONNX model using TensorFlow.js (GraphModel)
    model = await tf.loadGraphModel(modelPath);
    console.log('YOLOv8 model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing YOLOv8 model:', error);
    return false;
  }
};

// Preprocess image data before feeding it into the model
const preprocess = (imageData: ImageData) => {
  const { data, width, height } = imageData;
  const inputArray = new Float32Array(3 * 640 * 640);

  // Resize and normalize image using bilinear interpolation
  const stride = width * 4;
  const targetStride = 640 * 3;
  for (let y = 0; y < 640; y++) {
    for (let x = 0; x < 640; x++) {
      const sourceX = Math.floor(x * width / 640);
      const sourceY = Math.floor(y * height / 640);
      const sourcePos = sourceY * stride + sourceX * 4;
      const targetPos = y * targetStride + x * 3;

      // Normalize to [0, 1] and convert BGR to RGB
      inputArray[targetPos] = data[sourcePos] / 255.0;     // R
      inputArray[targetPos + 1] = data[sourcePos + 1] / 255.0; // G
      inputArray[targetPos + 2] = data[sourcePos + 2] / 255.0; // B
    }
  }
  return inputArray;
};

// Detect objects using the model
// Detect objects using the model
export const detectObjects = async (imageData: ImageData) => {
  if (!model) {
    console.error('Model is not initialized');
    return [];
  }

  try {
    // Preprocess image data
    const input = preprocess(imageData);
    
    // Create a tensor for the model
    const tensor = tf.tensor4d(input, [1, 3, 640, 640]);

    // Run inference
    const results = await model.executeAsync({ images: tensor });

    // Check if results is an array and access the first element
    const outputTensor = Array.isArray(results) ? results[0] as tf.Tensor : results as tf.Tensor;
    const output = outputTensor.dataSync() as Float32Array;

    // Process the detections
    const detections = processDetections(output, imageData.width, imageData.height);

    // Provide feedback (audio) on detected objects
    if (detections.length > 0) {
      const detectionSummary = detections.map(d => `${d.class} with confidence ${Math.round(d.confidence * 100)}%`).join(', ');
      speak(`Detected: ${detectionSummary}`);
    } else {
      speak('No objects detected');
    }

    return detections;
  } catch (error) {
    console.error('Error during detection:', error);
    return [];
  }
};


// Process detections and filter based on confidence threshold
const processDetections = (output: Float32Array, originalWidth: number, originalHeight: number) => {
  const detections = [];
  const numBoxes = output.length / 85; // 80 classes + 4 box coordinates + 1 confidence
  const confidenceThreshold = 0.5;
  const nmsThreshold = 0.4; // Non-maximum suppression threshold

  const boxes: number[][] = [];
  const scores: number[] = [];
  const classes: number[] = [];

  for (let i = 0; i < numBoxes; i++) {
    const baseIndex = i * 85;
    const boxScores = output.slice(baseIndex + 5, baseIndex + 85);
    const classId = boxScores.indexOf(Math.max(...boxScores));
    const confidence = boxScores[classId];

    if (confidence > confidenceThreshold) {
      let [x, y, w, h] = [
        output[baseIndex],
        output[baseIndex + 1],
        output[baseIndex + 2],
        output[baseIndex + 3]
      ];

      // Convert coordinates from normalized to pixel values
      x = (x * originalWidth);
      y = (y * originalHeight);
      w = (w * originalWidth);
      h = (h * originalHeight);

      boxes.push([x, y, w, h]);
      scores.push(confidence);
      classes.push(classId);
    }
  }

  // Apply Non-Maximum Suppression (NMS)
  const selectedIndices = applyNMS(boxes, scores, nmsThreshold);
  for (const index of selectedIndices) {
    detections.push({
      bbox: boxes[index],
      class: classNames[classes[index]],
      confidence: scores[index]
    });
  }

  return detections;
};

// Apply Non-Maximum Suppression (NMS)
const applyNMS = (boxes: number[][], scores: number[], threshold: number) => {
  const selectedIndices: number[] = [];
  let sortedIndices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);

  while (sortedIndices.length > 0) {
    const current = sortedIndices.shift()!;
    selectedIndices.push(current);

    sortedIndices = sortedIndices.filter(index => {
      const iou = calculateIOU(boxes[current], boxes[index]);
      return iou < threshold;
    });
  }

  return selectedIndices;
};

// Calculate Intersection Over Union (IOU)
const calculateIOU = (boxA: number[], boxB: number[]) => {
  const [xA, yA, wA, hA] = boxA;
  const [xB, yB, wB, hB] = boxB;

  const x1 = Math.max(xA, xB);
  const y1 = Math.max(yA, yB);
  const x2 = Math.min(xA + wA, xB + wB);
  const y2 = Math.min(yA + hA, yB + hB);

  const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const boxAArea = wA * hA;
  const boxBArea = wB * hB;

  return interArea / (boxAArea + boxBArea - interArea);
};
