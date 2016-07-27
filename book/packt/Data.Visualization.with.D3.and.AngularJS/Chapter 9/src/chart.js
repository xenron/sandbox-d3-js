/* src/chart.js */
// Inheritance
// @src: typescript.org
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

// Chart Module 
angular.module('myChart', [])

// D3 Factory
.factory('d3', function() {

  /* We could declare locals or other D3.js
     specific configurations here. */

  return d3;
})

// D3 Loader service
.factory('SimpleD3Loader', ["d3", 
  function(d3) {
    return function(url, callback) {
      d3.text(url, 'text/plain', callback);
    };
}])

// Simple Http loader service
.factory('SimpleHttpLoader', ["$http",
  function($http) {
    return function(url) {
      return $http.get(url, { cache: true })
    }
}])

// Multi-File Http loader service
.factory('HttpLoader', ["$http", "$q",
  function($http, $q) {
    return function(url) {

      /* Create an array of urls */
      var urls = [].concat( url );

      /* Create the Promises */
      var promises = urls.map(function(url) {
        return $http.get(url, { cache: true });
      });

      /* Queue the promises */
      return $q.all(promises);
    };
}])

// Parser service
.factory('StringParser', function(){
  return function(str, line, word, rem) {
    line = line || "\n";
    word = word || /[-"]/gi;
    rem = rem || /["\[\]]/gi;
  
    return str.trim().split(line).map(function(l){
      return l.split(word).map(function(w){
        return w.trim().replace(rem,'');
      });
    });
  };
})

// D3 Classifier service
.factory('Classifier', function(){
  return function(data, key){
    return d3.nest()
      .key(key)
      .entries(data)
      .map(function(d){
        return {
          x: d.key,
          y: d.values.length
        };
      });
  };
})

.filter('gte_date', function(){
  return function(input, raw_date){
    var date = new Date(raw_date);
    return isNaN(date.getTime()) ? input : input.filter(function(d){
      return d.x >= date;
    });
  };
})

.filter('lte_date', function(){
  return function(input, raw_date){
    var date = new Date(raw_date);
    return isNaN(date.getTime()) ? input : input.filter(function(d){
      return d.x <= date;
    });
  };
})

/* ---- Directive Template ---- */

.factory('chartDirectiveTemplate', function($window){

  return function(Chart, link) {
    return {
      restrict: 'E',
      scope: {
        data: '=',
        date: '=',
        curDate: '=',
        cursor: '=',
        brush: '='
      },
      link: function(scope, element, attrs) {

        var chart = new Chart(element[0]);

        /* Listen on cursor change */
        chart.on('cursorchange', function(cursor) {

          if (scope.cursor && cursor){
            scope.$apply(function(){
              scope.cursor = cursor;
            });            
          }
        });

        /* Listen on focus change */
        chart.on('focuschange', function(focus) {
          
          if (scope.curDate && focus){
            scope.curDate = focus[0];
            // Apply called in cursorchange
            // scope.$apply();
          }
        });

        /* Listen on zoom change */
        chart.on('zoomchange', function(date) {

          if (scope.date && date) {
            scope.date = date;
            // Apply called in cursorchange
            // scope.$apply();
          }
        });

        /* Watch the window for resizing */
        angular.element($window).bind('resize', function(){

          chart.width(element[0].parentElement.offsetWidth);
          chart.redraw();
        });

        /* Watch the data on the scope */
        scope.$watch('[data, date]', function(){

          chart.width(element[0].parentElement.offsetWidth);
          
          if (scope.date) {
            /* Active date filter */
            chart.data(scope.data, scope.date[0], scope.date[1]);
          }
          else {
            /* No filter */
            chart.data(scope.data);
          }

          chart.redraw();
        }, true);

        /* Watch the focus on the scope */
        scope.$watch('[curDate]', function(){

          chart.drawCursor(scope.curDate, null, 25);
        }, true);

        if (link) {
          link(scope, element, attrs, chart);
        }
      }
    };
  };
})


/* ---- Base Chart ---- */

.factory('baseChart', function($window, $filter, d3){

  var BaseChart = (function() {

    function BaseChart(element) {

      /* Create a SVG root element */
      this.svg = d3.select(element).append('svg');
      this.vis = this.svg.append('g').attr('class', 'vis');

      /* Create containers */
      this.axisCont = this.vis.append('g').attr('class', 'axis');
      this.dataCont = this.vis.append('g').attr('class', 'data');
      this.focusCont = this.vis.append('g').attr('class', 'focus');
      this.cursorCont = this.axisCont.append('g').attr('class', 'cursor');

      /* Create axis nodes */
      this.xGridNode = this.axisCont.append('g').attr('class', 'x-grid grid');
      this.yGridNode = this.axisCont.append('g').attr('class', 'y-grid grid');
      this.xAxisNode = this.axisCont.append('g').attr('class', 'x-axis axis');
      this.yAxisNode = this.axisCont.append('g').attr('class', 'y-axis axis');
      
      /* Create cursor nodes */
      this.xCursorNode = this.cursorCont.append('line').attr('class', 'x-cursor');
      this.yCursorNode = this.cursorCont.append('line').attr('class', 'y-cursor');

      this.dataLineNode = this.dataCont.append('path').attr('class', 'data-line');
      this.dataAreaNode = this.dataCont.append('path').attr('class', 'data-area');
      this.dataFocusNode = this.focusCont.append('circle').attr('class', 'data-point-active');

      this._width = 800;
      this._height = 300;
      this._margin = {top: 50, bottom: 50, left: 50, right: 50};
      this.innerWidth = 0;
      this.innerHeight = 0;

      this._dispatch = d3.dispatch();
      this._data = [];
      this._xScale = null;
      this._yScale = null;
      this._xAxis = null;
      this._yAxis = null;
      this._xGrid = null;
      this._yGrid = null;

      this.ease = 'cubic';
      this.duration = 250;
      this.interpolate = 'cardinal';

      /* Init events */

      this.dispatch("cursorchange");
      this.dispatch("zoomchange");
      this.dispatch("focuschange");

      /* Key functions */
      
      var self = this;
      this.xKey = function(d) { return d.x; };
      this.yKey = function(d) { return d.y; };
      this.xScaleKey = function(d) { return self._xScale(d.x); };
      this.yScaleKey = function(d) { return self._yScale(d.y); };
    }

    BaseChart.prototype.dispatch = function(e){

      var dispatch = d3.dispatch(e);

      for (var property in dispatch) {

          if (dispatch.hasOwnProperty(property)) {

              this._dispatch[property] = dispatch[property];
          }
      }
    };

    /* Getter and Setters */

    BaseChart.prototype.width = function(width) {
      
      if (arguments.length === 0) {
        return this._width;
      }

      this._width = width;
    };

    BaseChart.prototype.height = function(height) {
      
      if (arguments.length === 0) {
        return this._height;
      }

      this._height = height;
    };

    BaseChart.prototype.margin = function(margin) {
      
      if (arguments.length === 0) {
        return this._margin;
      }

      this._margin = margin;
    };

    BaseChart.prototype.data = function(data, min, max) {
      
      if (arguments.length === 0) {
        return this._data;
      }
      
      if (arguments.length === 3 && !isNaN(min) && !isNaN(max)){
        this._data = data ? this.filter(data, min, max) : [];
      }
      else {
        this._data = data;
      }
    };

    BaseChart.prototype.on = function(type, listener){

      this._dispatch.on(type, listener);
    };

    /* Filter functions */

    BaseChart.prototype.filter = function(data, min, max) {
        var d = data.slice(0);
        d = $filter('gte_date')(d, min);
        d = $filter('lte_date')(d, max);
        return d;
    };

    /* Layout functions */

    BaseChart.prototype.base = function() {
      this.svg
        .attr('width', this._width)
        .attr('height', this._height);

      this.vis
        .attr('transform', 'translate(' + this._margin.left + ',' + this._margin.top + ')');
    };

    BaseChart.prototype.redraw = function(duration) {

      if (!this._data || !this._data.length){
        return;
      }

      duration = duration !== undefined ? duration : this.duration;

      this.innerWidth = this._width - this._margin.left - this._margin.right;
      this.innerHeight = this._height - this._margin.top - this._margin.bottom;

      /* Layout */
      this.base();
    };

    return BaseChart;
  })();

  return BaseChart;
})


/* ---- Line Chart ---- */

.factory('lineChart', function(baseChart, $window, $filter, d3){

  var LineChart = (function(_super) {
    __extends(LineChart, _super);

    function LineChart(element) {
      _super.call(this, element);

      /* Create Label Group */
      this.xLabelNode = this.focusCont.append('g').attr('class', 'x-label label');
      this.yLabelNode = this.focusCont.append('g').attr('class', 'y-label label');

      /* Create Label icon and text */
      var tag_path = 'M 51.166,23.963 62.359,17.5 c 1.43,-0.824 1.43,-2.175 0,-3 L 51.166,8.037 48.568,1.537 2,1.4693227 2,30.576466 48.568,30.463 z';
      this.xLabelNode.append('path')
        .style('display', 'none')
        .attr('d', tag_path)
        .attr('transform', 'translate(-30, -15) scale(0.7)');
      this.xLabelNode.append('text');
      this.yLabelNode.append('path')
        .style('display', 'none')
        .attr('d', tag_path)
        .attr('transform', 'translate(-30, -15) scale(0.7)');
      this.yLabelNode.append('text');

      /* Brush */
      this._brush = null;
    }

    /* Scale functions */

    LineChart.prototype.xScale = function() {


      var min = d3.min(this._data, this.xKey);
      var max = d3.max(this._data, this.xKey);

      return d3.time.scale()
        .domain([min, max])
        .range([0, this.innerWidth]);
    };

    LineChart.prototype.yScale = function() {

      var min = 0;
      var max = d3.max(this._data, this.yKey);

      return d3.scale.linear()
        .domain([min, max])
        .range([this.innerHeight, 0]);
    };

    /* Axis functions */

    LineChart.prototype.xAxis = function() {
      return d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%M'));
    };

    LineChart.prototype.yAxis = function() {
      return d3.svg.axis()
        .scale(this._yScale)
        .orient('left')
        .tickFormat(d3.format('f'));
    };

    /* Grid functions */

    LineChart.prototype.xGrid = function() {
      return d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%M'))
        .tickSize(-this.innerHeight, 0, 0)
        .tickFormat("");
    };

    LineChart.prototype.yGrid = function() {
      return d3.svg.axis()
        .scale(this._yScale)
        .orient('left')
        .tickSize(-this.innerWidth, 0, 0)
        .tickFormat("");
    };

    /* Layout functions */

    LineChart.prototype.axis = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      if (this._xAxis) {
        this.xAxisNode
          .attr('transform', 'translate(0,' + this.innerHeight + ')')
          .transition()
          .ease(this.ease)
          .duration(duration)
          .call(this._xAxis)
          .each("start", function(){
            d3.select(this)
             .selectAll('text')
             .attr('transform', 'rotate(-90) translate(-20,-12)');
          });
      }
       
      if (this._yAxis) {
        this.yAxisNode
          .transition()
          .ease(this.ease)
          .duration(duration)
          .call(this._yAxis);
      }
    };

    LineChart.prototype.grid = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      if (this._xGrid) {
        this.xGridNode
          .attr('transform', 'translate(0,' + this.innerHeight + ')')
          .transition()
          .ease(this.ease)
          .duration(duration)
          .call(this._xGrid);
      }

      if (this._yGrid) {
        this.yGridNode
          .transition()
          .ease(this.ease)
          .duration(duration)
          .call(this._yGrid);
      }
    };

    /* Interaction functions */

    LineChart.prototype.drawCursor = function(xValue, yValue, duration) {

      duration = duration !== undefined ? duration : this.duration;
      
      if (!yValue) {

        var bisectX = d3.bisector(this.xKey).left;
        var index = bisectX(this._data, xValue);
        d = this._data[index];
      
        if (!d) { return; }

        yValue = d.y;
      }

      this.dataFocusNode
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr("cx", this._xScale(xValue))
        .attr("cy", this._yScale(yValue))
        .attr("r", 3);

      this.xCursorNode
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('x1', this._xScale(xValue))
        .attr('y1', 0)
        .attr('x2', this._xScale(xValue))
        .attr('y2', this.innerHeight);
    
      this.yCursorNode
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('x1', 0)
        .attr('y1', this._yScale(yValue))
        .attr('x2', this.innerWidth)
        .attr('y2', this._yScale(yValue));

      this.drawLabel(xValue, yValue, duration);
    };

    LineChart.prototype.drawLabel = function(xValue, yValue, duration){

      duration = duration !== undefined ? duration : this.duration;

      var hMargin = -8;
      var vMargin = 3;

      var xLeft = this._xScale(xValue) + vMargin;
      var xTop = this.innerHeight + hMargin;

      this.xLabelNode
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('transform', 'translate('+xLeft+','+xTop+') rotate(-90)');
  
      this.xLabelNode
        .select('text')
        .text(d3.time.format('%H:%M')(new Date(+xValue)));

      this.xLabelNode
        .select('path')
        .style('display', 'block');

      var yLeft = -hMargin;
      var yTop = this._yScale(yValue) + vMargin;

      this.yLabelNode
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('transform', 'translate('+yLeft+','+yTop+')');

      this.yLabelNode
        .select('text')
        .text(d3.format('f')(yValue));

      this.yLabelNode
        .select('path')
        .style('display', 'block');
    };

    LineChart.prototype.cursor = function(duration) {

      var self = this;

      this.svg.on('mousemove', function(){

        // get the mouse position
        var pos = d3.mouse(self.vis[0][0]);

        // get the values at the mouse position
        var xValue = self._xScale.invert(pos[0]);
        var yValue = self._yScale.invert(pos[1]);

        if (isNaN(xValue) || isNaN(yValue)) {
          return;
        }

        // dispatch all cursor change events
        self._dispatch.cursorchange([xValue, yValue]);

        // get the next x-Value and its index at the mouse position
        var bisectX = d3.bisector(self.xKey).left;
        var index = bisectX(self._data, xValue);
        d = self._data[index];
        
        // get the nearest value
        if (index > 0 && index < self._data.length) {
          var x0 = self._data[index - 1];
          var x1 = self._data[index];
          d = xValue - x0.x > x1.x - xValue ? x1 : x0;
        }

        if (d) {
          // Update the cursor
          self.drawCursor(d.x, d.y, duration);

          // Dispatch all focus listeners
          self._dispatch.focuschange([d.x, d.y]);
        }
      });
    };

    LineChart.prototype.zoom = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      var self = this;

      var zoom = d3.behavior.zoom()
        .x(this._xScale)
        .on("zoom", function() {

          // Update axis and grid
          self.axis(duration);
          self.grid(duration);

          // Update data to new scale
          self.drawData(duration);
        })
        .on("zoomend", function(){

          // Dispatch all zoom listeners
          self._dispatch.zoomchange([
            self._xScale.invert(0), self._xScale.invert(self.innerWidth)
          ]);
        });

      this.svg.call(zoom);
    };

    /* Draw functions */

    LineChart.prototype.drawDots = function(duration) {
      
      duration = duration !== undefined ? duration : this.duration;

      // Update
      this.svg.select('.data')
        .selectAll('circle').data(this._data, this.xKey)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('cx', this.xScaleKey)
        .attr('cy', this.yScaleKey);

      // Enter
      this.svg.select('.data')
        .selectAll('circle').data(this._data, this.xKey)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('r', 2.5)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('cx', this.xScaleKey)
        .attr('cy', this.yScaleKey);

      // Exit
      this.svg.select('.data')
        .selectAll('circle').data(this._data, this.xKey)
        .exit()
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr('cx', this.xScaleKey)
        .each("end", function(){
          d3.select(this).remove();
        });
    };

    LineChart.prototype.drawLine = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      var line0 = d3.svg.line()
        .x(this.xScaleKey)
        .y(this.innerHeight)
        .interpolate(this.interpolate);

      var line = d3.svg.line()
        .x(this.xScaleKey)
        .y(this.yScaleKey)
        .interpolate(this.interpolate);

      // Update
      this.svg.select(".data-line-update")
        .datum(this._data)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr("d", line);

      // Enter
      this.dataLineNode
        .datum(this._data)
        .attr("d", line0)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr("d", line)
        .each("end", function(){
          d3.select(this).attr("class", "data-line-update");
        });
    };

    LineChart.prototype.drawArea = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      var area0 = d3.svg.area()
        .x(this.xScaleKey)
        .y0(this.innerHeight)
        .y1(this.innerHeight)
        .interpolate(this.interpolate);

      var area = d3.svg.area()
        .x(this.xScaleKey)
        .y0(this.innerHeight)
        .y1(this.yScaleKey)
        .interpolate(this.interpolate);

      // Update
      this.svg.select(".data-area-update")
        .datum(this._data)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr("d", area);

      // Enter
      this.dataAreaNode
        .datum(this._data)
        .attr("d", area0)
        .transition()
        .ease(this.ease)
        .duration(duration)
        .attr("d", area)
        .each("end", function(){
          d3.select(this).attr("class", "data-area-update");
        });
    };

    LineChart.prototype.drawData = function(duration) {
      this.drawDots(duration);
      this.drawLine(duration);
      this.drawArea(duration);
    };

    LineChart.prototype.redraw = function(duration) {
      _super.prototype.redraw.call(this, duration);

      if (!this._data || !this._data.length){
        return;
      }

      this._xScale = this.xScale();
      this._yScale = this.yScale();

      this._xAxis = this.xAxis();
      this._yAxis = this.yAxis();
      
      this._xGrid = this.xGrid();
      this._yGrid = this.yGrid();
      
      this.axis(duration);
      this.grid(duration);
      
      /* Data */
      this.drawData(duration);

      /* Interaction */
      this.cursor(25);
      // this.zoom(25);
    };
    return LineChart;
  })(baseChart);

  return LineChart;
})

