/* src/app.js */
// Application Module 
angular.module('myApp', ['myChart'])

// Main application controller
.controller('MainCtrl', ["$scope", "d3", "SimpleHttpLoader", "StringParser", "Classifier",
  function ($scope, d3, SimpleHttpLoader, StringParser, Classifier) {
  
    // Formats date strings 22/Nov/2014:01:56:00 +0100
    var formatter = d3.time.format("%d/%b/%Y:%H:%M:%S %Z");

    $scope.log = {

      // Source of the log file
      src: 'files/access.log',
      
      // Data entries
      data: [],

      // Maps response array to readable JSON object
      map: function(d) {
        return {
          time: +formatter.parse(d[2]),
          ip: d[0],
          request: d[3],
          status: d[4],
          agent: d[8]
        };
      },

      // Group the x-values in an interval of x minutes
      groupByMinutes: 10
    };

    // Load the source file
    SimpleHttpLoader($scope.log.src).then(function(response){

      // Concat all responses to string
      var responseDataStr = response.data;

      // Parse string to an array of datum arrays
      var parsed = StringParser(responseDataStr);
      
      // Map each datum array to object
      var mapped = parsed.map($scope.log.map);
      
      // Group the data set by time
      var grouped = Classifier(mapped, function(d) { 
        var coeff = 1000 * 60 * $scope.log.groupByMinutes;
        return Math.round(d.time / coeff) * coeff;
      });

      // Use the grouped data for the chart
      $scope.log.data = grouped;
  });
}]);