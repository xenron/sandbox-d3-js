/* src/chart.js */
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

// Scatter Chart directive
.directive('myScatterChart', ["d3",
  function(d3){

    function draw(svg, width, height, data) {

      svg
        .attr('width', width)
        .attr('height', height);

      // Define a margin
      var margin = 30;

      // Define x scale
      var xScale = d3.time.scale()
        .domain(d3.extent(data, function(d) { return d.x; }))
        .range([margin, width-margin]);

      // Define x-axis
      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickFormat(d3.time.format('%H:%I'));

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([margin, height-margin]);

      // Define y-axis
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickFormat(d3.format('f'));

      // Draw the x-axis
      svg.select('.x-axis')
        .attr("transform", "translate(0, " + margin + ")")
        .call(xAxis);
      
      // Draw the y-axis
      svg.select('.y-axis')
        .attr("transform", "translate(" + margin + ")")
        .call(yAxis);

      // Add new the data points
      svg.select('.data')
        .selectAll('circle').data(data)
        .enter()
        .append('circle');

      // Updated all data points
      svg.select('.data')
        .selectAll('circle').data(data)
        .attr('r', 2.5)
        .attr('cx', function(d) { return xScale(d.x); })
        .attr('cy', function(d) { return yScale(d.y); });
    }

    return {
      restrict: 'E',
      scope: {
        data: '='
      },
      compile: function( element, attrs, transclude ) {

        // Create a SVG root element
        var svg = d3.select(element[0]).append('svg');

        svg.append('g').attr('class', 'data');
        svg.append('g').attr('class', 'x-axis axis');
        svg.append('g').attr('class', 'y-axis axis');

        // Define the dimensions for the chart
        var width = 600, height = 300;

        // Return the link function
        return function(scope, element, attrs) {

          // Watch the data attribute of the scope
          scope.$watch('data', function(newVal, oldVal, scope) {
            
            // Update the chart
            if (scope.data) {
              draw(svg, width, height, scope.data);
            }
          }, true);
        };
      }
    };
}])

// Brush Chart directive
.directive('myBrushChart', ["d3",
  function(d3){

    function draw(svg, width, height, data, dispatch) {

      if (data && !data.length) {
        return;
      }

      svg
        .attr('width', width)
        .attr('height', height);

      // Define a margin
      var margin = 10;

      // Define x scale
      var xScale = d3.time.scale()
        .domain(d3.extent(data, function(d) { return d.x; }))
        .range([margin, width-margin]);

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height-margin, margin]);


      var easing = d3.ease('cubic');
      var ease_type = 'cubic';
      var max = d3.max(data, function(d){ return d.y; });
      var duration = 2500;

      // Draw a line
      var line0 = d3.svg.line()
        .x(function(d) { return xScale(d.x); })
        .y(function(d) { return yScale(0); })
        .interpolate('cardinal');

      var line1 = d3.svg.line()
        .x(function(d) { return xScale(d.x); })
        .y(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-line")
        .datum(data)
        .attr("d", line0)
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attr("d", line1);

      // Draw a area

      var area0 = d3.svg.area()
        .x(function(d) { return xScale(d.x); })
        .y0(yScale(0))
        .y1(function(d) { return yScale(0); })
        .interpolate('cardinal');

      var area1 = d3.svg.area()
        .x(function(d) { return xScale(d.x); })
        .y0(yScale(0))
        .y1(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-area")
        .datum(data)
        .attr("d", area0)
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attr("d", area1);

      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushstart', function(){
          dispatch.brushstart(brush);
        })
        .on('brush', function(){
          dispatch.brush(brush);
        })
        .on('brushend', function(){
          dispatch.brushend(brush);
        });

      svg.select('.brush')
        .call(brush)
        .selectAll("rect")
        .attr("y", 0)
        .attr("height", height-margin);
    }

    return {
      restrict: 'E',
      scope: {
        data: '=',
        brush: '='
      },
      compile: function( element, attrs, transclude ) {

        // Create a SVG root element
        var svg = d3.select(element[0]).append('svg');

        /* Create container */
        var visCont = svg.append('g').attr('class', 'vis');
        var dataCont = visCont.append('g').attr('class', 'data');
        var brushCont = visCont.append('g').attr('class', 'brush');;

        dataCont.append('path').attr('class', 'data-line');
        dataCont.append('path').attr('class', 'data-area');

        // Initialize the brush events
        var dispatch = d3.dispatch(
          "brushstart", "brush", "brushend"
        );

        // Define the dimensions for the chart
        var width = 200, height = 50;

        // Return the link function
        return function(scope, element, attrs) {

          dispatch.on('brush', function(brush){ 
            scope.$apply(function(){
              scope.brush = brush.extent();
            });
          });

          // Watch the data attribute of the scope
          scope.$watch('data', function(newVal, oldVal, scope) {
            
            // Update the chart
            if (scope.data) {
              draw(svg, width, height, scope.data, dispatch);
            }
          }, true);
        };
      }
    };
}])