.directive('lineChart', function(chartDirectiveTemplate, lineChart){

  return chartDirectiveTemplate(lineChart);
})

/* ---- Brush Chart ---- */

.factory('brushChart', function(d3, lineChart){

  var BrushChart = (function(_super) {
    __extends(BrushChart, _super);

    function BrushChart(element) {
      _super.call(this, element);

      /* Create a brush container */
      this.brushCont = this.focusCont.append('g').attr('class', 'brush');

      /* Init events */
      this.dispatch("brushstart");
      this.dispatch("brush");
      this.dispatch("brushend");

      this._width = 200;
      this._height = 20;
      this._margin.bottom = 0;
      this._margin.top = 0;
      this._margin.left = 0;
      this._margin.right = 0;
    }

    /* Brush functions */

    BrushChart.prototype.brush = function() {
      
      var self = this;

      return d3.svg.brush()
        .x(this._xScale)
        .on('brush', function(){
          if (self._brush) {
            self._dispatch.brush(self._brush);
          }
        });
    };

    BrushChart.prototype.drawBrush = function(duration) {

      this.brushCont
        .call(this._brush)
        .selectAll("rect")
        .attr("y", 0)
        .attr("height", this.innerHeight);
    };

    BrushChart.prototype.drawData = function(duration) {
      this.drawArea(duration);
    };

    BrushChart.prototype.redraw = function(duration) {

      if (!this._data || !this._data.length){
        return;
      }

      this.innerWidth = this._width - this._margin.left - this._margin.right;
      this.innerHeight = this._height - this._margin.top - this._margin.bottom;

      /* Layout */
      this.base();

      this._xScale = this.xScale();
      this._yScale = this.yScale();

      this._xAxis = this.xAxis();
      
      this._brush = this.brush();
      
      this.axis(duration);
      this.grid(duration);
      
      /* Data */
      this.drawData(duration);

      /* Interaction */
      this.drawBrush(25);
    };

    return BrushChart;
  })(lineChart);

  return BrushChart;
})

