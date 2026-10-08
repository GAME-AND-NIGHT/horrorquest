// webgl-video-processor.js

class WebGLVideoProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
        if (!this.gl) {
            console.error("WebGL not supported");
            return;
        }

        this.vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec4 u_crop; // x, y, width, height
            uniform float u_video_aspect;
            uniform float u_canvas_aspect;
            varying vec2 v_texCoord;
            void main() {
                vec2 scale;
                float y_offset = 0.0;
                if (u_video_aspect > u_canvas_aspect) {
                    scale = vec2(1.0, u_canvas_aspect / u_video_aspect);
                    y_offset = 1.0 - scale.y; // Align quad to top of canvas under topAsk
                } else {
                    scale = vec2(u_video_aspect / u_canvas_aspect, 1.0);
                }
                gl_Position = vec4(a_position.x * scale.x, a_position.y * scale.y + y_offset, 0.0, 1.0);
                v_texCoord = a_texCoord * u_crop.zw + u_crop.xy;
            }
        `;

        this.fragmentShaderSource = `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform float u_threshold;
            uniform float u_max_green;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                float r = color.r;
                float g = color.g;
                // Transparent alpha discard
                if (color.a < 0.1) {
                    discard;
                }

                // Black / near-black discard (for transparent WebM frames uploaded as black)
                if (r < 0.03 && g < 0.03 && b < 0.03) {
                    discard;
                }

                // Purple/blue chroma background:
                // Background has B >= 0.45, R in [0.28, 0.55], G in [0.25, 0.50]
                // B is significantly higher than R and G.
                // Clothing (dark jeans, flannel shirt, boots) has lower G/R or lower B.
                if (b > 0.45 && (b - r) > 0.09 && (b - g) > 0.11 && g > 0.25 && r > 0.28 && g < u_max_green) {
                    discard;
                }
                gl_FragColor = color;
            }
        `;

        this._init();
    }

    _compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    _createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    _init() {
        const vertexShader = this._compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this._compileShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        this.program = this._createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(this.program);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        // Flip the texture coordinates vertically
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), this.gl.STATIC_DRAW);

        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.cropLocation = this.gl.getUniformLocation(this.program, 'u_crop');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.thresholdLocation = this.gl.getUniformLocation(this.program, 'u_threshold');
        this.maxGreenLocation = this.gl.getUniformLocation(this.program, 'u_max_green');
        this.videoAspectLocation = this.gl.getUniformLocation(this.program, 'u_video_aspect');
        this.canvasAspectLocation = this.gl.getUniformLocation(this.program, 'u_canvas_aspect');

        this.gl.uniform1i(this.textureLocation, 0);
    }

    render(videoElement, crop, keyingOptions = { threshold: 0.1, max_green: 0.7 }) {
        if (!this.gl || videoElement.videoWidth === 0 || videoElement.readyState < 2) {
            return;
        }

        const gl = this.gl;

        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        const croppedVideoHeight = videoElement.videoHeight * crop.height;
        const croppedVideoWidth = videoElement.videoWidth * crop.width;
        const videoAspect = croppedVideoWidth / croppedVideoHeight;
        const canvasAspect = gl.canvas.width / gl.canvas.height;

        gl.uniform1f(this.videoAspectLocation, videoAspect);
        gl.uniform1f(this.canvasAspectLocation, canvasAspect);

        gl.uniform4f(this.cropLocation, crop.x, crop.y, crop.width, crop.height);
        gl.uniform1f(this.thresholdLocation, keyingOptions.threshold);
        gl.uniform1f(this.maxGreenLocation, keyingOptions.max_green);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
