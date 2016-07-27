/* app.js */
angular.module('myApp', ['myChart'])

.factory('socket', ["$rootScope", 
  function($rootScope) {
    var socketio = io.connect();
    return {
      on: function (e, callback) {
        socketio.on(e, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socketio, args);
          });
        });
      },
      emit: function (e, data, callback) {
        socketio.emit(e, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socketio, args);
            }
          });
        });
      }
    };
  }
])

.controller('MainCtrl', ["$scope", "socket", "d3", "SimpleHttpLoader", "StringParser", "Classifier",
  function ($scope, socket, d3, SimpleHttpLoader, StringParser, Classifier) {

    $scope.groupByMinutes = 5;
    
    $scope.display = {
      cursor: [],
      date: [new Date("2014-11-29T14:30:00+0100"), new Date("2014-11-29T21:00:00+0100")]
    };

    $scope.time = {
      currentDateTime: '2014-11-29T00:00',
    };

    $scope.logs = [
      {
        name: 'apache.access',
        path: 'var/log/apache/access.log',
        parser: {
          line: "\n",
          word: /[-"]/gi,
          rem: /["\[\]]/gi
        },
        map: function(d) {
          var format = d3.time.format("%d/%b/%Y:%H:%M:%S %Z");
          return {
            ip: d[0], time: +format.parse(d[2]), request: d[3], status: d[4], agent: d[8]
          }
        },
        data: []
      },
      {
        name: 'mysql.slow-queries',
        path: 'var/log/mysql/slow-queries.log',
        parser: {
          line: /# Time:/,
          word: /\n/gi,
          rem: /[#"\[\]]/gi
        },
        map: function(d) {
          var format = d3.time.format("%y%m%d %H:%M:%S"); 
          return {
            time: +format.parse(d[0]), host: d[1], query: d[2]
          }
        },
        data: []
      },
      {
        name: 'nginx.access',
        path: 'var/log/nginx/access.log',
        parser: {
          line: "\n",
          word: /[-"]/gi,
          rem: /["\[\]]/gi
        },
        map: function(d) {
          var format = d3.time.format("%d/%b/%Y:%H:%M:%S %Z");
          return {
            ip: d[0], time: +format.parse(d[2]), request: d[3], status: d[4], agent: d[8]
          }
        },
        data: []
      },
      {
        name: 'nginx.error',
        path: 'var/log/nginx/error.log',
        parser: {
          line: "\n",
          word: /\[|\]]/gi,
          rem: /["\[\]]/gi
        },
        map: function(d) {
          var format = d3.time.format("%Y/%m/%d %H:%M:%S");
          return {
            time: +format.parse(d[0]), level: d[1], msg: d[2]
          }
        },
        data: []
      }
    ];

    /* Create file watchers */
    angular.forEach($scope.logs, function(log){

      socket.emit('watch', {
        name: log.name,
        path: log.path
      })

      socket.on(log.name, function(data){

        // The data log as string
        var responseDataStr = data;

        // Parse string to an array of datum arrays
        var parsed = StringParser(responseDataStr, log.parser.line, log.parser.word, log.parser.rem);
        
        // Map each datum array to object
        var mapped = parsed.map(log.map);

        var filtered = mapped.filter(function(d){
          return !isNaN(d.time);
        });

        // Group the data set by time
        var grouped = Classifier(filtered, function(d) { 
          var coeff = 1000 * 60 * $scope.groupByMinutes;
          return Math.round(d.time / coeff) * coeff;
        });

        // Use the grouped data for the chart
        log.data = grouped;
      });
    });
  }
]);