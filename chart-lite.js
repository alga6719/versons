(function(){
  'use strict';

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  class Chart {
    constructor(ctx, config) {
      if (!ctx || !ctx.canvas) {
        throw new Error('Chart requires a 2D context');
      }
      this.ctx = ctx;
      this.type = (config && config.type) || 'line';
      this.data = config && config.data ? config.data : { labels: [], datasets: [] };
      this.options = config && config.options ? config.options : {};
      this._draw();
    }

    update() {
      this._draw();
    }

    destroy() {
      const canvas = this.ctx.canvas;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    _getYBounds(datasets, yScale) {
      let yMin = yScale && isFiniteNumber(yScale.min) ? yScale.min : Infinity;
      let yMax = yScale && isFiniteNumber(yScale.max) ? yScale.max : -Infinity;

      datasets.forEach(ds => {
        (ds.data || []).forEach(value => {
          if (!isFiniteNumber(value)) return;
          if (value < yMin) yMin = value;
          if (value > yMax) yMax = value;
        });
      });

      if (!isFiniteNumber(yMin) || yMin === Infinity) yMin = 0;
      if (!isFiniteNumber(yMax) || yMax === -Infinity) yMax = 0;

      if (yScale && isFiniteNumber(yScale.min)) yMin = yScale.min;
      if (yScale && isFiniteNumber(yScale.max)) yMax = yScale.max;

      if (yMin === yMax) {
        yMin -= 1;
        yMax += 1;
      }

      return { yMin, yMax };
    }

    _draw() {
      const ctx = this.ctx;
      const canvas = ctx.canvas;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (this.type !== 'line') {
        console.warn('chart-lite only supports line charts at the moment');
        return;
      }

      const labels = this.data.labels || [];
      const datasets = this.data.datasets || [];
      const yScale = this.options && this.options.scales && this.options.scales.y ? this.options.scales.y : {};
      const { yMin, yMax } = this._getYBounds(datasets, yScale);

      const paddingLeft = 45;
      const paddingRight = 10;
      const paddingTop = 15;
      const paddingBottom = 30;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      if (plotWidth <= 0 || plotHeight <= 0) return;

      ctx.save();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, paddingTop + plotHeight);
      ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
      ctx.stroke();

      if (yMin < 0 && yMax > 0) {
        const zeroY = paddingTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, zeroY);
        ctx.lineTo(paddingLeft + plotWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const value = yMin + ((yMax - yMin) * i) / ticks;
        const y = paddingTop + plotHeight - (plotHeight * i) / ticks;
        ctx.fillText(value.toFixed(0), paddingLeft - 6, y);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelCount = labels.length;
      const step = labelCount > 1 ? plotWidth / (labelCount - 1) : 0;

      labels.forEach((label, idx) => {
        const x = paddingLeft + step * idx;
        if (idx === 0 || idx === labelCount - 1 || idx % Math.ceil(labelCount / 6) === 0) {
          ctx.fillText(label, x, paddingTop + plotHeight + 6);
        }
      });

      datasets.forEach(ds => {
        const data = ds.data || [];
        if (!data.length) return;
        ctx.beginPath();
        ctx.strokeStyle = ds.borderColor || '#2563eb';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        data.forEach((value, idx) => {
          if (!isFiniteNumber(value)) return;
          const x = paddingLeft + (labelCount > 1 ? (plotWidth * idx) / (labelCount - 1) : 0);
          const y = paddingTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });

      ctx.restore();
    }
  }

  window.Chart = Chart;
})();
