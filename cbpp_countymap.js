/*Reusable map code*/
/*globals d3, topojson, Typekit, CBPP*/

modules.export = function(d3) {
	"use strict";
	CBPP_Countymap = {};
	if (typeof(d3)==="undefined") {
		d3 = require("d3");
	}
	var topojson = require("./topojson.v2.min.js");
	CBPP_Countymap.geo = require("./us-10m.v1.json");
	require("./cbpp_countymap.css");

	CBPP_Countymap.utilities = {
		formats: {
			/*from http://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery*/
			commaSeparateNumber: function (val) {
				while (/(\d+)(\d{3})/.test(val.toString())) {
					val = val.toString().replace(/(\d+)(\d{3})/, '$1' + ',' + '$2');
				}
				return val;
			},
			dollarFormat : function (n, ops) {
				var usePlus = false, roundTo = 0;
				if (typeof (ops) !== "undefined") {
					if (typeof (ops.usePlus) !== "undefined") {
						usePlus = ops.usePlus;
					}
					if (typeof (ops.roundTo) !== "undefined") {
						roundTo = ops.roundTo;
					}
				}
				var rounding = Math.pow(10, roundTo);
				return (n < 0 ? "-" : (usePlus ? "+" : "")) + "$" + this.utilities.commaSeparateNumber(Math.abs(Math.round(n * rounding) / rounding));
			},

			percentFormat : function (n, ops) {
				var usePlus = false, roundTo = 0;
				if (typeof (ops) !== "undefined") {
					if (typeof (ops.usePlus) !== "undefined") {
						usePlus = ops.usePlus;
					}
					if (typeof (ops.roundTo) !== "undefined") {
						roundTo = ops.roundTo;
					}
				}
				var rounding = Math.pow(10, roundTo);
				return (n < 0 ? "-" : (usePlus ? "+" : "")) + (Math.round(Math.abs(Math.round(n * 10000) / 100) * rounding) / rounding) + "%";
			}
		}
	};

	function getMinMax(data, index) {
		var min, max;
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				if (typeof(min)==="undefined") {
					min = data[key][index];
				}
				if (typeof(max)==="undefined") {
					max = data[key][index];
				}
				min = Math.min(data[key][index], min);
				max = Math.max(data[key][index], max);
			}
		}
		return {
			min: min,
			max: max
		};
	}

	var mapConstructor = function(selector, data, userOptions) {
		var m = {};
		$(selector).empty();
		$(selector).addClass("cbpp_countymap");
		var popup = $("<div class=\"popup\"></div>");
		$(selector).append(popup);
		$(selector).append("<div class=\"zoomButtons noselect\"><div class=\"zoomIn\"><div>+</div></div><div class=\"zoomOut\"><div>&ndash;</div></div>");
		var width, height, legendWidth, legendHeight, legend_svg;
		var updateDimensions = function() {
			width = $(selector).width();
			height = $(selector).height();
			legendWidth = $(options.legendSelector + " .legend-gradient").width();
			legendHeight = $(options.legendSelector  + " .legend-gradient").height();
			m.offset = $(selector).offset();
			/*if (typeof(legend_svg)!=="undefined") {
			legend_svg.attr("width", legendWidth)
				.attr("height",legendHeight);
			}*/
		};
		m.drawLegend = function(selector) {
			$(selector).empty();
			$(selector).append("<div class=\"cbpp-countymap-legend-wrap\"><div class=\"legend-gradient\"></div></div>");
			$(selector + " .legend-gradient").css("border",options.legendBorderWidth + "px solid " + options.legendBorderColor);
			legendWidth = $(selector + " .legend-gradient").width();
			legendHeight = $(selector + " .legend-gradient").height();
			legend_svg = d3.select(selector + " .legend-gradient").append("svg")
				.attr("viewBox","0 0 1000 1")
				.attr("width", "100%")
				.attr("height", "100%");
            $(selector + " .legend-gradient svg").attr("style","width: 100% !important");
			var gradient = legend_svg.append("linearGradient")
				.attr("id", "legendGradient");
			gradient.append("stop")
				.attr("offset","0%")
				.attr("stop-color",options.minColor);
			gradient.append("stop")
				.attr("offset","100%")
				.attr("stop-color",options.maxColor);
			legend_svg.append("rect")
				.attr("x",0)
				.attr("y",-500)
				.attr("width",1000)
				.attr("height",1000)
				.attr("fill","url(#legendGradient)")
                .attr("style","width:100% !important");
			$(selector + " .cbpp-countymap-legend-wrap").append("<div class=\"label left\" style=\"left:0%\"></div>");
			$(selector + " .cbpp-countymap-legend-wrap").append("<div class=\"label right\" style=\"left:100%\"></div>");
			$(selector + " .label.left").append("<div class=\"innerLabel\">" + options.legendFormatter(options.dMin) + "</div>");
			$(selector + " .label.right").append("<div class=\"innerLabel\">" + options.legendFormatter(options.dMax) + "</div>");

		}

		m.setOptions = function(userOptions) {
			var defaults = {
				minColor:"#ff0000",
				maxColor:"#000000",
				zeroColor:"#ffffff",
				dataIndex:0,
				legendBorderWidth: 1,
				legendBorderColor: "#cccccc",
				legendSelector: selector + " .legendOverlay",
				min: "auto",
				max: "auto",
				legendFormatter: function(n) {return n;},
				popupTemplate: function(d, i) {
					return d[i];
				},
				popupOffset: {
					top:20
				}
			};
			var options = {};
			$.extend(true, options, defaults);
			$.extend(true, options, userOptions);
			if (options.min==="auto" || options.max==="auto") {
				var minMax = getMinMax(data, options.dataIndex);
				options.dMin = minMax.min;
				options.dMax = minMax.max;
			} else {
				options.dMin = options.min;
				options.dMax = options.max;
			}
			return options;
		};

		var options = m.setOptions(userOptions);

		$(window).resize(updateDimensions);
		var svg = d3.select(selector).append("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox","0 0 940 600");
		$(selector).append(svg);
		$(selector).append("<div class=\"legendOverlay\"></div>");
		var addHoverStyles = function() {
			var existingSheet = document.getElementById("cbpp_countymap_hoverStyleSheet");
			if (existingSheet !== null) {
				existingSheet.parentNode.removeChild(existingSheet);
			}
			var hoverStyle = document.createElement('style');
			hoverStyle.id = "cbpp_countymap_hoverStyleSheet";
			hoverStyle.type = "text/css";
			document.head.appendChild(hoverStyle);
			var styleSheet = hoverStyle.sheet;
			styleSheet.insertRule(selector + " svg .counties path:hover, " + selector + " svg .counties path.selected {fill:" + options.hoverColor + "}",0);
		};
		addHoverStyles();
		var us = CBPP_Countymap.geo;
		m.zoom = function(x,y,direction, amount) {
			var m = 1;
			if (direction==="in") {m=1;}
			else if (direction==="out") {m=-1;}
			else {return;}
			var viewport = svg.attr("viewBox").split(" ");
			for (var i = 0, ii = viewport.length; i<ii; i++) {
				viewport[i]*=1;
			}
			if (x==="center") {
				x = width/2;
			}
			if (y === "center") {
				y = height/2;
			}

			var xViewportDelta = viewport[2]*0.15*(m*amount)/120;
			var yViewportDelta = viewport[3]*0.15*(m*amount)/120;

			var x1 = x - x*(width - xViewportDelta)/width;
			var y1 = y - y*(height - yViewportDelta)/height;

			viewport[0] += x1*m;
			if (viewport[0]<0) {
				viewport[0] = 0;
			}
			viewport[2] -= (xViewportDelta)*m;
			if (viewport[2] + viewport[0] > 940) {
				viewport[2] = 940 - viewport[0];
			}
			viewport[1] += y1*m;
			if (viewport[1]<0) {
				viewport[1] = 0;
			}
			viewport[3] -= (yViewportDelta)*m;
			if (viewport[3] + viewport[1] > 611) {
				viewport[3] = 611 - viewport[1];
			}
			viewport = viewport.join(" ");
			svg.attr("viewBox", viewport);
		};
		m.zoomIn = function(x, y, amount) {
			m.zoom(x,y,"in", amount);
		};
		m.zoomOut = function(x, y, amount) {
			m.zoom(x,y,"out", amount);
		};
		$(selector + " .zoomIn").click(function(e) {
			e.preventDefault();
			m.zoom("center","center","in", 400);
		});
		$(selector + " .zoomOut").click(function(e) {
			e.preventDefault();
			m.zoom("center","center","out", -800);
		});
		m.drag = function(x,y) {
			var viewport = svg.attr("viewBox").split(" ");
			var dX = x - m.dragBase[0];
			var dY = y - m.dragBase[1];
			viewport[0] = viewport[0]*1 - dX/width*viewport[2];
			viewport[1] = viewport[1]*1 - dY/height*viewport[3];
			m.dragBase = [x,y];
			viewport = viewport.join(" ");
			svg.attr("viewBox", viewport);
		};
		svg.append("g")
			.attr("class", "counties")
			.selectAll("path")
			.data(topojson.feature(us, us.objects.counties).features)
			.enter().append("path")
			.attr("d", d3.geoPath())
			.attr("pathID", function(d) {
				return d.id*1;
			});

		svg.append("g")
			.attr("class","states")
			.selectAll("path")
			.data(topojson.feature(us, us.objects.states).features)
			.enter().append("path")
			.attr("d", d3.geoPath())
			.attr("class", function(d) {
				return "state_" + (d.id*1);
			})
			.attr("pathID", function(d) {
				return d.id*1;
			});

		svg.append("g")
			.attr("class","nation")
			.selectAll("path")
			.data(topojson.feature(us, us.objects.nation).features)
			.enter().append("path")
			.attr("d", d3.geoPath())
			.attr("pathID", function(d) {
				return d.id*1;
			});

		var countyMouseOver = function(d) {
			var id = d.id*1;
			var mapOffset = $(svg.node()).offset();
			var css = {top:"auto",bottom:"auto",right:"auto",left:"auto"};
			var pos = {
				top: Math.round(m.mouseY - mapOffset.top),
				left: Math.round(m.mouseX - mapOffset.left),
				right:"",
				bottom:""
			};
			//var width = $(selector).width();
			//var height = $(selector).height();
			css.left = pos.left - pos.left/width * popup.width();
			/*if (pos.left > width/2) {
				css.right = (width - pos.left + options.popupOffset.left) + "px";
			} else {
				css.left = (pos.left + options.popupOffset.left) + "px";
			}*/
			if (pos.top > height/2) {
				css.bottom = (height - pos.top + options.popupOffset.top) + "px";
			} else {
				css.top = (pos.top + options.popupOffset.top) + "px";
			}
			popup.css(css);
			if (typeof(data[id])!=="undefined") {
				popup.show();
				popup.html(options.popupTemplate(data[id],options.dataIndex));
			}
		};

		$(window).on("mousemove", function(e) {
			m.mouseX = e.pageX;
			m.mouseY = e.pageY;
			if (!$.contains(svg.node(),e.target)) {
				$(selector + " svg path.selected").removeClass("selected");
				popup.hide();
			}
		});

		$(selector + " svg").on("touchstart", function(e) {
			$(selector + " svg path.selected").removeClass("selected");
			$(e.target).addClass("selected");
			m.mouseX = e.originalEvent.touches[0].pageX;
			m.mouseY = e.originalEvent.touches[0].pageY;
			if (!$.contains(svg.node(),e.target)) {
				$(selector + " svg path.selected").removeClass("selected");
				popup.hide();
			}
			countyMouseOver({id:d3.select(e.target).attr("pathID")});
		});

		svg.selectAll(".counties path").on("mousemove", countyMouseOver);


		/*color stuff*/

		//Converts HTML hex color to RGB array
		m.hexToRGB = function (hexString) {
			if (typeof(hexString)==="undefined") {
				return [255,255,255];
			}
			function fix(h) {
				var r = "#";
				for (var i = 1; i<=3; i++) {
					r += h.charAt(i) + h.charAt(i);
				}
				return r;
			}
			if (hexString.length === 4) {
				hexString = fix(hexString);
			}
			var r = parseInt(hexString.substr(1, 2), 16),
				g = parseInt(hexString.substr(3, 2), 16),
				b = parseInt(hexString.substr(5, 2), 16);
			return [r, g, b];
		};

		//And back the other way
		m.RGBToHex = function (rgbArray) {
			function pad(num, size) {
				var s = "0" + num;
				return s.substr(s.length - size);
			}
			return "#" + pad(rgbArray[0].toString(16), 2) + pad(rgbArray[1].toString(16), 2) + pad(rgbArray[2].toString(16), 2);
		};

		m.calcColors = function(data, options) {

			function calcScale(dPoint, type, options) {
				if (type === "twoColor") {
					return (dPoint - options.dMin)/(options.dMax - options.dMin);
				}
				if (type === "threeColor") {
					if (dPoint > 0) {
						return dPoint/options.dMax;
					} else {
						return 0-dPoint/options.dMin;
					}
				}
				throw "Error: calcScale failed";
			}

			function calcColor(scale, type, options) {
				var minC, maxC, thisC, i;
				if (type === "twoColor") {
					minC = m.hexToRGB(options.minColor);
					maxC = m.hexToRGB(options.maxColor);
				}
				if (type==="threeColor") {
					if (scale > 0) {
						minC = m.hexToRGB(options.zeroColor);
						maxC = m.hexToRGB(options.maxColor);
					} else {
						minC = m.hexToRGB(options.minColor);
						maxC = m.hexToRGB(options.zeroColor);
						scale = 0 - scale;
					}
				}
				thisC = [];
				for (i = 0; i<3;i++) {
					thisC[i] = Math.round(scale*(maxC[i] - minC[i])+minC[i]);
				}
				return m.RGBToHex(thisC);
			}

			var r = {};
			var type = "twoColor", index = options.dataIndex, d;
			if (options.dMin < 0 && options.dMax > 0) {
				type = "threeColor";
			}
			for (var key in data) {
				if (data.hasOwnProperty(key)) {
					d = data[key][index];
					var scale = calcScale(d, type, options);
					r[key] = calcColor(scale, type, options);
				}
			}
			return r;
		};

		m.applyColors = function(colorArr) {
			svg.selectAll("path")
				.attr("fill",function(d) {
					if (typeof(d)!=="undefined") {
						return colorArr[d.id*1];
					}
				});
		};

		m.applyColors(m.calcColors(data, options));

		/*end color stuff*/

		$(selector + " svg").bind('mousedown touchstart', function(e) {
			m.dragOn = true;
			var x = e.pageX - m.offset.left,
			y = e.pageY - m.offset.top;
			if (e.type==="touchstart") {
				if (e.originalEvent.touches.length > 1) {
					return;
				}
				x = e.originalEvent.touches[0].pageX - m.offset.left;
				y = e.originalEvent.touches[0].pageY - m.offset.top;
			}
			m.dragBase = [x,y];
			return false;
		});
		$(selector + " svg").bind("mouseup touchend", function(e) {
			m.dragOn = false;
			delete(m.dragBase);
		});
		$(selector + " svg").bind('mouseout', function(e) {
			if ($.contains($(selector)[0],e.relatedTarget)) {
				return;
			} else {
				m.dragOn = false;
				delete(m.dragBase);
			}
		});
		$(selector + " svg").bind('mousemove touchmove', function(e) {
			if (m.dragOn===true) {
				e = e.originalEvent;
				var x = e.pageX - m.offset.left,
				y = e.pageY - m.offset.top;
				if (e.type==="touchmove") {
					x = e.touches[0].pageX - m.offset.left;
					y = e.touches[0].pageY - m.offset.top;
				}
				m.drag(x,y);
			}
		});

		$(selector).bind('gesturestart', function(event) {
			event.stopPropagation();
			var x = event.originalEvent.pageX - m.offset.left,
				y = event.originalEvent.pageY - m.offset.top;
			if (event.originalEvent.scale < 1.0) {
				m.zoomIn(x, y);
			} else if (event.originalEvent.scale < 1.0) {
				m.zoomOut(x, y);
			}
		});
		$(window).bind('mousewheel DOMMouseScroll', function(event) {
			var x = event.originalEvent.pageX - m.offset.left,
				y = event.originalEvent.pageY - m.offset.top;
			if (x < 0 || x > width || y < 0 || y > height) {return;}
			var amount = event.originalEvent.wheelDelta;
			if (typeof(amount)==="undefined") {
				amount = 0 - event.originalEvent.detail;
			}
			if (amount > 0) {
				m.zoomIn(x, y, amount);
			}
			else {
				m.zoomOut(x, y, amount);
			}
			return false;
		});

		m.drawLegend(options.legendSelector);
		updateDimensions();

	};

    function afterScriptsLoaded(callback) {
        CBPP_Countymap.Countymap = mapConstructor;
		callback();
    }

	return CBPP_Countymap;

});
