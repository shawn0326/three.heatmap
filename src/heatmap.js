/**
 * @author shawn0326, jinggang, larrow 2018.4.1
 * Heatmap
 */
function SimpleHeatmap(canvas) {

    this._canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if(this._canvas === undefined) {
        this._canvas = document.createElement('canvas');
        this._canvas.width = 128;
        this._canvas.height = 128;
    }

    this._ctx = this._canvas.getContext('2d');

    this._max = 1;
    this._min = 0;

    this._dataDirty = true;

    this._data = [];
    this._transformedData = [];

    this._canvasWidth = this._areaWidth = this._canvas.width;
    this._canvasHeight = this._areaHeight = this._canvas.height;

    this._alpha = false;

}

SimpleHeatmap.prototype = Object.assign(Object.create({}), {

    constructor: SimpleHeatmap,

    defaultRadius: 25,

    defaultGradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },

    canvas: function() {
        return this._canvas;
    },

    data: function(data) {
        this._data = data;
        this._dataDirty = true;
        return this;
    },

    max: function(max) {
        this._max = max;
        this._dataDirty = true;
        return this;
    },
    min: function(min) {
        this._min = min;
        this._dataDirty = true;
        return this;
    },
    add: function(point) {
        this._data.push(point);
        this._dataDirty = true;
        return this;
    },

    clear: function() {
        this._data = [];
        this._dataDirty = true;
        return this;
    },

    radius: function(r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle = this._createCanvas(),
            ctx = circle.getContext('2d'),
            r2 = this._r = r + blur;

        circle.width = circle.height = r2 * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        return this;
    },

    setCanvasSize: function(width, height) {
        this._canvasWidth = this._canvas.width = width;
        this._canvasHeight = this._canvas.height = height;

        this._dataDirty = true;

        return this;
    },

    setAreaSize: function(width, height) {
        this._areaWidth = width;
        this._areaHeight = height;

        this._dataDirty = true;

        return this;
    },

    gradient: function(grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = this._createCanvas(),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    alpha: function(a) {
        this._alpha = a;
        return this;
    },

    draw: function(alpha) {
        if (!this._circle) this.radius(this.defaultRadius);
        if (!this._grad) this.gradient(this.defaultGradient);

        if(this._dataDirty) {
            this._transformData();
        }

        var ctx = this._ctx;

        ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

        // draw a grayscale heatmap by putting a blurred circle at each data point
        for (var i = 0, len = this._transformedData.length, p; i < len; i++) {
            p = this._transformedData[i];
            ctx.globalAlpha = p[2];
            ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
        }

        // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
        var colored = ctx.getImageData(0, 0, this._canvasWidth, this._canvasHeight);
        this._colorize(colored.data, this._grad, this._alpha);
        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _transformData: function() {
        this._transformedData = [];

        var scaleXFactor = this._canvasWidth / this._areaWidth;
        var scaleYFactor = this._canvasHeight / this._areaHeight;

        this._data.map(d => {
            var x = d[0];
            var y = d[1];

            x = x * scaleXFactor + this._canvasWidth / 2;
            y = y * scaleYFactor + this._canvasHeight / 2;
            a = Math.min(Math.max((d[2] - this._min) / (this._max - this._min), 0.05), 1);

            this._transformedData.push([x, y, a]);
        });
    },

    _colorize: function(pixels, gradient, alpha) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if(alpha && j === 0) { // optimize
                continue;
            }

            pixels[i] = gradient[j];
            pixels[i + 1] = gradient[j + 1];
            pixels[i + 2] = gradient[j + 2];
            if(!alpha) {
                pixels[i + 3] = 255;
            }
        }
    },

    _createCanvas: function() {
        if (typeof document !== 'undefined') {
            return document.createElement('canvas');
        } else {
            // create a new canvas instance in node.js
            // the canvas class needs to have a default constructor without any parameter
            return new this._canvas.constructor();
        }
    }
});