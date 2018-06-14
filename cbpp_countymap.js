/*globals d3, topojson, Typekit, CBPP*/
/*Reusable map code*/

module.exports = function($, d3) {
	"use strict";
	var CBPP_Countymap = {};
	if (typeof(d3)==="undefined") {
		d3 = require("d3");
	}
	if (typeof($)==="undefined") {
		$ = require("jquery");
	}
	var topojson = require("./topojson.v2.min.js");
	CBPP_Countymap.geo = require("./us-10m.v1.json");
	CBPP_Countymap.pathCache = {};
	require("./cbpp_countymap.css");
	var us = CBPP_Countymap.geo;
	CBPP_Countymap.geoJSON = {
		counties: topojson.feature(us, us.objects.counties).features,
		states: topojson.feature(us, us.objects.states).features,
		nation: topojson.feature(us, us.objects.nation).features
	};
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
			if (typeof(selector)==="undefined") {
				selector = options.legendSelector;
			}
			if (typeof(options.colorBins)!=="undefined") {
				if (options.binGradientLegend===true) {
					m.drawGradientBinsLegend(selector);
				} else {
					m.drawLegendBins(selector);
				}
			} else {
				m.drawGradientLegend(selector);
			}
		};

		m.drawGradientBinsLegend = function(selector) {
			$(selector).empty();
			$(selector).append("<div class=\"cbpp-countymap-legend-wrap\"><div class=\"legend-gradient-boxes\"></div></div>");
			var boxData = [].concat(options.colorBins);
			/*if (options.showNoDataBin!==true) {
				boxData = boxData.concat([{label:"No Data",color:options.noDataColor}]);
			}*/

			d3.select(selector + " .legend-gradient-boxes").selectAll(".box")
				.data(boxData)
				.enter()
				.append("div")
				.attr("class","box")
				.style("width",100/boxData.length+"%");
			d3.selectAll(selector + " .legend-gradient-boxes .box").each(function(d, i) {
				if (i===0) {
					var leftlabel = $(document.createElement("div")).attr("class","firstlabel label");
					var leftInner = $(document.createElement("div")).attr("class","inner");
					if (typeof(boxData[0].label)==="undefined") {
						leftInner.html(boxData[0].min);
					}
					leftlabel.append(leftInner);
					leftlabel.append($(document.createElement("div")).attr("class","divider"));
					$(this).append(leftlabel);
				}
				var label = $(document.createElement("div")).attr("class","label");
				var inner = $(document.createElement("div")).attr("class","inner");
				if (typeof(d.label)!=="undefined") {
					inner.html(d.label);
				} else {
					inner.html(d.max);
				}
				label.append(inner);
				label.append($(document.createElement("div")).attr("class","divider"));
				var box_actual = $(document.createElement("div")).attr("class","box_actual");
				box_actual.css("background-color",d.color);
			//	box_actual.css("border-right", options.legendBorderWidth + "px solid " + options.legendBorderColor);
				$(this).append(box_actual);
				$(this).append(label);
			});

			return;

		};

		m.drawGradientLegend = function(selector) {
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

		};

		m.drawLegendBins = function(selector) {
			$(selector).empty();
			$(selector).append("<div class=\"cbpp-countymap-legend-wrap\"><div class=\"legend-boxes\"></div></div>");
			var boxData = [].concat(options.colorBins);
			if (options.showNoDataBin!==true) {
				boxData = boxData.concat([{label:"No Data",color:options.noDataColor}]);
			}
			d3.select(selector + " .legend-boxes").selectAll(".box")
				.data(boxData)
				.enter()
				.append("div")
				.attr("class","box");
			d3.selectAll(selector + " .legend-boxes .box").each(function(d) {

				var label = $(document.createElement("div")).attr("class","label");
				if (typeof(d.label)!=="undefined") {
					label.html(d.label);
				} else {
					label.html(d.min + "-" + d.max);
				}
				var box_actual = $(document.createElement("div")).attr("class","box_actual");
				box_actual.css("background-color",d.color);
				box_actual.css("border", options.legendBorderWidth + "px solid " + options.legendBorderColor);
				$(this).append(box_actual);
				$(this).append(label);
			});
			return;
		};

		m.setOptions = function(userOptions) {
			var defaults = {
				minColor:"#ff0000",
				maxColor:"#000000",
				zeroColor:"#ffffff",
				noDataColor:"#cccccc",
				dataIndex:0,
				startingViewbox: [0, 0, 940, 600],
				zoomOutLimit: [0, 0, 940, 600],
				zoomable:true,
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
		m.setNewOptions = function(userOptions) {
			$.extend(true, options, userOptions);
		};
		m.clearOptions = function(key) {
			delete(options[key]);
		};
		$(window).resize(updateDimensions);
		if (options.zoomable) {
			$(selector).append("<div class=\"zoomButtons noselect\"><div class=\"zoomIn\"><div>+</div></div><div class=\"zoomOut\"><div>&ndash;</div></div>");
		}
		var svg = d3.select(selector).append("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", options.startingViewbox.join(" "));
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
		m.zoomToViewbox = function(newViewbox, duration, callback) {
			if (!m.zoomable) {return;}
			var oldViewbox = svg.attr("viewBox");
			svg.transition()
				.attr("viewBox", newViewbox)
				.duration(duration)
				.on("end", function() {
					updateStrokeWidths(oldViewbox, newViewbox);
					if (typeof(callback)==="function") {
						callback();
					}
				});
		};
		function updateStrokeWidths(oldvb, newvb) {
			oldvb = oldvb.split(" ");
			newvb = newvb.split(" ");
			var ratio = newvb[2]/oldvb[2];
			svg.selectAll("path")
				.each(function() {
					var stroke = d3.select(this).attr("stroke-width");
					if (stroke) {
						stroke*=ratio;
						d3.select(this).attr("stroke-width",stroke);
					}
				});
		}
		m.zoom = function(x,y,direction, amount) {
			if (!options.zoomable) {return;}
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
			//var yViewportDelta = viewport[3]*0.15*(m*amount)/120;
			var ar = width/height;
			var yViewportDelta = xViewportDelta/ar;
			var x1 = x - x*(width - xViewportDelta)/width;
			var y1 = y - y*(height - yViewportDelta)/height;

			viewport[0] += x1*m;
			if (viewport[0]<options.zoomOutLimit[0]) {
				viewport[0] = options.zoomOutLimit[0];
			}
			viewport[2] -= (xViewportDelta)*m;
			var xdiff;
			if (viewport[2] + viewport[0] > options.zoomOutLimit[2] + options.zoomOutLimit[0]) {
				xdiff = viewport[2] + viewport[0] - (options.zoomOutLimit[2] + options.zoomOutLimit[0]);
				viewport[0] =- xdiff;
				if (viewport[0] < options.zoomOutLimit[0]) {
					xdiff = viewport[2] - options.zoomOutLimit[2];
					viewport[0] = options.zoomOutLimit[0];
					viewport[2] -= xdiff;
				}
			}
			viewport[1] += y1*m;
			if (viewport[1]<options.zoomOutLimit[1]) {
				viewport[1] = options.zoomOutLimit[1];
			}
			viewport[3] = viewport[2]/ar;
			/*if (viewport[3] + viewport[1] > options.zoomOutLimit[3]) {
				viewport[3] = options.zoomOutLimit[3] + viewport[1];
			}*/
			if (viewport[3] < 1/ar) {
				viewport[3] = 1/ar;
			}
			if (viewport[2] < 1) {
				viewport[2] = 1;
			}
			viewport = viewport.join(" ");
			updateStrokeWidths(svg.attr("viewBox"), viewport);
			svg.attr("viewBox", viewport);
			if (typeof(options.postZoom)==="function") {
				options.postZoom();
			}
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
		var path = d3.geoPath();
		var start = Date.now();
		svg.append("g")
			.attr("class", "counties")
			.selectAll("path")
			.data(CBPP_Countymap.geoJSON.counties)
			.enter().append("path")
			.attr("stroke-width",2)
			.attr("stroke","#B9292F")
			.attr("stroke-opacity",0)
			.attr("d", function(d) {
				var uid = 1000000 + d.id*1;
				if (typeof(CBPP_Countymap.pathCache[uid])==="undefined") {
					CBPP_Countymap.pathCache[uid] = path(d);
				}
				return CBPP_Countymap.pathCache[uid];
			})
			.attr("pathID", function(d) {
				return d.id*1;
			});
		svg.append("g")
			.attr("class","states")
			.selectAll("path")
			.data(CBPP_Countymap.geoJSON.states)
			.enter().append("path")
			.attr("d", function(d) {
				var uid = 1000 + d.id*1;
				if (typeof(CBPP_Countymap.pathCache[uid])==="undefined") {
					CBPP_Countymap.pathCache[uid] = path(d);
				}
				return CBPP_Countymap.pathCache[uid];
			})
			.attr("class", function(d) {
				return "state_" + (d.id*1);
			})
			.attr("stroke","#fff")
			.attr("stroke-width",1)
			.attr("pathID", function(d) {
				return d.id*1;
			});
		svg.append("g")
			.attr("class","nation")
			.selectAll("path")
			.data(CBPP_Countymap.geoJSON.nation)
			.enter().append("path")
			.attr("stroke-width",1)
			.attr("d", function(d) {
				var uid = d.id*1;
				if (typeof(CBPP_Countymap.pathCache[uid])==="undefined") {
					CBPP_Countymap.pathCache[uid] = path(d);
				}
				return CBPP_Countymap.pathCache[uid];
			})
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
				popup.addClass("s");
				popup.removeClass("n");
				css.bottom = (height - pos.top + options.popupOffset.top) + "px";
			} else {
				popup.addClass("n");
				popup.removeClass("s");
				css.top = (pos.top + options.popupOffset.top) + "px";
			}
			popup.css(css);
			if (typeof(data[id])!=="undefined") {
				popup.show();
				popup.html(options.popupTemplate(data[id],options.dataIndex));
				if (typeof(options.postPopup)==="function") {
					options.postPopup(data[id], options.dataIndex);
				}
			}
		};

		$(window).on("mousemove", function(e) {
			if (hoverEventsBlocked) {
				return;
			}
			m.mouseX = e.pageX;
			m.mouseY = e.pageY;
			if (!$.contains(svg.node(),e.target)) {
				$(selector + " svg path.selected").removeClass("selected");
				popup.hide();
			}
		});

		$(selector + " svg").on("touchstart", function(e) {
			if (hoverEventsBlocked) {
				return;
			}
			m.unhighlightPaths();
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

		svg.selectAll(".counties path").on("mousemove", function(d) {
			if (hoverEventsBlocked) {
				return;
			}
			countyMouseOver(d);
		});
		var hoverEventsBlocked = false;
		var scrollEventsBlocked = false;
		m.blockHoverEvents = function() {
			hoverEventsBlocked = true;
			var hoverBlocker = $(document.createElement("div"))
				.addClass("hoverBlocker");
			$(selector).append(hoverBlocker);
		};
		m.allowHoverEvents = function() {
			hoverEventsBlocked = false;
			$(selector).find(".hoverBlocker").remove();
		};
		m.blockScrollEvents = function() {
			scrollEventsBlocked = true;
		};
		m.allowScrollEvents = function() {
			scrollEventsBlocked = false;
		};
		m.highlightPath = function(pathID) {
			var s = selector + " path[pathID='" + pathID + "']";
			var bbox = d3.select(s).node().getBBox();
			var obj = $(s);
			var pathOff = obj.offset();
			var mapOff = $(selector).offset();
			var width = bbox.width/svg.attr("viewBox").split(" ")[2]*$(svg.node()).width();
			var height = bbox.height/svg.attr("viewBox").split(" ")[3]*$(svg.node()).height();
			m.mouseX = pathOff.left + width/2;
			m.mouseY = pathOff.top  + height/2;
			countyMouseOver({id:pathID});
			m.unhighlightPaths();
			var parent = obj.parent();
			obj.detach();
			parent.append(obj);
			obj.addClass("highlight");
			d3.select(s).attr("stroke-opacity",1);
		};

		m.unhighlightPaths = function() {
			d3.select(selector + " svg path.highlight").attr("stroke-opacity",0);
			$(selector + " svg path.highlight").removeClass("highlight");
		};

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
				if (dPoint > options.dMax) {dPoint = options.dMax;}
				if (dPoint < options.dMin) {dPoint = options.dMin;}
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

			function calcBinnedColor(d, bins) {
				for (var i = 0, ii = bins.length; i<ii; i++) {
					if (d>=bins[i].min && d<bins[i].max) {
						return bins[i].color;
					}
				}
				return options.noDataColor;
			}

			function calcColor(scale, type, options) {
				if (isNaN(scale)) {
					return options.noDataColor;
				}
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
					if (typeof(options.colorBins)==="undefined") {
						var scale = calcScale(d, type, options);
						r[key] = calcColor(scale, type, options);
					} else {
						r[key] = calcBinnedColor(d, options.colorBins);
					}
				}
			}
			return r;
		};

		m.applyColors = function(colorArr, duration) {
			var fillf = function(d) {
				if (typeof(d)!=="undefined") {
					return colorArr[d.id*1];
				}
			};
			if (typeof(duration)==="undefined") {
				svg.selectAll("path")
					.attr("fill",fillf);
			} else {
				svg.selectAll("path")
					.transition()
					.duration(duration)
					.attr("fill",fillf);
			}
		};

		m.applyColors(m.calcColors(data, options));

		m.redrawColors = function(duration) {
			m.applyColors(m.calcColors(data, options),duration);
		};

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
			if (typeof(options.postDrag)==="function") {
				options.postDrag();
			}
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
			if (scrollEventsBlocked) {
				return true;
			}
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
		return m;
	};

    //function afterScriptsLoaded(callback) {
        CBPP_Countymap.Countymap = mapConstructor;
			//	callback();
    //}

	return CBPP_Countymap;

};