// Line Chart directive
.directive('myLineChart', ["d3",
  function(d3){

    function draw(svg, width, height, data) {

      if (data && !data.length) {
        return;
      }

      svg
        .attr('width', width)
        .attr('height', height);

      // Define a margin
      var margin = 30;

      // Define x scale
      var xScale = d3.time.scale()
        .domain(d3.extent(data, function(d) { return d.x; }))
        .range([margin, width-margin]);

      // Define x-axis
      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%I'));

      // Define x-grid
      var xGrid = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickSize(height - 2*margin, 0, 0)
        .tickFormat("");

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height-margin, margin]);

      // Define y-axis
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickFormat(d3.format('f'));

      // Define y-grid
      var yGrid = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickSize(-width + 2*margin, 0, 0)
        .tickFormat("");

      // Draw the x-axis
      svg.select('.x-axis')
        .attr("transform", "translate(0, " + (height-margin) + ")")
        .call(xAxis);
      
      // Draw the y-axis
      svg.select('.y-axis')
        .attr("transform", "translate(" + margin + ")")
        .call(yAxis);

      // Draw the x-grid
      svg.select('.x-grid')
        .attr("transform", "translate(0, " + margin + ")")
        .call(xGrid);
      
      // Draw the y-grid
      svg.select('.y-grid')
        .attr("transform", "translate(" + margin + ")")
        .call(yGrid);

      var easing = d3.ease('cubic');
      var ease_type = 'cubic';
      var max = d3.max(data, function(d){ return d.y; });
      var duration = 2500;

      // Draw data points

      svg.select('.data')
        .selectAll('circle').data(data)
        .enter()
        .append('circle')
        .attr('class', 'data-point');

      svg.select('.data')
        .selectAll('circle').data(data)
        .attr('r', 2.5)
        .attr('cx', function(d) { return xScale(d.x); })
        .attr('cy', function(d) { return yScale(0); })
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attr('cy', function(d) { return yScale(d.y); });

      svg.select('.data')
        .selectAll('circle').data(data)
        .exit()
        .remove();

      // Draw a line

      var line0 = d3.svg.line()
        .x(function(d) { return xScale(d.x); })
        .y(function(d) { return yScale(0); })
        .interpolate('cardinal');

      var line1 = d3.svg.line()
        .x(function(d) { return xScale(d.x); })
        .y(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-line")
        .datum(data)
        .attr("d", line0)
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attr("d", line1);

      // Draw a area

      var area0 = d3.svg.area()
        .x(function(d) { return xScale(d.x); })
        .y0(yScale(0))
        .y1(function(d) { return yScale(0); })
        .interpolate('cardinal');

      var area1 = d3.svg.area()
        .x(function(d) { return xScale(d.x); })
        .y0(yScale(0))
        .y1(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-area")
        .datum(data)
        .attr("d", area0)
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attr("d", area1);


      /* ---- Cursor ------- */
      var xCursor = svg.select('.x-cursor');
      var yCursor = svg.select('.y-cursor');
      var activePoint = svg.select('.data-point-active');

      var xLabel = svg.select('.x-label');
      var yLabel = svg.select('.y-label');
      var labelDuration = 10;

      svg.on('mousemove', function(){

        var pos = d3.mouse(this);
        var xValue = xScale.invert(pos[0]);
        var xBisect = d3.bisector(function(d) { return d.x; }).left;
        var index = xBisect(data, xValue);
        
        var hMargin = -8;
        var vMargin = 3;
        var xMin = d3.min(data, function(d) { return d.x; });
        var xMax = d3.max(data, function(d) { return d.x; });
        var yMax = d3.max(data, function(d) { return d.y; });

        if (index == 0 || index >= data.length) {
          return;
        }

        // get the nearest value
        var d0 = data[index - 1];
        var d1 = data[index];

        var d = xValue - d0.x > d1.x - xValue ? d1 : d0;
        
        if (d===undefined || !d.hasOwnProperty('x') || !d.hasOwnProperty('y')) {
          return;
        }

        activePoint
          .attr("cx", xScale(d.x))
          .attr("cy", yScale(d.y))
          .attr("r", 3);

        xCursor
          .attr('x1', xScale(d.x))
          .attr('y1', yScale(0))
          .attr('x2', xScale(d.x))
          .attr('y2', yScale(yMax));
      
        yCursor
          .attr('x1', xScale(xMin))
          .attr('y1', yScale(d.y))
          .attr('x2', xScale(xMax))
          .attr('y2', yScale(d.y));

        var xLeft = xScale(d.x) + vMargin;
        var xTop = yScale(0);

        var date = new Date(+d.x);
        var format = d3.time.format('%H:%M');

        xLabel
          .transition()
          .ease(easing)
          .duration(labelDuration)
          .attr('transform', 'translate('+xLeft+','+xTop+') rotate(-90)');

        xLabel
          .select('text')
          .text(format(date));

        xLabel
          .select('path')
          .style('display', 'block');

        var yLeft = xScale(xMin);
        var yTop = yScale(d.y) + vMargin;

        yLabel
          .transition()
          .ease(easing)
          .duration(labelDuration)
          .attr('transform', 'translate('+yLeft+','+yTop+')');

        yLabel
          .select('text')
          .text(d3.format('f')(d.y));

        yLabel
          .select('path')
          .style('display', 'block');        
      });

      /* ---- Zoom ---- */
      var zoomDuration = 150;
      var zoom = d3.behavior.zoom()
        .x(xScale)
        .on("zoom", function() {
          
          // Update x-Axis
          svg.select('.x-axis')
            .transition()
            .ease(ease_type)
            .duration(zoomDuration)
            .call(xAxis);
          
          svg.select('.x-grid')
            .transition()
            .ease(ease_type)
            .duration(zoomDuration)
            .call(xGrid);

          // Update data points
          svg.select('.data')
            .selectAll('circle').data(data)
            .transition()
            .ease(ease_type)
            .duration(zoomDuration)
            .attr('d', line1)
            .attr('cx', function(d) { return xScale(d.x); })
            .attr('cy', function(d) { return yScale(d.y); });
          
          svg.select(".data-line")
            .transition()
            .ease(ease_type)
            .duration(zoomDuration)
            .attr('d', line1);
          
          svg.select(".data-area")
            .transition()
            .ease(ease_type)
            .duration(zoomDuration)
            .attr('d', area1);
        });

      svg.call(zoom);
    }

    return {
      restrict: 'E',
      scope: {
        data: '='
      },
      compile: function( element, attrs, transclude ) {

        // Create a SVG root element
        var svg = d3.select(element[0]).append('svg');

        /* Create container */
        var visCont = svg.append('g').attr('class', 'vis');
        var axisCont = visCont.append('g').attr('class', 'axis');
        var dataCont = visCont.append('g').attr('class', 'data');
        var focusCont = visCont.append('g').attr('class', 'focus');
        var cursorCont = axisCont.append('g').attr('class', 'cursor');

        axisCont.append('g').attr('class', 'x-grid grid');
        axisCont.append('g').attr('class', 'y-grid grid');
        
        axisCont.append('g').attr('class', 'x-axis axis');
        axisCont.append('g').attr('class', 'y-axis axis');
        
        cursorCont.append('line').attr('class', 'x-cursor cursor');
        cursorCont.append('line').attr('class', 'y-cursor cursor');

        dataCont.append('path').attr('class', 'data-line');
        dataCont.append('path').attr('class', 'data-area');

        focusCont.append('circle').attr('class', 'data-point-active');

        var xLabelNode = focusCont.append('g').attr('class', 'x-label label');
        var yLabelNode = focusCont.append('g').attr('class', 'y-label label');

        // Path for the label shape
        var tag_path = 'M 51.166,23.963 62.359,17.5 c 1.43,-0.824 1.43,-2.175 0,-3 L 51.166,8.037 48.568,1.537 2,1.4693227 2,30.576466 48.568,30.463 z';
        
        xLabelNode.append('path')
          .style('display', 'none')
          .attr('d', tag_path)
          .attr('transform', 'translate(-30, -15) scale(0.7)');
        xLabelNode.append('text')
          .attr('transform', 'translate(-20)');

        yLabelNode.append('path')
          .style('display', 'none')
          .attr('d', tag_path)
          .attr('transform', 'translate(-30, -15) scale(0.7)');
        yLabelNode.append('text')
          .attr('transform', 'translate(-20)');


        // Define the dimensions for the chart
        var width = 800, height = 300;

        // Return the link function
        return function(scope, element, attrs) {

          // Watch the data attribute of the scope
          scope.$watch('data', function(newVal, oldVal, scope) {
            
            // Update the chart
            if (scope.data) {
              draw(svg, width, height, scope.data);
            }
          }, true);
        };
      }
    };
}])

