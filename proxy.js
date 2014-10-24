var HttpMaster = require('http-master');

var httpMaster = new HttpMaster();

httpMaster.on('logError', function(msg) {
  console.warn(msg);
});
httpMaster.on('logNotice', function(msg) {
  console.log(msg);
});

var masterConfig = {
  port: process.env.PORT || 3001,
  railsPort: process.env.RAILS_PORT || 3000,
  railsHost: process.env.RAILS_HOST || 'localhost'
};

var routeVnc = [
  function(config, commService) {
    var http = require('http');

    return {
      requestHandler: function(req, res, next) {
        var targetMachine = parseInt(req.match[0]);
        if(!targetMachine) return next();

        var req = http.get({
          hostname: config.railsHost,
          port: config.railsPort,
          headers: req.headers,
          path: '/machines/' + targetMachine + '/vnc.json'
        }, function(res) {
          res.setEncoding('utf8');
          res.on('data', function(data) {
            try {
              data = JSON.parse(data);
              if(data.port == -1)
                next();
              req.match = data;
              next();
            } catch(err) {
              next();
            }
          });
        });
        req.on('error', next);
      }
    };
  }, 'websockify -> [host]:[port]' ];


var portImplementation = {
  router: {
    // BELOW FUNCTION SEES ONLY ITS CONTEXT, IT IS SERIALIZED TO THE WORKERS
    '/machines/*/vnc' : routeVnc,
    '/machines/*/vnc.json' : routeVnc,
    '*' : masterConfig.railsPort
  }
};

var ports = {};
ports[masterConfig.port] = portImplementation;

httpMaster.init({
  railsPort: masterConfig.railsPort,
  railsHost: masterConfig.railsHost,
  workerCount: 4,
  ports: ports
}, function(err) {
  if(err) throw err;
  console.log("HTTP started, available at http://localhost:" + masterConfig.port);
});
