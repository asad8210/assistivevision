import { DetectedObject } from '@tensorflow-models/coco-ssd';
import { speak } from '../../utils/speech';

const COLORS = [
  '#FF3B30', // Red
  '#34C759', // Green
  '#007AFF', // Blue
  '#FF9500', // Orange
  '#5856D6', // Purple
];

let lastSpokenTime = 0;
const SPEECH_DELAY = 2000; // Minimum 2 seconds between speeches

export const drawDetections = (
  ctx: CanvasRenderingContext2D,
  predictions: DetectedObject[]
) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  predictions.forEach((prediction, index) => {
    const [x, y, width, height] = prediction.bbox;
    const color = COLORS[index % COLORS.length];
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw background for label
    const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
    ctx.font = '16px Arial';
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;
    ctx.fillStyle = color + '80'; // Add transparency
    ctx.fillRect(
      x,
      y > textHeight ? y - textHeight : y,
      textMetrics.width + 8,
      textHeight
    );

    // Draw label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      label,
      x + 4,
      y > textHeight ? y - 4 : y + 16
    );
  });

  // Announce detections with throttling
  const now = Date.now();
  if (now - lastSpokenTime >= SPEECH_DELAY && predictions.length > 0) {
    const objects = predictions
      .map(p => `${p.class} at ${Math.round(p.score * 100)}%`)
      .join(', ');
    speak(`Detected ${objects}`);
    lastSpokenTime = now;
  }
};