.directive('brushChart', function(chartDirectiveTemplate, brushChart){

  return chartDirectiveTemplate(brushChart, function(scope, element, attrs, chart){

    chart.on('brush', function(brush){

      if (scope.brush) {
        scope.brush = brush.extent();
        scope.$apply();
      }
    });
  });
})


/* ---- Bar Chart ---- */

.factory('barChart', function(d3, lineChart){

  var BarChart = (function(_super) {
    __extends(BarChart, _super);

    function BarChart(element) {
        _super.call(this, element);
    }

    BarChart.prototype.drawBars = function(duration) {

      duration = duration !== undefined ? duration : this.duration;

      var self = this;
      var barWidth = this.innerWidth / this._data.length;

      var widthBarKey = function(d) { return barWidth; };
      var heightBarKey = function(d) { return self.innerHeight - self._yScale(d.y); };
      var xBarKey = function(d) { return self._xScale(d.x) - barWidth*0.5; };

      // Update
      this.dataCont
        .selectAll('rect').data(this._data, this.xKey)
        .transition()
        .duration(duration)
        .ease(this.ease)
        .attr('x', xBarKey)
        .attr('y', this.yScaleKey)
        .attr('height', heightBarKey)
        .attr('width', widthBarKey);

      // Enter
      this.dataCont
        .selectAll('rect').data(this._data, this.xKey)
        .enter()
        .append('rect')
        .attr('class', 'data-bar')
        .attr('r', 2.5)
        .attr('x', xBarKey)
        .attr('y', this.innerHeight)
        .attr('width', widthBarKey)
        .attr('height', 0)
        .transition()
        .duration(duration)
        .ease(this.ease)
        .attr('y', this.yScaleKey)
        .attr('height', heightBarKey);

      // Exit
      this.dataCont
        .selectAll('rect').data(this._data, this.xKey)
        .exit()
        .transition()
        .duration(duration)
        .ease(this.ease)
        .attr('y', this.innerHeight)
        .attr('height', 0)
        .each("end", function(){
          d3.select(this).remove();
        });
    };

    BarChart.prototype.drawData = function(duration){
      this.drawBars(duration);
    };

    return BarChart;
  })(lineChart);

  return BarChart;
})

