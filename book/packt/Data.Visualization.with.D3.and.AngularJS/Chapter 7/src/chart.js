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

// Line Chart directive
.directive('myLineChart', ["d3",
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
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%I'));

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height-margin, margin]);

      // Define y-axis
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickFormat(d3.format('f'));

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
        .call(xAxis
            .tickSize(height - 2*margin, 0, 0)
            .tickFormat("")
        );
      
      // Draw the y-grid
      svg.select('.y-grid')
        .attr("transform", "translate(" + margin + ")")
        .call(yAxis
            .tickSize(-width + 2*margin, 0, 0)
            .tickFormat("")
        );

      var easing = d3.ease('cubic');
      var ease_type = 'cubic';
      var max = d3.max(data, function(d){ return d.y; });
      var duration = 2500;

       var interpolatePoints = function(A, B) {

        var interpolator_x = d3.interpolateArray(
          A.map(function(d){ return d.x; }),
          B.map(function(d){ return d.x; })
        );

        var interpolator_y = d3.interpolateArray(
          A.map(function(d){ return d.y; }),
          B.map(function(d){ return d.y; })
        );

        return function(t) {
          var x = interpolator_x(t);
          var y = interpolator_y(t);

          return x.map(function(d,i){
            return {
              x: x[i],
              y: y[i]
            };
          });
        };
      };

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
        .attr('cy', function(d) { return yScale(d.y); });

      svg.select('.data')
        .selectAll('circle').data(data)
        .exit()
        .remove();

      // Draw a line

      var line = d3.svg.line()
        .x(function(d) { return xScale(d.x); })
        .y(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-line")
        .datum(data)
        .attr("d", line);

      // Draw a area

      var area = d3.svg.area()
        .x(function(d) { return xScale(d.x); })
        .y0(yScale(0))
        .y1(function(d) { return yScale(d.y); })
        .interpolate('cardinal');

      svg.select(".data-area")
        .datum(data)
        .attr("d", area)
        .transition()
        .ease(ease_type)
        .duration(duration)
        .attrTween("d", function(){

          var min = d3.min(data, function(d){ return d.y; });

          var start = data.map(function(d){
            return {
              x: d.x,
              y: min
            };
          });

          return function(t) {

            var interpolate = interpolatePoints(start, data);
            return area(interpolate(t));
          };
        });

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
        var axis_container = svg.append('g').attr('class', 'axis');
        var data_container = svg.append('g').attr('class', 'data');

        axis_container.append('g').attr('class', 'x-grid grid');
        axis_container.append('g').attr('class', 'y-grid grid');
        
        axis_container.append('g').attr('class', 'x-axis axis');
        axis_container.append('g').attr('class', 'y-axis axis');
        
        data_container.append('path').attr('class', 'data-line');
        data_container.append('path').attr('class', 'data-area');

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
.directive('myBarChart', ["d3",
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
        .orient('bottom')
        .tickFormat(d3.time.format('%H:%I'));

      // Define y-scale
      var yScale = d3.time.scale()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height-margin, margin]);

      // Define y-axis
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickFormat(d3.format('f'));

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
        .call(xAxis
            .tickSize(height - 2*margin, 0, 0)
            .tickFormat("")
        );
      
      // Draw the y-grid
      svg.select('.y-grid')
        .attr("transform", "translate(" + margin + ")")
        .call(yAxis
            .tickSize(-width + 2*margin, 0, 0)
            .tickFormat("")
        );

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
        var axis_container = svg.append('g').attr('class', 'axis');
        var data_container = svg.append('g').attr('class', 'data');

        axis_container.append('g').attr('class', 'x-grid grid');
        axis_container.append('g').attr('class', 'y-grid grid');
        
        axis_container.append('g').attr('class', 'x-axis axis');
        axis_container.append('g').attr('class', 'y-axis axis');
        
        data_container.append('path').attr('class', 'data-line');
        data_container.append('path').attr('class', 'data-area');

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
        var data_container = svg.append('g').attr('class', 'data');
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