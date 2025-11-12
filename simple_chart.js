(function () {
  if (typeof window === 'undefined') return;
  if (window.Chart) return;

  const clamp = (value, min, max) => {
    if (min == null && max == null) return value;
    if (min == null) return Math.min(value, max);
    if (max == null) return Math.max(value, min);
    return Math.max(min, Math.min(max, value));
  };

  class SimpleLineChart {
    constructor(ctx, config = {}) {
      this.ctx = ctx;
      this.canvas = ctx.canvas;
      this.config = config;
      this.data = config.data || { labels: [], datasets: [] };
      this.options = config.options || {};
      this._resizeObserver = null;
      this._attachResize();
      this._draw();
    }

    destroy() {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
    }

    update() {
      this._draw();
    }

    _attachResize() {
      if (typeof ResizeObserver === 'undefined') return;
      this._resizeObserver = new ResizeObserver(() => this._draw());
      this._resizeObserver.observe(this.canvas);
    }

    _drawAxes(ctx, width, height, padding, yRange) {
      ctx.save();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      const [minY, maxY] = yRange;
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const value = minY + ((maxY - minY) * i) / steps;
        const y = this._mapY(value, minY, maxY, height, padding);
        ctx.fillText(value.toFixed(0), 4, y + 3);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.strokeStyle = 'rgba(209,213,219,0.3)';
        ctx.stroke();
      }
      ctx.restore();
    }

    _draw() {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const width = canvas.width;
      const height = canvas.height;
      const padding = 32;
      ctx.clearRect(0, 0, width, height);
      if (!this.data || !this.data.datasets || this.data.datasets.length === 0) {
        return;
      }
      const datasetValues = this.data.datasets.flatMap(ds => ds.data || []);
      const labels = this.data.labels || [];
      const yConfig = (this.options.scales && this.options.scales.y) || {};
      let minY = yConfig.min != null ? yConfig.min : Math.min(...datasetValues, 0);
      let maxY = yConfig.max != null ? yConfig.max : Math.max(...datasetValues, 0);
      if (!isFinite(minY)) minY = 0;
      if (!isFinite(maxY)) maxY = 0;
      if (minY === maxY) {
        minY -= 1;
        maxY += 1;
      }
      this._drawAxes(ctx, width, height, padding, [minY, maxY]);
      const xStep = labels.length > 1 ? (width - padding * 2) / (labels.length - 1 || 1) : 0;
      this.data.datasets.forEach(ds => {
        const color = ds.borderColor || '#2563eb';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        (ds.data || []).forEach((value, index) => {
          const x = padding + xStep * index;
          const y = this._mapY(value, minY, maxY, height, padding);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    _mapY(value, minY, maxY, height, padding) {
      const y = padding + ((maxY - value) / (maxY - minY)) * (height - padding * 2);
      return clamp(y, padding, height - padding);
    }
  }

  window.Chart = SimpleLineChart;
})();
