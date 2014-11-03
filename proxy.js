var HttpMaster = require('http-master');

var httpMaster = new HttpMaster();

httpMaster.on('logError', function(msg) {
  console.warn(msg);
});
httpMaster.on('logNotice', function(msg) {
//  console.log(msg);
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
        if(!req.upgrade) return next();
        var targetMachine = parseInt(req.match[0]);
        if(!targetMachine) return req.upgrade.socket.end();
        var httpReq = http.get({
          host: config.railsHost,
          hostname: config.railsHost,
          port: config.railsPort,
          headers: req.headers,
          path: '/machines/' + targetMachine + '/vnc.json'
        }, function(res) {
          res.setEncoding('utf8');
          res.once('data', function(data) {
            try {
              data = JSON.parse(data);
              if(!data.port || !data.host || data.port == -1 )
                return req.upgrade.socket.end();
              req.match = data;
              next();
            } catch(err) {
              req.upgrade.socket.end()
            }
          });
        });
        httpReq.once('error', function() {
					req.upgrade.socket.end();
        });
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

var path = require('path');

var config = {
  errorHtmlFile: path.join(__dirname, 'error.html'),
  railsPort: masterConfig.railsPort,
  railsHost: masterConfig.railsHost,
  workerCount: 4,
  ports: ports
};

httpMaster.init(config, function(err) {
  if(err) throw err;
  console.log("HTTP started, available at http://0.0.0.0:" + masterConfig.port);
});
