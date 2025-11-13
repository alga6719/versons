class MiniTrendChart {
  constructor(canvas, options = {}) {
    if (!canvas) throw new Error('Canvas element is required for MiniTrendChart');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.labels = [];
    this.series = [
      { label: 'Composite', color: 'rgb(30,99,255)', data: [] },
      { label: 'Trader Influence (scaled)', color: 'rgb(34,197,94)', data: [] }
    ];
    this.maxPoints = options.maxPoints || 80;
    this.valueRange = {
      min: options.min ?? -100,
      max: options.max ?? 100
    };
    this.padding = Object.assign({ top: 20, right: 10, bottom: 30, left: 40 }, options.padding);
    this.background = options.background || '#ffffff';
    this.axisColor = options.axisColor || '#dddddd';
    this.textColor = options.textColor || '#555555';
    this.font = options.font || '12px Arial';
  }

  addPoint(label, compositeValue, influenceValue) {
    this.labels.push(label);
    this.series[0].data.push(this.#sanitizeNumber(compositeValue));
    this.series[1].data.push(this.#sanitizeNumber(influenceValue));

    if (this.labels.length > this.maxPoints) {
      this.labels.shift();
      this.series.forEach(s => s.data.shift());
    }

    this.draw();
  }

  draw() {
    const { ctx, canvas, padding } = this;
    const width = canvas.width;
    const height = canvas.height;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(padding.left, padding.top);

    this.#drawGrid(ctx, plotWidth, plotHeight);

    this.series.forEach(series => {
      this.#drawSeries(ctx, series.data, plotWidth, plotHeight, series.color);
    });

    ctx.restore();
  }

  #drawGrid(ctx, plotWidth, plotHeight) {
    const { min, max } = this.valueRange;
    const step = 50;

    ctx.strokeStyle = this.axisColor;
    ctx.lineWidth = 1;
    ctx.font = this.font;
    ctx.fillStyle = this.textColor;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, plotHeight);
    ctx.lineTo(plotWidth, plotHeight);
    ctx.stroke();

    const range = max - min;
    const steps = Math.floor(range / step);
    for (let i = 0; i <= steps; i++) {
      const value = min + i * step;
      const y = this.#valueToY(value, plotHeight);
      ctx.strokeStyle = i === Math.floor(steps / 2) ? '#bbbbbb' : this.axisColor;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      ctx.fillStyle = this.textColor;
      ctx.fillText(value.toString(), -35, y + 4);
    }
  }

  #drawSeries(ctx, data, plotWidth, plotHeight, color) {
    if (!data.length) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const points = this.#dataToPoints(data, plotWidth, plotHeight);
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
    }

    ctx.stroke();
  }

  #dataToPoints(data, plotWidth, plotHeight) {
    const { labels } = this;
    const count = data.length;
    const maxIndex = Math.max(1, count - 1);
    return data.map((value, idx) => {
      const x = (plotWidth / maxIndex) * idx;
      const y = this.#valueToY(value, plotHeight);
      return { x, y };
    });
  }

  #valueToY(value, plotHeight) {
    const { min, max } = this.valueRange;
    const clamped = Math.max(min, Math.min(max, value));
    const normalized = (clamped - min) / (max - min || 1);
    return plotHeight - normalized * plotHeight;
  }

  #sanitizeNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return value;
  }
}

window.MiniTrendChart = MiniTrendChart;
