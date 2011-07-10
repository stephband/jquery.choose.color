// jQuery.colorChooser(color, callback)
// 
// Creates a color picker and appends it to the body. Returns
// a jQuery object
// 

(function( jQuery, undefined ){
	
	var τ = Math.PI * 2,
	    
	    options = {
	    	color: 'rgba(0,0,0,0)',
	    	segments: 180,
	    	innerRadius: 8,
	    	outerRadius: 96
	    },
	    
	    Vector = jQuery.Vector || Math.Vector;
	
	var changeProperty = {
	  alpha: function(canvas, data, handle, val, fn) {
	  	data.opacity = parseFloat(val);
	  	drawChooser(canvas, data);
	  	updateHandle(canvas, data, handle, fn);
	  },
	  lightness: function(canvas, data, handle, val, fn) {
	  	data.lightness = parseFloat(val);
	  	drawChooser(canvas, data);
	  	updateHandle(canvas, data, handle, fn);
	  }
	};
	
	// Helpers
	
	function limit(n, min, max) {
		return n > max ? max : n < min ? min : n ;
	}
	
	// 
	
	function setupCanvas(node, width, height, fn) {
		var canvas;
		
		// Set drawing resolution equal to px dimensions
		node.width = width;
		node.height = height;
		
		// Get canvas context. If it fails we don't support
		// canvas, so give up.
		
		try {
			canvas = node.getContext('2d');
		}
		catch(e) {
		  // canvas not supported
		  return this;
		}
		
		return fn(canvas, width, height);
	}
	
	
	function drawBg(canvas, width, height) {
		canvas.fillStyle = 'rgba(120,120,120,1)';
		
		canvas.beginPath();
		canvas.moveTo(0, 0);
		canvas.rect(0, 0, width, height);
		canvas.fill();
		canvas.closePath();
		
		canvas.globalCompositeOperation	=	'destination-out';
		canvas.fillStyle = 'black';
		canvas.translate(width/2, 132);
		
		canvas.beginPath();
		canvas.moveTo(0, 0);
		canvas.arc(0, 0, 100, 0, τ, false);
		canvas.moveTo(0, 0);
		canvas.closePath();
		canvas.fill();
	}
	
	
	function drawSpectrum(canvas, segments, innerRadius, outerRadius) {
		var n = segments,
				l = segments - 1,
				a = τ / segments,
				gradient;
		
		canvas.globalCompositeOperation	=	'source-over';
		canvas.rotate(τ/4);
		
		while (n--) {
		  canvas.fillStyle = 'hsl('+(360*n/segments)+', 100%, 50%)';
		  
		  canvas.beginPath();
		  canvas.moveTo(0,0);
		  canvas.arc(0,0,98, (n === l ? -a : -a/2), (n === 0 ? a/2 : a), false);
		  canvas.fill();
		  canvas.rotate(a);
		  canvas.closePath();
		}
		
		// Knock out gradient
		gradient = canvas.createRadialGradient(0,0,innerRadius,0,0,outerRadius);
		gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
		
		canvas.globalCompositeOperation	=	'destination-out';
		canvas.fillStyle = gradient;
		
		canvas.beginPath();
		canvas.moveTo(0,0);
		canvas.arc(0, 0, outerRadius, 0, τ, false);
		canvas.fill();
		canvas.closePath();
	}
	
	
	function drawChooser(canvas, data) {
		var segments = options.segments,
				innerRadius = options.innerRadius,
				outerRadius = options.outerRadius;
		
		canvas.save();
		canvas.clearRect(-200,-200,400,400);
		
		if (data.wheelData) {
		  canvas.putImageData(data.wheelData, 0, 0);
		}
		else {
		  drawSpectrum(canvas, segments, innerRadius, outerRadius);
		  
		  // Cache the image data so we can render the spectrum
		  // quickly next time.
		  data.wheelData = canvas.getImageData(0,0,200,200);
		}
		
		// Apply the background lightness
		canvas.globalCompositeOperation	=	'destination-over';
		canvas.fillStyle = 'hsl(0, 0%, '+(100 * data.lightness)+'%)';
		
		canvas.beginPath();
		canvas.moveTo(0, 0);
		canvas.arc(0, 0, outerRadius, 0, τ, false);
		canvas.fill();
		canvas.closePath();
		
		// Apply the opacity
		canvas.globalCompositeOperation	=	'destination-out';
		canvas.fillStyle = 'rgba(0,0,0,'+ (1-data.opacity) +')';
		
		canvas.beginPath();
		canvas.moveTo(0,0);
		canvas.rect(-100,-100,200,200);
		canvas.fill();
		canvas.closePath();
		
		canvas.restore();
		
		data.renderData = undefined;
	}
	
	
	function getPixelColor(canvas, data) {
		var pixelIndex = getPixelIndex(data.width, parseInt(data.left), parseInt(data.top)),
				pixelColor;
		
		if (!data.renderData) {
			data.renderData = canvas.getImageData(0, 0, 200, 200).data;
		}
		
		pixelColor = Array.prototype.slice.apply(data.renderData, [pixelIndex, pixelIndex+4]);
		
		// Opacity in canvas image data is reported in the range 0-255. Set
		// it to the range 0-1.
		pixelColor[3] /= 255;
		
		return jQuery.Color(pixelColor);
	};
	
	
	function getPixelIndex(width, left, top) {
		return (left + top * width) * 4;		
	};
	
	
	function updateColor(canvas, data, color) {
		var hue = τ * color.hue() / 360,
				sat = color.saturation(),
				lit = 2 * color.lightness() - 1,
				cart;
		
		// Distance from the centre is the product of saturation
		// and the difference between neutral lightness (0.5) and
		// the lightness of the current colour.
		
		lit = 1 - (lit < 0 ? -lit : lit);
		
		data.lightness = color.lightness();
		data.opacity = color.alpha();
		drawChooser(canvas, data);
		
		cart = Math.toCartesian([sat*lit*options.outerRadius, hue]);
		cart[0] += 100;
		cart[1] += 100;
		
		data.left = parseInt(cart[0]);
		data.top = parseInt(cart[1]);
	};
	
	
	function updateHandle(canvas, data, handle, fn) {
		var color = getPixelColor(canvas, data);
	
		handle.css({
			top: parseInt(data.top),
			left: parseInt(data.left),
			backgroundColor: color.toRgbaString()
		});
		
		fn(color);
	}
	
	function limitHandlePosition(data) {
		var polar = Math.toPolar([data.left - 100, data.top - 100]),
				cart;
			
		// Limit handle to within chooser circle
		if (polar[0] > options.outerRadius) {
		  polar[0] = 97;
		  cart = Math.toCartesian(polar);
		  data.left = parseInt(cart[0]) + 100;
		  data.top = parseInt(cart[1]) + 100;
		}
		// Lock handle to centre if its within the inner circle
		else if (polar[0] < options.innerRadius) {
		  polar[0] = 0;
		  data.left = 100;
		  data.top = 100;
		}
	}
	
	
	var sub = jQuery.sub();
	
	sub.fn.val = function(color) {
		if (color) {
			// Trigger an update, passing in a jQuery.Color object as the extra parameter.
			return this.trigger('update', color instanceof jQuery.Color ? color : jQuery.Color(color));
		}
		else {
			return this.data('value');
		}
	};
	
	// Stop the update event from being bound to the DOM
	jQuery.event.special.update = {
		setup: function() { return true; },
		teardown: function() { return true; }
	};
	
	// !The meat and potatoes
	
	jQuery.colorChooser = function(col, fn) {
		var color = (col instanceof jQuery.Color ? col : jQuery.Color(col)),
				str = color.toRgbaString(),
				chooser =      sub('<div/>',       {'class': 'color_chooser chooser', data: { value: color } }),
				title =        jQuery('<label/>',  {'class': 'chooser_title title'}),
				bg =           jQuery('<canvas/>', {'class': 'bg_layer layer'}),
				wheelWrap =    jQuery('<div/>',    {'class': 'wheel_wrap wrap'}),
				wheel =        jQuery('<canvas/>', {'class': 'wheel_layer layer'}),
				handle =       jQuery('<div/>',    {'class': 'handle'}),
				controlsWrap = jQuery('<form/>',   {'class': 'controls_wrap wrap'}),
				lightLabel =   jQuery('<label/>',  {'for': 'lightness_input'}),
				lightInput =   jQuery('<input/>',  {'id':  'lightness_input', type: 'range', min: 0, max: 1, step: 0.01, value: color.lightness(), data: { property: 'lightness' } }),
				opacityLabel = jQuery('<label/>',  {'for': 'opacity_input'}),
				opacityInput = jQuery('<input/>',  {'id':  'opacity_input', type: 'range', min: 0, max: 1, step: 0.02, value: color.alpha(), data: { property: 'alpha' } }),
				data = {
					color: color
				},
				canvas;
		
		// Stick the lot in the DOM
		jQuery('body').append(
			chooser
			.append(bg)
			.append(title.html('Colour'))
			.append(
				wheelWrap
				.append(wheel)
				.append(handle)
			)
			.append(
				controlsWrap
				.append(lightLabel.html('Lightness'))
				.append(lightInput)
				.append(opacityLabel.html('Opacity'))
				.append(opacityInput)
			)
		);
		
		// Draw the canvii
		setupCanvas(bg[0], bg.width(), bg.height(), drawBg);
		
		setupCanvas(wheel[0], wheel.width(), wheel.height(), function(c, width, height) {
			data.width = width;
			canvas = c;
			
			canvas.translate(100,100);
			
			updateColor(canvas, data, color);
			
			handle.css({
				left: data.left,
				top: data.top,
				backgroundColor: color.toRgbaString()
			});
		});
		
		
		chooser
		.bind('update', function(e, c) {
			if (c) { color = c instanceof jQuery.Color ? c : jQuery.Color(c); }
			
			updateColor(canvas, data, color);

			handle.css({
				left: data.left,
				top: data.top,
				backgroundColor: color.toRgbaString()
			});
			
			chooser.data('value', color);
		})
		.delegate('input', 'change', function(e) {
			var input = jQuery(this),
					property = input.data('property');
			
			changeProperty[property](canvas, data, handle, input.val(), fn);
		});
		
		wheelWrap
		.bind('mousedown move', function(e) {
			var elem = jQuery(this),
					offset = elem.offset();
					
			data.left = e.pageX - offset.left;
			data.top = e.pageY - offset.top;
			
			limitHandlePosition(data);
			updateHandle(canvas, data, handle, fn);
		})
		.bind('mousewheel.chooser DOMMouseScroll.chooser', function(e) {
			var elem = jQuery(this),
					delta = e.wheelDelta !== undefined ? e.wheelDelta / -120 : e.detail / 3,
					coord1 = new Vector({ x: data.left -100, y: data.top -100 }),
					coord2 = coord1.angle( coord1.angle() + delta/100 );
			
			data.left = coord2.x + 100;
			data.top = coord2.y + 100;
			
			updateHandle(canvas, data, handle, fn);
			
			e.preventDefault();
		});
		
		
		return chooser;
	};
	
})( jQuery );