.directive('barChart', function(chartDirectiveTemplate, barChart){

  return chartDirectiveTemplate(barChart);
})


/* ---- Pie Chart ---- */

.factory('pieChart', function(baseChart){

  var PieChart = (function(_super) {
    __extends(PieChart, _super);

    function PieChart(element) {
        _super.call(this, element);
    }

    PieChart.prototype.drawPies = function(duration) {
    
      // Sum the Data until index stop
      var sum = function(data, stop) {
        return data.reduce(function(prev, d, i){
          if (stop === undefined || i < stop) {
            return prev + d.y;
          }
          return prev;
        }, 0);
      }

      var colors = d3.scale.category10();
      var total = sum(this._data);

      var arc = d3.svg.arc()
        .innerRadius(40)
        .outerRadius(100)
        .startAngle(function(d, i) {
          if (i) {
            return sum(this._data, i)/total * 2*Math.PI;
          }
          return 0;
        })
        .endAngle(function(d, i) {
           return sum(this._data, i + 1)/total * 2*Math.PI;
        });

      this.dataCont
        .attr("transform", "translate(" +(this.innerWidth*0.5)+ "," +(this.innerHeight*0.5)+ ")")
        .selectAll("path")
        .data(this._data)
        .enter().append("path")
        .attr("d", arc)
        .style("fill", function(d, i) { return colors(i); });

      this.dataCont
        .attr("transform", "translate(" +(this.innerWidth*0.5)+ "," +(this.innerHeight*0.5)+ ")")
        .selectAll("text")
        .data(this._data)
        .enter().append("text")
        .attr("text-anchor", "middle")
        .attr("transform", function(d, i) { return "translate(" + arc.centroid(d, i) + ")"; })

    };

    PieChart.prototype.drawCursor = function(){

    };

    PieChart.prototype.drawData = function(duration){
      this.drawPies(duration);
    };

    PieChart.prototype.redraw = function(duration) {

      _super.prototype.redraw.call(this, duration);

      this.drawData();
    };

    return PieChart;
  })(baseChart);

  return PieChart;
})

.directive('pieChart', function(chartDirectiveTemplate, pieChart){

  return chartDirectiveTemplate(pieChart);
});