// Bar Chart directive
.directive('myBarChart', ["d3", "$filter",
  function(d3, $filter){

    function draw(svg, width, height, data, dispatch) {

      if (data && !data.length) {
        return;
      }

      svg
        .attr('width', width)
        .attr('height', height);

      // Define a margin
      var margin = 30;

      // Define x scale
      var xScale = d3.time.scale()
        .domain(d3.extent(data, function(d) { return d.x; }))
        .range([margin, width-margin]);

      // Define x-axis
      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%I'));

      // Define x-grid
      var xGrid = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickSize(height - 2*margin, 0, 0)
        .tickFormat("");

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height-margin, margin]);

      // Define y-axis
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickFormat(d3.format('f'));

      // Define y-grid
      var yGrid = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickSize(-width + 2*margin, 0, 0)
        .tickFormat("");

      // Draw the x-axis
      svg.select('.x-axis')
        .attr("transform", "translate(0, " + (height-margin) + ")")
        .call(xAxis);
      
      // Draw the y-axis
      svg.select('.y-axis')
        .attr("transform", "translate(" + margin + ")")
        .call(yAxis);

      // Draw the x-grid
      svg.select('.x-grid')
        .attr("transform", "translate(0, " + margin + ")")
        .call(xGrid);
      
      // Draw the y-grid
      svg.select('.y-grid')
        .attr("transform", "translate(" + margin + ")")
        .call(yGrid);

      /* ---- Draw bars ---- */

      var barWidth = (width-2*margin)/data.length;

      svg.select('.data')
        .selectAll('rect').data(data)
        .enter()
        .append('rect')
        .attr('class', 'data-bar');

      var easing = d3.ease('cubic');
      var ease_type = 'cubic';
      var max = d3.max(data, function(d){ return d.y; });
      var duration = 2500;

      svg.select('.data')
        .selectAll('rect').data(data)
        .attr('r', 2.5)
        .attr('x', function(d) { return xScale(d.x) - barWidth*0.5; })
        .attr('y', function(d) { return yScale(0); })
        .attr('width', function(d) { return barWidth; })
        .attr('height', 0)
        .transition()
        .duration(function(d, i){ return duration*(d.y/max); })
        .ease('cubic')
        //.delay(function(d,i) { return 100*i; })
        .delay(function(d,i) { return duration*easing((i+1)/data.length); })
        .attr('y', function(d) { return yScale(d.y); })
        .attr('height', function(d) { return yScale(0) - yScale(d.y); });

      svg.select('.data')
        .selectAll('rect').data(data)
        .exit()
        .remove();

      /* ---- Cursor ------- */
      var xCursor = svg.select('.x-cursor');
      var yCursor = svg.select('.y-cursor');
      var activePoint = svg.select('.data-point-active');

      var xLabel = svg.select('.x-label');
      var yLabel = svg.select('.y-label');
      var labelDuration = 10;

      svg.on('mousemove', function(){

        var pos = d3.mouse(this);
        var xValue = xScale.invert(pos[0]);
        var xBisect = d3.bisector(function(d) { return d.x; }).left;
        var index = xBisect(data, xValue);
        
        var hMargin = -8;
        var vMargin = 3;
        var xMin = d3.min(data, function(d) { return d.x; });
        var xMax = d3.max(data, function(d) { return d.x; });
        var yMax = d3.max(data, function(d) { return d.y; });

        if (index == 0 || index >= data.length) {
          return;
        }

        // get the nearest value
        var d0 = data[index - 1];
        var d1 = data[index];

        var d = xValue - d0.x > d1.x - xValue ? d1 : d0;
        
        if (d===undefined || !d.hasOwnProperty('x') || !d.hasOwnProperty('y')) {
          return;
        }

        activePoint
          .attr("cx", xScale(d.x))
          .attr("cy", yScale(d.y))
          .attr("r", 3);

        xCursor
          .attr('x1', xScale(d.x))
          .attr('y1', yScale(0))
          .attr('x2', xScale(d.x))
          .attr('y2', yScale(yMax));
      
        yCursor
          .attr('x1', xScale(xMin))
          .attr('y1', yScale(d.y))
          .attr('x2', xScale(xMax))
          .attr('y2', yScale(d.y));

        var xLeft = xScale(d.x) + vMargin;
        var xTop = yScale(0);

        var date = new Date(+d.x);
        var format = d3.time.format('%H:%M');

        xLabel
          .transition()
          .ease(easing)
          .duration(labelDuration)
          .attr('transform', 'translate('+xLeft+','+xTop+') rotate(-90)');

        xLabel
          .select('text')
          .text(format(date));

        xLabel
          .select('path')
          .style('display', 'block');

        var yLeft = xScale(xMin);
        var yTop = yScale(d.y) + vMargin;

        yLabel
          .transition()
          .ease(easing)
          .duration(labelDuration)
          .attr('transform', 'translate('+yLeft+','+yTop+')');

        yLabel
          .select('text')
          .text(d3.format('f')(d.y));

        yLabel
          .select('path')
          .style('display', 'block');

        // dispatch all cursor change events
        dispatch.cursorchange([d.x, d.y]);       
      });
    }

    function filter(data, minDate, maxDate) {
      // Create a new array
      var d = data.slice(0);

      if (minDate !== undefined) {
        d = $filter('gte_date')(d, minDate);
      }
      if (maxDate !== undefined) {
        d = $filter('lte_date')(d, maxDate);
      }
      return d;
    }

    return {
      restrict: 'E',
      scope: {
        data: '=',
        cursor: '=',
        startDate: '=',
        endDate: '='
      },
      compile: function( element, attrs, transclude ) {

        // Create a SVG root element
        var svg = d3.select(element[0]).append('svg');

        /* Create container */
        var visCont = svg.append('g').attr('class', 'vis');
        var axisCont = visCont.append('g').attr('class', 'axis');
        var dataCont = visCont.append('g').attr('class', 'data');
        var focusCont = visCont.append('g').attr('class', 'focus');
        var cursorCont = axisCont.append('g').attr('class', 'cursor');

        axisCont.append('g').attr('class', 'x-grid grid');
        axisCont.append('g').attr('class', 'y-grid grid');
        
        axisCont.append('g').attr('class', 'x-axis axis');
        axisCont.append('g').attr('class', 'y-axis axis');
        
        cursorCont.append('line').attr('class', 'x-cursor cursor');
        cursorCont.append('line').attr('class', 'y-cursor cursor');

        dataCont.append('path').attr('class', 'data-line');
        dataCont.append('path').attr('class', 'data-area');

        focusCont.append('circle').attr('class', 'data-point-active');

        var xLabelNode = focusCont.append('g').attr('class', 'x-label label');
        var yLabelNode = focusCont.append('g').attr('class', 'y-label label');

        // Path for the label shape
        var tag_path = 'M 51.166,23.963 62.359,17.5 c 1.43,-0.824 1.43,-2.175 0,-3 L 51.166,8.037 48.568,1.537 2,1.4693227 2,30.576466 48.568,30.463 z';
        
        xLabelNode.append('path')
          .style('display', 'none')
          .attr('d', tag_path)
          .attr('transform', 'translate(-30, -15) scale(0.7)');
        xLabelNode.append('text')
          .attr('transform', 'translate(-20)');

        yLabelNode.append('path')
          .style('display', 'none')
          .attr('d', tag_path)
          .attr('transform', 'translate(-30, -15) scale(0.7)');
        yLabelNode.append('text')
          .attr('transform', 'translate(-20)');

        // Initialize the 'cursorchange' event
        var dispatch = d3.dispatch("cursorchange");

        // Define the dimensions for the chart
        var width = 800, height = 300;

        // Return the link function
        return function(scope, element, attrs) {

          /* Listen on cursor change */
          dispatch.on('cursorchange', function(cursor) {

            if (cursor){
              scope.$apply(function() {
                scope.cursor = cursor;
              });
            }
          });

          // Watch the data attribute of the scope
          scope.$watch('[data, startDate, endDate]', function(newVal, oldVal, scope) {
            
            // Update the chart
            if (scope.data) {
              var data = filter(scope.data, scope.startDate, scope.endDate);
              draw(svg, width, height, data, dispatch);
            }
          }, true);
        };
      }
    };
}])

