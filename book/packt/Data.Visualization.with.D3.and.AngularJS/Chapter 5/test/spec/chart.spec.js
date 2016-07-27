var accessApacheRegExp = /^([0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3})\s*-(.*?)-\s*\[(.*?)\]\s*"(.*?)"(.*?)\s*"-"\s*"(.*?)"$/ig;

describe('my-scatter-chart', function() {
    var elm, scope;

    beforeEach(module('myChart'));

    beforeEach(inject(function($rootScope, $compile) {

        /* Define the Directive */
        elm = angular.element(
          '<my-scatter-chart data="data"></my-scatter-chart>');

        /* Define the Data on the Scope */
        scope = $rootScope.$new();
        scope.data = [];

        $compile(elm)(scope);
        scope.$digest();
    }));

    it('should create svg parent', function() {
        var svg = elm.find('svg');
        expect(svg.length).toBe(1);
    });

    it('should create containers for data and axis', function() {
        var groups = elm.find('svg').find('g');
        expect(groups.length).toBe(3);
    });

    it('should create a data point', function() {
        var circles = elm.find('svg').find('circle');
        expect(circles.length).toBe(0);

        scope.data.push({
            time: (new Date('2014-01-01 00:00:00')).toString(), visitors:3
        });
        scope.$digest();

        circles = elm.find('svg').find('circle');
        expect(circles.length).toBe(1);
    });
});

describe('simple-d3-loader', function() {
    var elm, scope, loader;

    beforeEach(module('myChart'));
    
    beforeEach(inject(function(SimpleD3Loader) {
      loader = SimpleD3Loader;
    }));

    it('should load the data', function() {
        
        var result;
 
        runs(function() {
            loader('/base/test/files/testAccessApache.log', function(data){
                result = data;
            });
        });
 
        waitsFor(function(){
            return result;
        }, "AJAX should complete", 2000);
 
        runs(function() {
            expect(result).toMatch(accessApacheRegExp);
        });
    });
});

describe('simple-angular-loader', function() {
    var elm, scope, loader, httpBackend;

    beforeEach(module('myChart'));
    
    beforeEach(inject(function(SimpleHttpLoader, $httpBackend) {
      loader = SimpleHttpLoader;

      $httpBackend
        .when('GET', '/base/test/files/testAccessApache.log')
        .respond('66.249.64.121 - - [22/Nov/2014:01:56:00 +0100] "GET /index.html HTTP/1.1" 200 2507 "-" ""');

      httpBackend = $httpBackend;
    }));

    it('should load the data', function() {
        
        var result;
 
        loader('/base/test/files/testAccessApache.log').then(function(response){
            result = response.data;
        });

        httpBackend.flush();

        expect(result).toMatch(accessApacheRegExp);
    });
});

describe('string-parser', function() {
    var elm, scope, parser, logString;

    beforeEach(module('myChart'));
    
    beforeEach(inject(function(StringParser) {
      parser = StringParser;
      logString = '66.249.64.121 - - [22/Nov/2014:01:56:00 +0100] "GET /robots.txt HTTP/1.1" 302 507 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"';
    }));

    it('should parse the data', function() {

        var parsed = parser(logString);
        var mapped = parsed.map(function(d) {
          return {
              ip: d[0], time: d[2], request: d[3], status: d[4], agent: d[8]
          };
        })

        expect(mapped[0].ip).toBe('66.249.64.121');
        expect(mapped[0].time).toBe('22/Nov/2014:01:56:00 +0100');
        expect(mapped[0].request).toBe('GET /robots.txt HTTP/1.1');
        expect(mapped[0].agent).toBe('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
        expect(mapped[0].status).toBe('302 507');
    });
});

describe('classifier', function() {
    var elm, scope, classifier, sample;

    beforeEach(module('myChart'));
    
    beforeEach(inject(function(Classifier) {
      classifier = Classifier;
      sample = [{a:1}, {a:2}, {a:3}];
    }));

    it('should group the data', function() {

        var grouped = classifier(sample, function(d){
          return d.a;
        });

        expect(grouped[0].y).toBe(1);
        expect(grouped[1].y).toBe(1);
        expect(grouped[2].y).toBe(1);
    });

    it('should group the data in an interval', function() {

        var grouped = classifier(sample, function(d){
          var coeff = 2;
          return Math.round(d.a / coeff) * coeff;
        });

        expect(grouped[0].y).toBe(2);
        expect(grouped[1].y).toBe(1);
    });
});