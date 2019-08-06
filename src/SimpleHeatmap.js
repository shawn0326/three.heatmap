/**
 * @author shawn0326, jinggang, larrow 2018.4.1
 * SimpleHeatmap.js
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

    this._grad = {};
    var gradCanvas = this._createCanvas();
    gradCanvas.width = 1;
    gradCanvas.height = 256;
    this._gradCtx = gradCanvas.getContext('2d');
    this._gradCache = {};
    this._gradData = null;

    this._r = 0;
    this._radius = 0;
    this._blur = 0;
    this._circle = this._createCanvas();
    this._cirCtx = this._circle.getContext('2d');

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

    max: function(max) {
        if(this._max !== max) {
            this._max = max;
            this._dataDirty = true;
        }
        return this;
    },
    min: function(min) {
        if(this._min !== min) {
            this._min = min;
            this._dataDirty = true;
        }
        return this;
    },

    setCanvasSize: function(width, height) {
        if(this._canvasWidth !== width || this._canvasHeight !== height) {
            this._canvasWidth = this._canvas.width = width;
            this._canvasHeight = this._canvas.height = height;

            this._dataDirty = true;
        }

        return this;
    },

    setAreaSize: function(width, height) {
        if(this._areaWidth !== width || this._areaHeight !== height) {
            this._areaWidth = width;
            this._areaHeight = height;

            this._dataDirty = true;
        }

        return this;
    },

    alpha: function(a) {
        this._alpha = a;
        return this;
    },

    radius: function(r, blur) {

        blur = (blur !== undefined) ? blur : 15;

        if(r === this._radius && blur === this._blur) {
            return this;
        }

        this._radius = r;
        this._blur = blur;
        this._r = this._radius + this._blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle;
        var ctx = this._cirCtx;

        circle.width = circle.height = this._r * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = this._r * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-this._r, -this._r, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill(); 

        return this;
    },

    gradient: function(grad) {

        var code1 = this._getGradientCode(this._grad);
        var code2 = this._getGradientCode(grad);

        if(code1 === code2) {
            return this;
        }

        this._grad = Object.assign({}, grad); // clone

        if(this._gradCache[code2]) {
            this._gradData = this._gradCache[code2];
            return this;
        }

        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var gradient = this._gradCtx.createLinearGradient(0, 0, 0, 256);
        for (var i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        this._gradCtx.fillStyle = gradient;
        this._gradCtx.fillRect(0, 0, 1, 256);

        this._gradData = this._gradCtx.getImageData(0, 0, 1, 256).data;
        this._gradCache[code2] = this._gradData;

        return this;
    },

    draw: function() {
        if (this._r === 0) this.radius(this.defaultRadius);
        if (!this._gradData) this.gradient(this.defaultGradient);

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
        this._colorize(colored.data, this._gradData, this._alpha);
        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _transformData: function() {
        this._transformedData = [];

        var scaleXFactor = this._canvasWidth / this._areaWidth;
        var scaleYFactor = this._canvasHeight / this._areaHeight;

        var that = this;
        this._data.forEach(function(d) {
            var x = d[0];
            var y = d[1];

            x = x * scaleXFactor + that._canvasWidth / 2;
            y = y * scaleYFactor + that._canvasHeight / 2;
            var a = Math.min(Math.max((d[2] - that._min) / (that._max - that._min), 0.05), 1);

            that._transformedData.push([x, y, a]);
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

    _getGradientCode: function(grad) {
        var code = "grad:(";
        for(var i in grad) {
            code += i + ":" + grad[i] + ",";
        }
        code += ")";

        return code;
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