// Pie Chart directive
.directive('myPieChart', ["d3",
  function(d3){

    function draw(svg, width, height, data) {

      svg
        .attr('width', width)
        .attr('height', height);

      // Define a margin
      var margin = 30;

      var sum = function(data, stop) {
        return data.reduce(function(prev, d, i){
          if (stop === undefined || i < stop) {
            return prev + d.y;
          }
          return prev;
        }, 0);
      }

      var colors = d3.scale.category10();
      var total = sum(data);

      var arc = d3.svg.arc()
        .innerRadius(40)
        .outerRadius(100)
        .startAngle(function(d, i) {
          if (i) {
            return sum(data, i)/total * 2*Math.PI;
          }
          return 0;
        })
        .endAngle(function(d, i) {
           return sum(data, i + 1)/total * 2*Math.PI;
        });

      svg.select(".data")
        .attr("transform", "translate(" +(width*0.5)+ "," +(height*0.5)+ ")")
        .selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", arc)
        .style("fill", function(d, i) { return colors(i); });

      svg.select(".label")
        .attr("transform", "translate(" +(width*0.5)+ "," +(height*0.5)+ ")")
        .selectAll("text")
        .data(data)
        .enter().append("text")
        .attr("text-anchor", "middle")
        .attr("transform", function(d, i) { return "translate(" + arc.centroid(d, i) + ")"; })
        .text(function(d){ return d.x; });
    }

    return {
      restrict: 'E',
      scope: {
        data: '='
      },
      compile: function( element, attrs, transclude ) {

        // Create a SVG root element
        var svg = d3.select(element[0]).append('svg');

        /* Create container */
        var dataCont = svg.append('g').attr('class', 'data');
        var label_container = svg.append('g').attr('class', 'label');

        // Define the dimensions for the chart
        var width = 800, height = 300;

        // Return the link function
        return function(scope, element, attrs) {

          // Watch the data attribute of the scope
          scope.$watch('data', function(newVal, oldVal, scope) {
            
            // Update the chart
            if (scope.data) {
              draw(svg, width, height, scope.data);
            }
          }, true);
        };
      }
    };
}]);